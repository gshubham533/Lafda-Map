-- Reporter-only live: inserts go through RPC; direct INSERT revoked from clients.

drop policy if exists "live_sessions_insert_host_self" on public.live_sessions;

revoke insert on public.live_sessions from authenticated;
revoke insert on public.live_sessions from anon;

create or replace function public.start_live_session_for_incident(p_incident_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.incidents i
    where i.id = p_incident_id
      and i.user_id is not null
      and i.user_id = v_uid
  ) then
    raise exception 'Only the incident reporter can start a live session'
      using errcode = '42501';
  end if;

  insert into public.live_sessions (incident_id, host_user_id, is_active)
  values (p_incident_id, v_uid, true)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.start_live_session_for_incident(uuid) is
  'Starts a live session only if auth.uid() is the incident reporter.';

grant execute on function public.start_live_session_for_incident(uuid) to authenticated;
