-- Run this once in Supabase: Dashboard > SQL Editor > New query.
-- The app accesses this table only with the server-side service-role key.

create table if not exists public.documents (
  id uuid primary key,
  name text not null,
  size integer not null check (size > 0),
  status text not null check (status in ('ready', 'processing', 'failed')),
  created_at timestamptz not null,
  file_search_store_name text not null unique
);

alter table public.documents enable row level security;

-- Do not create browser-access policies. The service-role secret bypasses RLS
-- from server route handlers only, while public/anonymous API access remains blocked.
revoke all on table public.documents from anon, authenticated;
