-- Clipshare MVP schema (tables only, RLS to be added later)

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create type public.member_role as enum ('producer', 'collaborator');

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'collaborator',
  created_at timestamptz default now(),
  unique (show_id, user_id)
);

create type public.video_status as enum ('uploading','processing','ready','error');

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  title text not null,
  storage_path text not null,
  duration_ms integer,
  width integer,
  height integer,
  status public.video_status not null default 'uploading',
  poster_path text,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  label text not null,
  notes text,
  start_ms integer not null,
  end_ms integer not null,
  public_slug text unique,
  is_public_revoked boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.secure_links (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create type public.job_type as enum ('THUMBNAIL','TRANSCODE','CLIP_EXPORT','BATCH_EXPORT');
create type public.job_status as enum ('queued','running','succeeded','failed');

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  type public.job_type not null,
  status public.job_status not null default 'queued',
  payload_json jsonb not null default '{}',
  error_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);


