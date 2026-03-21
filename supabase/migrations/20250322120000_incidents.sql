-- LafdaMap Phase 2: incidents + RLS + Realtime
-- Apply in Supabase Dashboard → SQL → New query, or: supabase db push

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type text not null
    check (type in ('street_fight', 'road_rage', 'jcb', 'chaos')),
  title text not null
    check (char_length(title) <= 80),
  description text
    check (description is null or char_length(description) <= 300),
  lat double precision not null,
  lng double precision not null,
  is_live boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.incidents is 'Map pins; anonymous auth users get a real auth.users id.';

create index incidents_created_at_idx on public.incidents (created_at desc);
create index incidents_lat_lng_idx on public.incidents (lat, lng);

alter table public.incidents replica identity full;

alter table public.incidents enable row level security;

-- Anyone with anon or authenticated JWT can read (map is public browse).
create policy "incidents_select_public"
  on public.incidents
  for select
  to anon, authenticated
  using (true);

-- Reports must attach the current user (anonymous users still have auth.uid()).
create policy "incidents_insert_authenticated_self"
  on public.incidents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "incidents_update_own"
  on public.incidents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "incidents_delete_own"
  on public.incidents
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Broadcast row changes to clients (enable in Dashboard → Database → Replication if needed).
alter publication supabase_realtime add table public.incidents;
