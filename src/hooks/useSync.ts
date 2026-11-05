import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  LEDGER_KEY,
  SyncChanges,
  SyncState,
  adoptState,
  applyChanges,
  createLedgerStorage,
  pendingCount,
  runSync,
  trackChanges,
} from '@/lib/sync/engine';
import { createSupabaseRemote } from '@/lib/sync/supabaseRemote';
import { STORAGE_KEY, UseTrackerAPI } from '@/hooks/useTracker';

/** Remembers that this device has signed in, which tells an expired session from a new device. */
const ACCOUNT_KEY = 'smoking-tracker-account';
const SYNC_DELAY_MS = 1500;

export type AuthStatus =
  /** No Supabase config: local-only, no login */
  | 'disabled'
  /** Waiting for the stored session on a device with no account yet */
  | 'loading'
  | 'needs-login'
  | 'expired'
  | 'signed-in';

export interface UseSyncAPI {
  status: AuthStatus;
  /** E-mail of the account on this device, if any. */
  email: string | null;
  /** Records not yet on the server. */
  pending: number;
  syncing: boolean;
  /** The last sync attempt failed; it is retried on the next trigger. */
  failed: boolean;
  /** Resolves to false when the e-mail couldn't be sent. */
  sendCode(email: string): Promise<boolean>;
  /** Resolves to false when the code is wrong or expired. */
  verifyCode(email: string, code: string): Promise<boolean>;
  /** Erases this device's local data and reloads. */
  signOut(): Promise<void>;
}

const nowIso = () => new Date().toISOString();

export function useSync(tracker: UseTrackerAPI): UseSyncAPI {
  const { syncState, applySyncChanges } = tracker;
  const ledger = useMemo(createLedgerStorage, []);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem(ACCOUNT_KEY));
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [failed, setFailed] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Always the newest state, ahead of React: a sync started right after applying
  // remote changes must not see the old state, or it would read them as local reverts
  const stateRef = useRef<SyncState>(syncState);

  const adopted = useRef(false);
  const running = useRef(false);
  const runAgain = useRef(false);

  const sync = useCallback(async () => {
    const userId = sessionRef.current?.user.id;
    if (!supabase || !userId) return;
    if (running.current) {
      runAgain.current = true;
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      await runSync({
        remote: createSupabaseRemote(supabase, userId),
        ledger,
        getState: () => stateRef.current,
        applyChanges: (changes: SyncChanges) => {
          stateRef.current = applyChanges(stateRef.current, changes);
          applySyncChanges(changes);
        },
        now: nowIso,
      });
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      running.current = false;
      setSyncing(false);
      setPending(pendingCount(ledger));
      if (runAgain.current) {
        runAgain.current = false;
        void sync();
      }
    }
  }, [ledger, applySyncChanges]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const signedInEmail = session?.user.email;
    if (!signedInEmail) return;
    localStorage.setItem(ACCOUNT_KEY, signedInEmail);
    setEmail(signedInEmail);
    void sync();
  }, [session, sync]);

  // Runs on every state change so an offline edit keeps the time it really happened
  useEffect(() => {
    if (!supabase) return;
    stateRef.current = syncState;
    if (!adopted.current) {
      adopted.current = true;
      adoptState(ledger, syncState);
    }
    trackChanges(ledger, syncState, nowIso());
    const count = pendingCount(ledger);
    setPending(count);
    if (count === 0) return;
    const timer = setTimeout(() => void sync(), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [syncState, ledger, sync]);

  useEffect(() => {
    if (!supabase) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const onOnline = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [sync]);

  const sendCode = useCallback<UseSyncAPI['sendCode']>(async (address) => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithOtp({ email: address });
    return !error;
  }, []);

  const verifyCode = useCallback<UseSyncAPI['verifyCode']>(async (address, code) => {
    if (!supabase) return false;
    const { error } = await supabase.auth.verifyOtp({
      email: address,
      token: code,
      type: 'email',
    });
    return !error;
  }, []);

  const signOut = useCallback<UseSyncAPI['signOut']>(async () => {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEDGER_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    window.location.reload();
  }, []);

  let status: AuthStatus;
  if (!supabase) status = 'disabled';
  else if (session) status = 'signed-in';
  else if (email) status = 'expired';
  else status = sessionChecked ? 'needs-login' : 'loading';

  return { status, email, pending, syncing, failed, sendCode, verifyCode, signOut };
}
