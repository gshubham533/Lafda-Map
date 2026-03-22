-- Phase 4: Supabase Storage bucket + incident_media for images/videos/recordings
-- Apply via supabase db push or Dashboard SQL.

insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', true)
on conflict (id) do update set public = excluded.public;

-- Path convention: {auth.uid()}/{incident_id}/{filename}
create policy "incident_media_objects_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'incident-media');

create policy "incident_media_objects_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'incident-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "incident_media_objects_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'incident-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table public.incident_media (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  kind text not null
    check (kind in ('image', 'video', 'recording')),
  created_at timestamptz not null default now()
);

comment on table public.incident_media is 'References files in storage bucket incident-media; public read via RLS.';

create unique index incident_media_storage_path_uidx
  on public.incident_media (storage_path);

create index incident_media_incident_created_idx
  on public.incident_media (incident_id, created_at desc);

alter table public.incident_media enable row level security;

create policy "incident_media_select_public"
  on public.incident_media
  for select
  to anon, authenticated
  using (true);

create policy "incident_media_insert_reporter"
  on public.incident_media
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.incidents i
      where i.id = incident_id
        and i.user_id = auth.uid()
    )
  );

create policy "incident_media_delete_own"
  on public.incident_media
  for delete
  to authenticated
  using (auth.uid() = user_id);
