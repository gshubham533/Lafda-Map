-- Persisted live chat + peak viewer snapshot when a session ends.

alter table public.live_sessions
  add column if not exists peak_viewers integer not null default 0;

comment on column public.live_sessions.peak_viewers is 'Max concurrent viewers while session was active (set when session ends).';

create or replace function public._live_session_capture_peak()
returns trigger
language plpgsql
as $$
begin
  if OLD.is_active = true and NEW.is_active = false then
    NEW.peak_viewers := greatest(
      coalesce(OLD.peak_viewers, 0),
      coalesce(OLD.viewer_count, 0)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_live_sessions_capture_peak on public.live_sessions;

create trigger tr_live_sessions_capture_peak
  before update on public.live_sessions
  for each row
  execute procedure public._live_session_capture_peak();

-- ---------------------------------------------------------------------------
-- Chat log (public read; insert only during active session, own user row)
-- ---------------------------------------------------------------------------
create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  handle text not null,
  body text not null
    check (char_length(body) >= 1 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index live_chat_messages_session_idx
  on public.live_chat_messages (session_id, created_at);

create index live_chat_messages_incident_idx
  on public.live_chat_messages (incident_id, created_at desc);

alter table public.live_chat_messages enable row level security;

create policy "live_chat_messages_select_public"
  on public.live_chat_messages
  for select
  to anon, authenticated
  using (true);

create policy "live_chat_messages_insert_during_live"
  on public.live_chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.live_sessions ls
      where ls.id = session_id
        and ls.is_active = true
    )
  );

alter table public.live_chat_messages replica identity full;

alter publication supabase_realtime add table public.live_chat_messages;
