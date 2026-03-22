-- LafdaMap Phase 5: live WebRTC sessions + viewer count RPC
-- Syncs incidents.is_live via triggers when a session starts/ends.

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  is_active boolean not null default true,
  viewer_count integer not null default 0,
  constraint live_sessions_viewer_count_nonneg check (viewer_count >= 0),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

comment on table public.live_sessions is 'One active P2P live stream per incident; signaling over Realtime broadcast.';

create unique index live_sessions_one_active_per_incident
  on public.live_sessions (incident_id)
  where (is_active = true);

create index live_sessions_host_idx on public.live_sessions (host_user_id);
create index live_sessions_incident_idx on public.live_sessions (incident_id);

-- ---------------------------------------------------------------------------
-- Keep incidents.is_live in sync (bypasses incident owner-only update RLS)
-- ---------------------------------------------------------------------------
create or replace function public._sync_incident_live_on_session_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_active then
    update public.incidents set is_live = true where id = NEW.incident_id;
  end if;
  return NEW;
end;
$$;

create trigger tr_live_sessions_insert_sync_incident
  after insert on public.live_sessions
  for each row
  when (NEW.is_active = true)
  execute procedure public._sync_incident_live_on_session_insert();

create or replace function public._sync_incident_live_on_session_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.is_active = true and NEW.is_active = false then
    update public.incidents set is_live = false where id = NEW.incident_id;
  end if;
  return NEW;
end;
$$;

create trigger tr_live_sessions_update_sync_incident
  after update on public.live_sessions
  for each row
  execute procedure public._sync_incident_live_on_session_update();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.live_sessions enable row level security;

create policy "live_sessions_select_public"
  on public.live_sessions
  for select
  to anon, authenticated
  using (true);

create policy "live_sessions_insert_host_self"
  on public.live_sessions
  for insert
  to authenticated
  with check (auth.uid() = host_user_id);

create policy "live_sessions_update_host_own"
  on public.live_sessions
  for update
  to authenticated
  using (auth.uid() = host_user_id)
  with check (auth.uid() = host_user_id);

-- ---------------------------------------------------------------------------
-- Viewer count (approximate; clients call on join/leave)
-- ---------------------------------------------------------------------------
create or replace function public.live_session_viewer_delta(p_session_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta is null or p_delta = 0 then
    return;
  end if;
  update public.live_sessions
  set viewer_count = greatest(0, viewer_count + p_delta)
  where id = p_session_id and is_active = true;
end;
$$;

grant execute on function public.live_session_viewer_delta(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter table public.live_sessions replica identity full;

alter publication supabase_realtime add table public.live_sessions;
