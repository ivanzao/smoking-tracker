-- One row per synced record. See docs/superpowers/specs/2026-11-05-supabase-sync-iphone-design.md

create table public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('event', 'goal', 'note', 'streak-reset')),
  id text not null,
  data jsonb not null,
  -- When the record was edited, set by the device. Decides conflicts.
  updated_at timestamptz not null,
  deleted_at timestamptz,
  -- When the server received the row. It is the pull cursor, so the client can't set it.
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);

create index records_user_synced_idx on public.records (user_id, synced_at);

create function public.records_set_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

create trigger records_set_synced_at
before insert or update on public.records
for each row execute function public.records_set_synced_at();

alter table public.records enable row level security;

-- No delete policy on purpose: records are soft-deleted so other devices learn about it.
create policy "records_select_own" on public.records
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "records_insert_own" on public.records
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "records_update_own" on public.records
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.records from anon, authenticated;
grant select, insert, update on public.records to authenticated;
