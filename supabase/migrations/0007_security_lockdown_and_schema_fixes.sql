-- 0007 — Security lockdown + schema correctness fixes.
--
-- Fixes shipped here:
--  1. RLS: submitters could self-approve salary records (insert/update any status).
--  2. RLS: country_tax_rates was publicly writable ("service write" policy applied
--     to anon/authenticated; service role bypasses RLS and never needed it).
--  3. RPC: claim_next_job / set_post_embedding / increment_reputation were
--     executable by anon+authenticated (and PUBLIC by default).
--  4. col_items had no moderation status at all.
--  5. reddit_posts.id was uuid but Reddit ids are text ("reddit_abc123") —
--     every ingest insert failed, so the whole social pipeline was dead.
--  6. posting_baselines upsert targets (school_id, window_key) with no unique
--     constraint — every upsert errored.
--  7. salary_records had no region column but the app filters on it.
--  8. schools -> salary_records cascade could silently destroy crowd data on
--     school dedup; replaced with RESTRICT + an explicit merge_schools() RPC.
--  9. Missing FK / filter indexes; jobs table churn with no retention.

-- ===========================================================================
-- 1. SALARY RECORDS: submitters may only create/edit PENDING rows
-- ===========================================================================
drop policy if exists "salary self insert" on salary_records;
create policy "salary self insert" on salary_records
  for insert with check (
    submitter_id = auth.uid()
    and status = 'pending'
    and trust_tier in ('unverified', 'email')
    and source = 'user_submit'
  );

drop policy if exists "salary self update" on salary_records;
create policy "salary self update" on salary_records
  for update using (
    submitter_id = auth.uid() and status = 'pending'
  ) with check (
    submitter_id = auth.uid()
    and status = 'pending'
    and trust_tier in ('unverified', 'email')
    and source = 'user_submit'
  );

-- ===========================================================================
-- 2. COUNTRY TAX RATES: drop the accidental public write policy
-- ===========================================================================
drop policy if exists "tax_rates service write" on country_tax_rates;

-- ===========================================================================
-- 3. FUNCTIONS: worker-only execution
-- ===========================================================================
revoke execute on function claim_next_job() from public, anon, authenticated;
grant execute on function claim_next_job() to service_role;

revoke execute on function increment_reputation(uuid, integer) from public;
revoke execute on function set_post_embedding(text, double precision[]) from public;

-- ===========================================================================
-- 4. COL ITEMS: moderation status + owner-scoped writes
-- ===========================================================================
alter table col_items
  add column if not exists status submission_status not null default 'approved';
-- New user submissions must enter as pending; existing seed rows stay approved.

drop policy if exists "col approved read" on col_items;
create policy "col approved read" on col_items
  for select using (
    status = 'approved'
    or submitter_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

drop policy if exists "col self insert" on col_items;
create policy "col self insert" on col_items
  for insert with check (
    submitter_id = auth.uid()
    and status = 'pending'
    and trust_tier in ('unverified', 'email')
  );

drop policy if exists "col self update" on col_items;
create policy "col self update" on col_items
  for update using (
    submitter_id = auth.uid() and status = 'pending'
  ) with check (
    submitter_id = auth.uid()
    and status = 'pending'
    and trust_tier in ('unverified', 'email')
  );

create policy "col mod update" on col_items
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

-- ===========================================================================
-- 5. PROFILES: allow self-insert (belt-and-braces beside the signup trigger)
-- ===========================================================================
drop policy if exists "profile self insert" on profiles;
create policy "profile self insert" on profiles
  for insert with check (id = auth.uid());

-- ===========================================================================
-- 6. REDDIT POSTS: text ids (Reddit ids are not uuids)
-- ===========================================================================
alter table reddit_posts alter column id type text using id::text;

-- Partial index for the embed job's "what still needs a vector" scan.
create index if not exists reddit_unembedded_idx
  on reddit_posts (fetched_at) where embedding is null;

-- ===========================================================================
-- 7. POSTING BASELINES: unique target for the upsert
-- ===========================================================================
delete from posting_baselines a using posting_baselines b
  where a.school_id = b.school_id and a.window_key = b.window_key and a.id > b.id;
create unique index if not exists posting_baselines_school_window_key
  on posting_baselines (school_id, window_key);

-- ===========================================================================
-- 8. SALARY RECORDS: region column (the app aggregates by region)
-- ===========================================================================
alter table salary_records add column if not exists region text;
update salary_records sr
   set region = s.region
  from schools s
 where sr.school_id = s.id and sr.region is null;
create index if not exists salary_region_status_idx on salary_records (region, status);

-- ===========================================================================
-- 9. SCHOOLS: no cascading destruction of crowd data; merge explicitly
-- ===========================================================================
alter table salary_records drop constraint if exists salary_records_school_id_fkey;
alter table salary_records
  add constraint salary_records_school_id_fkey
  foreign key (school_id) references schools (id) on delete restrict;

create or replace function merge_schools(p_keep uuid, p_remove uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_keep = p_remove then
    raise exception 'keep and remove must differ';
  end if;
  update salary_records   set school_id = p_keep where school_id = p_remove;
  update job_postings     set school_id = p_keep where school_id = p_remove;
  update reddit_posts     set school_id = p_keep where school_id = p_remove;
  update bounties         set school_id = p_keep where school_id = p_remove;
  update school_fee_tiers set school_id = p_keep where school_id = p_remove;
  delete from posting_baselines where school_id = p_remove;
  delete from theme_clusters    where school_id = p_remove;
  delete from turnover_signals  where school_id = p_remove;
  delete from schools where id = p_remove;
end;
$$;
revoke execute on function merge_schools(uuid, uuid) from public;
grant execute on function merge_schools(uuid, uuid) to service_role;

-- ===========================================================================
-- 10. MISSING FK / FILTER INDEXES
-- ===========================================================================
create index if not exists salary_reviewer_idx   on salary_records (reviewer_id);
create index if not exists col_submitter_idx     on col_items (submitter_id);
create index if not exists bounties_school_idx   on bounties (school_id);
create index if not exists bounties_creator_idx  on bounties (created_by);
create index if not exists bounties_filler_idx   on bounties (filled_by);
create index if not exists jobs_payload_gin      on jobs using gin (payload jsonb_path_ops);
create index if not exists salary_pending_idx    on salary_records (submitted_at)
  where status = 'pending';

-- Trigram search for school name/city lookups (ilike '%q%').
create extension if not exists pg_trgm;
create index if not exists schools_name_trgm_idx on schools using gin (name gin_trgm_ops);
create index if not exists schools_city_trgm_idx on schools using gin (city gin_trgm_ops);

-- ===========================================================================
-- 11. JOBS TABLE: churn control + retention
-- ===========================================================================
alter table jobs set (autovacuum_vacuum_scale_factor = 0.05, fillfactor = 80);

create or replace function prune_worker_tables()
returns void
language sql
security definer
set search_path = public
as $$
  delete from jobs
   where status in ('done', 'dead')
     and created_at < now() - interval '14 days';
  delete from theme_clusters   where computed_at < now() - interval '180 days';
  delete from turnover_signals where computed_at < now() - interval '180 days';
$$;
revoke execute on function prune_worker_tables() from public;
grant execute on function prune_worker_tables() to service_role;
