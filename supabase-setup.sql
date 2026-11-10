-- ==========================================================================
-- Catie's site — Supabase setup
--
-- Run this once:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- It creates the tables, locks them to the two allowed emails, turns on
-- realtime for chat/nudges, and creates the public music/photos buckets.
--
-- Keep the two emails below identical to CQ_ALLOWED_EMAILS in
-- supabase-config.js.
-- ==========================================================================

create extension if not exists pgcrypto;

-- 1. Tables ---------------------------------------------------------------

create table if not exists public.site_content (
  id integer primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) <= 2000),
  sender text not null,
  sender_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'play',
  text text not null default '',
  room text not null default '',
  sender text not null,
  sender_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx
  on public.messages (created_at);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

-- 2. Allowed-email helper -------------------------------------------------

create or replace function public.cq_is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in (
      'liljam175@gmail.com',
      'quintanacatie@gmail.com'
    ),
    false
  );
$$;

revoke all on function public.cq_is_allowed() from public;
grant execute on function public.cq_is_allowed() to anon, authenticated;

-- 3. Row-level security ---------------------------------------------------

alter table public.site_content enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Public visitors can read the site content, so the page works while logged out.
drop policy if exists "site content read" on public.site_content;
create policy "site content read"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists "site content insert" on public.site_content;
create policy "site content insert"
  on public.site_content
  for insert
  to authenticated
  with check (public.cq_is_allowed());

drop policy if exists "site content update" on public.site_content;
create policy "site content update"
  on public.site_content
  for update
  to authenticated
  using (public.cq_is_allowed())
  with check (public.cq_is_allowed());

-- Messages: only the two accounts can read or send.
drop policy if exists "messages read" on public.messages;
create policy "messages read"
  on public.messages
  for select
  to authenticated
  using (public.cq_is_allowed());

drop policy if exists "messages insert" on public.messages;
create policy "messages insert"
  on public.messages
  for insert
  to authenticated
  with check (
    public.cq_is_allowed()
    and lower(sender) = lower(auth.jwt() ->> 'email')
  );

-- Nudges: only the two accounts can read or send.
drop policy if exists "notifications read" on public.notifications;
create policy "notifications read"
  on public.notifications
  for select
  to authenticated
  using (public.cq_is_allowed());

drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert"
  on public.notifications
  for insert
  to authenticated
  with check (
    public.cq_is_allowed()
    and lower(sender) = lower(auth.jwt() ->> 'email')
  );

-- 4. Realtime -------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- 5. Storage buckets ------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'music',
    'music',
    true,
    31457280,
    array[
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/flac'
    ]
  ),
  (
    'photos',
    'photos',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif'
    ]
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public can read the files; only the two emails can upload or delete.
drop policy if exists "cq storage read" on storage.objects;
create policy "cq storage read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('music', 'photos'));

drop policy if exists "cq storage insert" on storage.objects;
create policy "cq storage insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('music', 'photos')
    and public.cq_is_allowed()
  );

drop policy if exists "cq storage update" on storage.objects;
create policy "cq storage update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('music', 'photos')
    and public.cq_is_allowed()
  )
  with check (
    bucket_id in ('music', 'photos')
    and public.cq_is_allowed()
  );

drop policy if exists "cq storage delete" on storage.objects;
create policy "cq storage delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('music', 'photos')
    and public.cq_is_allowed()
  );
