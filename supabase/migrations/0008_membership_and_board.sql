-- 0008 — Membership (teachers + school representatives) and the Staffroom
-- Board: a community jobs board (signed-in members post, public reads).
--
-- Anti-bot posture (DB side): posts are tied to real auth users, RLS forces
-- author_id = auth.uid(), and per-user posting is rate-limited server-side.
-- The API layer adds honeypot + dwell-time token checks before any insert.

-- ===========================================================================
-- PROFILES: membership kind + optional school affiliation
-- ===========================================================================
alter table profiles
  add column if not exists profile_kind text not null default 'teacher'
    check (profile_kind in ('teacher', 'school_staff', 'recruiter')),
  add column if not exists school_id uuid references schools (id) on delete set null,
  add column if not exists bio text,
  add column if not exists public_profile boolean not null default false;
create index if not exists profiles_school_idx on profiles (school_id);

-- Public directory read: only rows the owner opted into, only safe columns
-- should be selected by clients (enforced at the API layer).
drop policy if exists "profile public read" on profiles;
create policy "profile public read" on profiles
  for select using (public_profile = true);

-- ===========================================================================
-- SCHOOL MEMBERS: a user representing a school (verified by moderators)
-- ===========================================================================
create table if not exists school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  member_role text not null default 'rep' check (member_role in ('rep', 'admin')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);
create index if not exists school_members_school_idx on school_members (school_id);
create index if not exists school_members_user_idx on school_members (user_id);

alter table school_members enable row level security;

create policy "members self read" on school_members
  for select using (
    user_id = auth.uid()
    or verified = true
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );
create policy "members self insert" on school_members
  for insert with check (user_id = auth.uid() and verified = false);
create policy "members self delete" on school_members
  for delete using (user_id = auth.uid());
create policy "members mod write" on school_members
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

-- ===========================================================================
-- BOARD POSTS: the community jobs board
-- ===========================================================================
create table if not exists board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  school_id uuid references schools (id) on delete set null,
  school_name text not null,
  title text not null check (char_length(title) between 8 and 140),
  body text not null check (char_length(body) between 40 and 8000),
  country text not null,
  city text,
  role_type text not null default 'Teacher',
  salary_min_usd numeric,
  salary_max_usd numeric,
  currency text not null default 'USD',
  apply_url text,
  contact_email text,
  status text not null default 'active'
    check (status in ('active', 'expired', 'removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);
create index if not exists board_active_idx  on board_posts (status, created_at desc);
create index if not exists board_country_idx on board_posts (country);
create index if not exists board_school_idx  on board_posts (school_id);
create index if not exists board_author_idx  on board_posts (author_id);

alter table board_posts enable row level security;

create policy "board public read" on board_posts
  for select using (
    (status = 'active' and expires_at > now())
    or author_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );
create policy "board self insert" on board_posts
  for insert with check (author_id = auth.uid() and status = 'active');
create policy "board self update" on board_posts
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid() and status in ('active', 'expired'));
create policy "board mod write" on board_posts
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

-- ===========================================================================
-- BOARD FLAGS: community reporting feeds moderation
-- ===========================================================================
create table if not exists board_post_flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references board_posts (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index if not exists board_flags_post_idx on board_post_flags (post_id);
create index if not exists board_flags_reporter_idx on board_post_flags (reporter_id);

alter table board_post_flags enable row level security;

create policy "flags self insert" on board_post_flags
  for insert with check (reporter_id = auth.uid());
create policy "flags mod read" on board_post_flags
  for select using (
    reporter_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

-- Expire stale posts opportunistically (called by the worker cron).
create or replace function expire_board_posts()
returns integer
language sql
security definer
set search_path = public
as $$
  with updated as (
    update board_posts
       set status = 'expired'
     where status = 'active' and expires_at <= now()
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function expire_board_posts() from public;
grant execute on function expire_board_posts() to service_role;
