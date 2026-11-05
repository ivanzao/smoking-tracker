import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when the build has no Supabase config: the app then runs local-only. */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { auth: { detectSessionInUrl: false } })
    : null;
