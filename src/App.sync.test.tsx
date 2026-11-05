import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { PushRow, RemoteRow } from '@/lib/sync/engine';

const fake = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  listener: null as null | ((event: string, session: unknown) => void),
  rows: [] as unknown[],
  pushed: [] as unknown[],
  pullFails: false,
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: fake.session } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        fake.listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithOtp: fake.signInWithOtp,
      verifyOtp: fake.verifyOtp,
      signOut: fake.signOut,
    },
  },
}));

vi.mock('@/lib/sync/supabaseRemote', () => ({
  createSupabaseRemote: () => ({
    pull: async (): Promise<RemoteRow[]> => {
      if (fake.pullFails) throw new Error('offline');
      return fake.rows as RemoteRow[];
    },
    push: async (rows: PushRow[]) => {
      fake.pushed.push(...rows);
    },
  }),
}));

const SESSION = { user: { id: 'u1', email: 'eu@gmail.com' } };
const STORAGE_KEY = 'smoking-tracker';
const ACCOUNT_KEY = 'smoking-tracker-account';

beforeEach(() => {
  fake.session = null;
  fake.listener = null;
  fake.rows = [];
  fake.pushed = [];
  fake.pullFails = false;
  fake.signInWithOtp.mockReset().mockResolvedValue({ error: null });
  fake.verifyOtp.mockReset().mockImplementation(async () => {
    fake.session = SESSION;
    fake.listener?.('SIGNED_IN', SESSION);
    return { data: { session: SESSION }, error: null };
  });
  fake.signOut.mockReset().mockResolvedValue({ error: null });
});

describe('login', () => {
  it('asks for login on a device that never signed in, then opens the app', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/e-mail/i), {
      target: { value: 'eu@gmail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

    fireEvent.change(await screen.findByLabelText(/código/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect((await screen.findAllByText(/quick log/i)).length).toBeGreaterThan(0);
    expect(fake.signInWithOtp).toHaveBeenCalledWith({ email: 'eu@gmail.com' });
    expect(fake.verifyOtp).toHaveBeenCalledWith({
      email: 'eu@gmail.com',
      token: '123456',
      type: 'email',
    });
  });

  it('shows an error and stays on the code step when the code is wrong', async () => {
    fake.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'bad' } });
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/e-mail/i), {
      target: { value: 'eu@gmail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));
    fireEvent.change(await screen.findByLabelText(/código/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/código inválido/i);
    expect(screen.getByLabelText(/código/i)).toBeInTheDocument();
  });
});

describe('expired session', () => {
  beforeEach(() => {
    localStorage.setItem(ACCOUNT_KEY, 'eu@gmail.com');
  });

  it('warns but keeps the app usable, then syncs what was recorded after login', async () => {
    const pending = { id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [pending] }));
    render(<App />);

    expect((await screen.findAllByText(/sem login/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quick log/i).length).toBeGreaterThan(0);
    expect(fake.pushed).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /entrar de novo/i }));
    fireEvent.click(await screen.findByRole('button', { name: /enviar código/i }));
    fireEvent.change(await screen.findByLabelText(/código/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => expect(fake.pushed).toHaveLength(1));
    expect(screen.queryAllByText(/sem login/i)).toEqual([]);
  });

  it('warns when the session drops while the app is open', async () => {
    fake.session = SESSION;
    render(<App />);
    await waitFor(() => expect(fake.listener).not.toBeNull());
    expect(screen.queryAllByText(/sem login/i)).toEqual([]);

    fake.session = null;
    fake.listener?.('SIGNED_OUT', null);

    expect((await screen.findAllByText(/sem login/i)).length).toBeGreaterThan(0);
  });
});

describe('signed in', () => {
  beforeEach(() => {
    localStorage.setItem(ACCOUNT_KEY, 'eu@gmail.com');
    fake.session = SESSION;
  });

  it('shows records from the server without sending them back', async () => {
    fake.rows = [
      {
        kind: 'event',
        id: 'remote',
        data: { id: 'remote', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
        updated_at: '2026-04-08T15:00:00.000Z',
        deleted_at: null,
        synced_at: '2026-04-08T15:00:01.000Z',
      },
    ];
    render(<App />);

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).events).toHaveLength(1),
    );
    await waitFor(() => expect(fake.pushed).toEqual([]));
  });

  it('sends a new record shortly after it is logged', async () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /tabaco/i })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /salvar|registrar|adicionar/i }));

    await waitFor(() => expect(fake.pushed).toHaveLength(1), { timeout: 3000 });
    expect(fake.pushed[0]).toMatchObject({ kind: 'event', deleted_at: null });
  });

  it('keeps working when the server is unreachable', async () => {
    fake.pullFails = true;
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /goals/i })[0]);

    expect((await screen.findAllByText(/não foi possível sincronizar/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/meta diária/i).length).toBeGreaterThan(0);
  });
});

describe('signing out', () => {
  beforeEach(() => {
    localStorage.setItem(ACCOUNT_KEY, 'eu@gmail.com');
    fake.session = SESSION;
  });

  const openAccount = async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /goals/i })[0]);
    return (await screen.findAllByRole('button', { name: /sair da conta/i }))[0];
  };

  it('erases local data', async () => {
    const button = await openAccount();
    await waitFor(() => expect(screen.getAllByText(/tudo sincronizado/i).length).toBeGreaterThan(0));

    fireEvent.click(button);

    await waitFor(() => expect(fake.signOut).toHaveBeenCalled());
    await waitFor(() => expect(localStorage.getItem(ACCOUNT_KEY)).toBeNull());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('asks first when something was not sent, and stays if declined', async () => {
    fake.pullFails = true;
    const event = { id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [event] }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const button = await openAccount();
    await screen.findAllByText(/não foi possível sincronizar/i);

    fireEvent.click(button);

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/1 registro/));
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    confirm.mockRestore();
  });
});
