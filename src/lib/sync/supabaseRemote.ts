import { SupabaseClient } from '@supabase/supabase-js';
import { PushRow, RemoteRow, RemoteStore } from './engine';

const PAGE_SIZE = 1000;
/** Rows committing out of order could land behind the cursor; re-reading them is harmless. */
const CURSOR_OVERLAP_MS = 60_000;

export function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async pull(since) {
      const rows: RemoteRow[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        let query = client
          .from('records')
          .select('kind, id, data, updated_at, deleted_at, synced_at')
          .order('synced_at')
          .order('kind')
          .order('id')
          .range(from, from + PAGE_SIZE - 1);
        if (since) {
          const after = new Date(Date.parse(since) - CURSOR_OVERLAP_MS).toISOString();
          query = query.gt('synced_at', after);
        }
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data as RemoteRow[]));
        if (data.length < PAGE_SIZE) return rows;
      }
    },

    async push(rows: PushRow[]) {
      const { error } = await client
        .from('records')
        .upsert(rows.map((row) => ({ ...row, user_id: userId })));
      if (error) throw error;
    },
  };
}
