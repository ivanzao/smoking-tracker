import { SupabaseClient } from '@supabase/supabase-js';
import { PushRow, RemoteRow, RemoteStore } from './engine';

const PAGE_SIZE = 1000;
/** Rows committing out of order could land behind the cursor; re-reading them is harmless. */
const CURSOR_OVERLAP_MS = 60_000;

export function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async pull(since) {
      // Keyset paging: with offsets, a row updated mid-pull shifts the others and one gets skipped
      const rows = new Map<string, RemoteRow>();
      let after = since
        ? new Date(Date.parse(since) - CURSOR_OVERLAP_MS).toISOString()
        : null;
      for (;;) {
        let query = client
          .from('records')
          .select('kind, id, data, updated_at, deleted_at, synced_at')
          .order('synced_at')
          .order('kind')
          .order('id')
          .limit(PAGE_SIZE);
        if (after) query = query.gte('synced_at', after);
        const { data, error } = await query;
        if (error) throw error;
        const page = data as RemoteRow[];
        for (const row of page) rows.set(`${row.kind}:${row.id}`, row);
        if (page.length < PAGE_SIZE) return [...rows.values()];
        after = page[page.length - 1].synced_at;
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
