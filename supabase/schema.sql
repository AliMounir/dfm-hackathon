-- Hazava AI / DFM M&E Assistant Supabase setup
-- Run this in the Supabase SQL editor once per project.
-- The app uploads through a server route using SUPABASE_SERVICE_ROLE_KEY, so
-- the storage bucket stays private while we skip end-user auth for the prototype.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dfm-data-uploads',
  'dfm-data-uploads',
  false,
  52428800,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.projects (
  id text primary key,
  name text not null,
  slug text not null unique,
  folder_path text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  status text not null default 'received',
  source text not null default 'web-upload',
  file_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.upload_batches(id) on delete set null,
  project_id text not null references public.projects(id) on delete cascade,
  original_filename text not null,
  storage_bucket text not null default 'dfm-data-uploads',
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  kind text not null default 'unknown',
  size_bytes bigint not null default 0,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.upload_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  step_key text not null,
  status text not null default 'waiting',
  sort_order integer not null,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, step_key)
);

create index if not exists project_files_project_id_idx
on public.project_files(project_id);

create index if not exists upload_batches_project_id_idx
on public.upload_batches(project_id);

create index if not exists upload_workflow_steps_batch_id_idx
on public.upload_workflow_steps(batch_id);

insert into public.projects (id, name, slug, folder_path, description)
values
  (
    'soameva',
    'SOAMEVA',
    'soameva',
    'data/projects/soameva',
    'DFM project workspace seeded from the prototype project list.'
  ),
  (
    'miray-tb-parsite',
    'MIRAY TB PARSITE',
    'miray-tb-parsite',
    'data/projects/miray-tb-parsite',
    'DFM project workspace seeded from the prototype project list.'
  ),
  (
    'miray-tb-general',
    'MIRAY TB GENERAL',
    'miray-tb-general',
    'data/projects/miray-tb-general',
    'DFM project workspace seeded from the prototype project list.'
  ),
  (
    'mchp',
    'MCHP',
    'mchp',
    'data/projects/mchp',
    'Maternal care and ultrasound project workspace.'
  ),
  (
    'mafy',
    'MAFY',
    'mafy',
    'data/projects/mafy',
    'DFM project workspace seeded from the prototype project list.'
  ),
  (
    'tia-longo',
    'TIA LONGO',
    'tia-longo',
    'data/projects/tia-longo',
    'DFM project workspace seeded from the prototype project list.'
  ),
  (
    'profess',
    'PROFESS',
    'profess',
    'data/projects/profess',
    'DFM project workspace seeded from the prototype project list.'
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  folder_path = excluded.folder_path,
  description = excluded.description,
  updated_at = now();

-- Keep RLS disabled for the no-auth prototype. Access is through server-side
-- API routes using the service-role key. When auth is added, enable RLS and add
-- policies for authenticated project members.
alter table public.projects disable row level security;
alter table public.upload_batches disable row level security;
alter table public.project_files disable row level security;
alter table public.upload_workflow_steps disable row level security;
