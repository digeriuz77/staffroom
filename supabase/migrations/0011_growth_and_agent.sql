-- Demand-aware growth and low-cost AI briefs.

alter type job_type add value if not exists 'brief';

-- RLS cannot hide individual columns. Keep full profiles owner-only; public
-- leaderboards are assembled server-side from explicitly safe columns.
drop policy if exists "profile public read" on profiles;

alter table reddit_posts
  add column if not exists embedding_provider text,
  add column if not exists embedding_model text;

create or replace function set_post_embedding_v2(
  p_id text,
  p_vec double precision[],
  p_provider text,
  p_model text
)
returns void
language sql
security definer
set search_path = public
as $$
  update reddit_posts
     set embedding = p_vec::vector,
         embedding_provider = p_provider,
         embedding_model = p_model
   where id = p_id;
$$;

revoke execute on function set_post_embedding_v2(text, double precision[], text, text)
  from public, anon, authenticated;
grant execute on function set_post_embedding_v2(text, double precision[], text, text)
  to service_role;

create table if not exists school_interest (
  school_id uuid primary key references schools (id) on delete cascade,
  searches bigint not null default 0,
  views bigint not null default 0,
  last_searched_at timestamptz,
  last_viewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists school_interest_priority_idx
  on school_interest ((searches * 3 + views) desc, updated_at desc);

alter table school_interest enable row level security;

create or replace function record_school_interest(p_school_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('search', 'view') then
    raise exception 'unsupported interest kind: %', p_kind;
  end if;

  insert into school_interest (
    school_id,
    searches,
    views,
    last_searched_at,
    last_viewed_at,
    updated_at
  )
  values (
    p_school_id,
    case when p_kind = 'search' then 1 else 0 end,
    case when p_kind = 'view' then 1 else 0 end,
    case when p_kind = 'search' then now() else null end,
    case when p_kind = 'view' then now() else null end,
    now()
  )
  on conflict (school_id) do update
    set searches = school_interest.searches + case when p_kind = 'search' then 1 else 0 end,
        views = school_interest.views + case when p_kind = 'view' then 1 else 0 end,
        last_searched_at = case
          when p_kind = 'search' then now()
          else school_interest.last_searched_at
        end,
        last_viewed_at = case
          when p_kind = 'view' then now()
          else school_interest.last_viewed_at
        end,
        updated_at = now();
end;
$$;

revoke execute on function record_school_interest(uuid, text) from public, anon, authenticated;
grant execute on function record_school_interest(uuid, text) to service_role;

create or replace function record_school_interest_batch(
  p_school_ids uuid[],
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('search', 'view') then
    raise exception 'unsupported interest kind: %', p_kind;
  end if;

  insert into school_interest (
    school_id,
    searches,
    views,
    last_searched_at,
    last_viewed_at,
    updated_at
  )
  select distinct
    ids.school_id,
    case when p_kind = 'search' then 1 else 0 end,
    case when p_kind = 'view' then 1 else 0 end,
    case when p_kind = 'search' then now() else null end,
    case when p_kind = 'view' then now() else null end,
    now()
  from unnest(p_school_ids) as ids(school_id)
  on conflict (school_id) do update
    set searches = school_interest.searches + case when p_kind = 'search' then 1 else 0 end,
        views = school_interest.views + case when p_kind = 'view' then 1 else 0 end,
        last_searched_at = case
          when p_kind = 'search' then now()
          else school_interest.last_searched_at
        end,
        last_viewed_at = case
          when p_kind = 'view' then now()
          else school_interest.last_viewed_at
        end,
        updated_at = now();
end;
$$;

revoke execute on function record_school_interest_batch(uuid[], text)
  from public, anon, authenticated;
grant execute on function record_school_interest_batch(uuid[], text)
  to service_role;

create table if not exists discovery_requests (
  query_key text primary key,
  display_query text not null,
  searches bigint not null default 1,
  resolved_school_id uuid references schools (id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists discovery_requests_priority_idx
  on discovery_requests (searches desc, last_seen_at desc)
  where resolved_school_id is null;

alter table discovery_requests enable row level security;

create or replace function record_discovery_request(p_query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text := left(regexp_replace(trim(p_query), '\s+', ' ', 'g'), 80);
  query_key_value text := lower(cleaned);
begin
  if char_length(cleaned) < 2 then
    return;
  end if;

  insert into discovery_requests (query_key, display_query)
  values (query_key_value, cleaned)
  on conflict (query_key) do update
    set searches = discovery_requests.searches + 1,
        display_query = excluded.display_query,
        last_seen_at = now();
end;
$$;

revoke execute on function record_discovery_request(text)
  from public, anon, authenticated;
grant execute on function record_discovery_request(text) to service_role;

create table if not exists school_briefs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references schools (id) on delete cascade,
  summary text not null,
  strengths text[] not null default '{}',
  watchouts text[] not null default '{}',
  questions text[] not null default '{}',
  source_post_count integer not null default 0,
  source_updated_at timestamptz,
  model text not null,
  generated_at timestamptz not null default now()
);

create index if not exists school_briefs_generated_idx
  on school_briefs (generated_at desc);

alter table school_briefs enable row level security;
drop policy if exists "school briefs read" on school_briefs;
create policy "school briefs read" on school_briefs for select using (true);

create index if not exists reddit_school_created_idx
  on reddit_posts (school_id, created_at desc);
create index if not exists clusters_school_computed_idx
  on theme_clusters (school_id, computed_at desc);
create index if not exists postings_school_seen_idx
  on job_postings (school_id, first_seen_at desc);
create index if not exists board_status_expiry_idx
  on board_posts (status, expires_at, created_at desc);

create or replace function prune_worker_tables()
returns void
language sql
security definer
set search_path = public
as $$
  delete from jobs
   where status in ('done', 'dead')
     and created_at < now() - interval '14 days';
  delete from theme_clusters
   where computed_at < now() - interval '180 days';
  delete from turnover_signals
   where computed_at < now() - interval '180 days';
  delete from reddit_posts
   where school_id is null
     and fetched_at < now() - interval '90 days';
  delete from board_posts
   where status in ('expired', 'removed')
     and expires_at < now() - interval '180 days';
$$;

revoke execute on function prune_worker_tables() from public, anon, authenticated;
grant execute on function prune_worker_tables() to service_role;
