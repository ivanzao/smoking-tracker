import { describe, it, expect } from 'vitest';
import {
  Ledger,
  LedgerStore,
  PushRow,
  RemoteRow,
  RemoteStore,
  SyncChanges,
  SyncState,
  adoptState,
  applyChanges,
  pendingCount,
  runSync,
  trackChanges,
} from './engine';
import { GoalEntry, TrackerEvent } from '@/types';

function createLedgerMemory(): LedgerStore {
  let ledger: Ledger = { cursor: null, entries: {} };
  return {
    load: () => ledger,
    save: (next) => {
      ledger = next;
    },
  };
}

const EMPTY: SyncState = { events: [], goals: [], days: [], streakResetDay: null };

/** jsonb keeps no key order: return objects with keys reversed so order-sensitive code fails. */
function asJsonb<T>(value: T): T {
  if (Array.isArray(value)) return value.map(asJsonb) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).reverse()) {
      out[key] = asJsonb((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

class FakeRemote implements RemoteStore {
  rows = new Map<string, RemoteRow>();
  private tick = 0;
  beforePushHook: (() => void) | null = null;

  private stamp() {
    this.tick += 1;
    return new Date(Date.UTC(2030, 0, 1, 0, 0, this.tick)).toISOString();
  }

  async pull(since: string | null) {
    return [...this.rows.values()]
      .filter((r) => since === null || r.synced_at > since)
      .sort((a, b) => (a.synced_at < b.synced_at ? -1 : 1));
  }

  async push(rows: PushRow[]) {
    const hook = this.beforePushHook;
    this.beforePushHook = null;
    hook?.();
    for (const row of rows) {
      this.rows.set(`${row.kind}:${row.id}`, {
        ...JSON.parse(JSON.stringify(row)),
        data: asJsonb(JSON.parse(JSON.stringify(row.data))),
        synced_at: this.stamp(),
      });
    }
  }

  /** A row written by something other than this app's code. */
  inject(row: Omit<RemoteRow, 'synced_at'>) {
    this.rows.set(`${row.kind}:${row.id}`, { ...row, synced_at: this.stamp() });
  }
}

function createDevice(
  remote: RemoteStore,
  initial: Partial<SyncState> = {},
  firstOpenedAt = '2026-11-05T12:00:00.000Z',
) {
  let state: SyncState = { ...EMPTY, ...initial };
  const ledger = createLedgerMemory();
  let clock = firstOpenedAt;

  const track = () => trackChanges(ledger, state, clock);
  adoptState(ledger, state);
  track();

  return {
    ledger,
    get state() {
      return state;
    },
    /** Close and reopen the app with whatever state survived on disk. */
    reopen(surviving: SyncState, at = '2026-11-05T19:00:00.000Z') {
      clock = at;
      state = surviving;
      adoptState(ledger, state);
      track();
    },
    /** Change local state at a given moment, the way useSync reports each state change. */
    edit(at: string, change: (s: SyncState) => SyncState) {
      clock = at;
      state = change(state);
      track();
    },
    sync(at = clock) {
      clock = at;
      return runSync({
        remote,
        ledger,
        getState: () => state,
        applyChanges: (changes: SyncChanges) => {
          state = applyChanges(state, changes);
          track();
        },
        now: () => clock,
      });
    },
  };
}

const event = (id: string, extra: Partial<TrackerEvent> = {}): TrackerEvent => ({
  id,
  timestamp: '2026-11-05T09:00:00-03:00',
  type: 'tobacco',
  ...extra,
});

describe('sync between devices', () => {
  it('uploads local history on first login and delivers it to an empty device', async () => {
    const remote = new FakeRemote();
    const goal: GoalEntry = { id: 'g1', limit: 8, effectiveFrom: '2026-11-01' };
    const pc = createDevice(remote, {
      events: [event('e1', { location: 'casa' })],
      goals: [goal],
      days: [
        {
          dayKey: '2026-11-05',
          notes: [{ id: 'n1', text: 'dia ruim', createdAt: '2026-11-05T10:00:00-03:00' }],
        },
      ],
      streakResetDay: '2026-11-02',
    });
    const iphone = createDevice(remote);

    await pc.sync();
    await iphone.sync();

    expect(iphone.state).toEqual(pc.state);
    expect(pendingCount(pc.ledger)).toBe(0);
  });

  it('does not treat records coming back from the database as local edits', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1', { location: 'casa', reason: 'café' })] });
    const iphone = createDevice(remote);

    await pc.sync();
    await iphone.sync();
    await pc.sync();

    expect(pendingCount(iphone.ledger)).toBe(0);
    expect(pendingCount(pc.ledger)).toBe(0);
  });

  it('keeps the most recent edit when both devices changed the same record', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    // iPhone edits later but is offline; the PC syncs first
    pc.edit('2026-11-05T13:00:00.000Z', (s) => ({
      ...s,
      events: [event('e1', { location: 'pc' })],
    }));
    iphone.edit('2026-11-05T14:00:00.000Z', (s) => ({
      ...s,
      events: [event('e1', { location: 'iphone' })],
    }));
    await pc.sync('2026-11-05T15:00:00.000Z');
    await iphone.sync('2026-11-05T16:00:00.000Z');
    await pc.sync('2026-11-05T17:00:00.000Z');

    expect(pc.state.events[0].location).toBe('iphone');
    expect(iphone.state.events[0].location).toBe('iphone');
  });

  it('dates an offline edit by when it happened, not by when it synced', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    // The iPhone's edit is older and only reaches the server after the PC's
    iphone.edit('2026-11-05T13:00:00.000Z', (s) => ({
      ...s,
      events: [event('e1', { location: 'iphone' })],
    }));
    pc.edit('2026-11-05T14:00:00.000Z', (s) => ({
      ...s,
      events: [event('e1', { location: 'pc' })],
    }));
    await pc.sync('2026-11-05T15:00:00.000Z');
    await iphone.sync('2026-11-05T20:00:00.000Z');
    await pc.sync('2026-11-05T21:00:00.000Z');

    expect(iphone.state.events[0].location).toBe('pc');
    expect(pc.state.events[0].location).toBe('pc');
  });

  it('does not bring back a record deleted on another device', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1'), event('e2')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    pc.edit('2026-11-05T13:00:00.000Z', (s) => ({
      ...s,
      events: s.events.filter((e) => e.id !== 'e1'),
    }));
    await pc.sync();
    await iphone.sync();
    await pc.sync();

    expect(iphone.state.events.map((e) => e.id)).toEqual(['e2']);
    expect(pc.state.events.map((e) => e.id)).toEqual(['e2']);
    expect(remote.rows.get('event:e1')?.deleted_at).not.toBeNull();
  });

  it('restores a record when a delete is undone after it synced', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    pc.edit('2026-11-05T13:00:00.000Z', (s) => ({ ...s, events: [] }));
    await pc.sync();
    pc.edit('2026-11-05T13:00:05.000Z', (s) => ({ ...s, events: [event('e1')] }));
    await pc.sync();
    await iphone.sync();

    expect(iphone.state.events.map((e) => e.id)).toEqual(['e1']);
    expect(remote.rows.get('event:e1')?.deleted_at).toBeNull();
  });

  it('keeps an edit made while a sync is in flight pending for the next one', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);

    remote.beforePushHook = () =>
      pc.edit('2026-11-05T13:00:00.000Z', (s) => ({
        ...s,
        events: [event('e1', { location: 'durante' })],
      }));
    await pc.sync();
    expect(pendingCount(pc.ledger)).toBe(1);

    await pc.sync();
    await iphone.sync();

    expect(iphone.state.events[0].location).toBe('durante');
    expect(pendingCount(pc.ledger)).toBe(0);
  });

  it('keeps a delete made while a sync is in flight pending for the next one', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);

    remote.beforePushHook = () =>
      pc.edit('2026-11-05T13:00:00.000Z', (s) => ({ ...s, events: [] }));
    await pc.sync();
    await pc.sync();
    await iphone.sync();

    expect(remote.rows.get('event:e1')?.deleted_at).not.toBeNull();
    expect(iphone.state.events).toEqual([]);
  });

  it('keeps everything pending when the network fails, and recovers on the next sync', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    remote.beforePushHook = () => {
      throw new Error('network down');
    };

    await expect(pc.sync()).rejects.toThrow('network down');
    expect(pendingCount(pc.ledger)).toBe(1);

    await pc.sync();
    expect(pendingCount(pc.ledger)).toBe(0);
    expect(remote.rows.has('event:e1')).toBe(true);
  });

  it('ignores malformed rows without losing the valid ones', async () => {
    const remote = new FakeRemote();
    remote.inject({
      kind: 'event',
      id: 'bad',
      data: { nope: true },
      updated_at: '2026-11-05T12:00:00.000Z',
      deleted_at: null,
    });
    remote.inject({
      kind: 'event',
      id: 'good',
      data: event('good'),
      updated_at: '2026-11-05T12:00:00.000Z',
      deleted_at: null,
    });
    const iphone = createDevice(remote);

    await iphone.sync();

    expect(iphone.state.events.map((e) => e.id)).toEqual(['good']);
    expect(pendingCount(iphone.ledger)).toBe(0);
  });

  it('moves a note to its new day and drops the empty one', async () => {
    const remote = new FakeRemote();
    const note = { id: 'n1', text: 'a', createdAt: '2026-11-05T10:00:00-03:00' };
    const pc = createDevice(remote, { days: [{ dayKey: '2026-11-05', notes: [note] }] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    pc.edit('2026-11-05T13:00:00.000Z', (s) => ({
      ...s,
      days: [{ dayKey: '2026-11-04', notes: [{ ...note, text: 'b' }] }],
    }));
    await pc.sync();
    await iphone.sync();

    expect(iphone.state.days).toEqual([
      { dayKey: '2026-11-04', notes: [{ ...note, text: 'b' }] },
    ]);
  });

  it('sends large histories in batches', async () => {
    const remote = new FakeRemote();
    const sizes: number[] = [];
    const originalPush = remote.push.bind(remote);
    remote.push = async (rows) => {
      sizes.push(rows.length);
      await originalPush(rows);
    };
    const events = Array.from({ length: 1200 }, (_, i) => event(`e${i}`));
    const pc = createDevice(remote, { events });

    await pc.sync();

    expect(sizes).toEqual([500, 500, 200]);
    expect(remote.rows.size).toBe(1200);
    expect(pendingCount(pc.ledger)).toBe(0);
  });

  it('does not let an old local copy overwrite newer data on first login', async () => {
    const remote = new FakeRemote();
    const oldCopy = [event('e1'), event('e2')];
    const pc = createDevice(remote, { events: oldCopy });
    await pc.sync();
    pc.edit('2026-11-05T13:00:00.000Z', () => ({
      ...EMPTY,
      events: [event('e1', { location: 'novo' })],
    }));
    await pc.sync();

    const iphone = createDevice(remote, { events: oldCopy }, '2026-11-05T20:00:00.000Z');
    await iphone.sync();
    await pc.sync('2026-11-05T21:00:00.000Z');

    expect(iphone.state.events).toEqual([event('e1', { location: 'novo' })]);
    expect(pc.state.events).toEqual([event('e1', { location: 'novo' })]);
  });

  it('still uploads local records the server has never seen on a later first login', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    await pc.sync();

    const iphone = createDevice(remote, { events: [event('only-here')] });
    await iphone.sync();
    await pc.sync();

    expect(pc.state.events.map((e) => e.id).sort()).toEqual(['e1', 'only-here']);
    expect(iphone.state.events.map((e) => e.id).sort()).toEqual(['e1', 'only-here']);
  });

  it('restores from the server, without deleting anything, when local data was lost', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1'), event('e2')] });
    await pc.sync();
    await pc.sync();

    pc.reopen(EMPTY);
    await pc.sync();

    expect(pc.state.events.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(remote.rows.get('event:e1')?.deleted_at).toBeNull();
    expect(remote.rows.get('event:e2')?.deleted_at).toBeNull();
  });

  it('recovers when the app dies after recording a remote change but before saving it', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();
    const beforeTheChange = iphone.state;

    pc.edit('2026-11-05T13:00:00.000Z', (s) => ({
      ...s,
      events: [event('e1', { location: 'novo' })],
    }));
    await pc.sync();
    await iphone.sync();

    iphone.reopen(beforeTheChange);
    await iphone.sync('2026-11-05T20:00:00.000Z');
    await pc.sync('2026-11-05T21:00:00.000Z');

    expect(iphone.state.events[0].location).toBe('novo');
    expect(pc.state.events[0].location).toBe('novo');
  });

  it('keeps a pending offline edit and delete across a restart', async () => {
    const remote = new FakeRemote();
    const pc = createDevice(remote, { events: [event('e1'), event('e2')] });
    const iphone = createDevice(remote);
    await pc.sync();
    await iphone.sync();

    iphone.edit('2026-11-05T13:00:00.000Z', () => ({
      ...EMPTY,
      events: [event('e1', { location: 'offline' })],
    }));
    iphone.reopen(iphone.state);
    await iphone.sync();
    await pc.sync();

    expect(pc.state.events).toEqual([event('e1', { location: 'offline' })]);
  });

  it('ignores an event whose timestamp would crash date formatting', async () => {
    const remote = new FakeRemote();
    remote.inject({
      kind: 'event',
      id: 'bad',
      data: event('bad', { timestamp: 'ontem' }),
      updated_at: '2026-11-05T12:00:00.000Z',
      deleted_at: null,
    });
    const iphone = createDevice(remote);

    await iphone.sync();

    expect(iphone.state.events).toEqual([]);
  });
});
