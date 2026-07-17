-- Staffroom Intel — initial schema (Postgres + pgvector)
-- Covers: salary/school/col, household-aware TANE, bounty/self-report,
-- Reddit posts + embeddings + theme clusters, job-posting turnover, FX, jobs queue.

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- ===========================================================================
-- ENUMS
-- ===========================================================================
create type housing_type as enum ('None', 'Allowance', 'Provided');
create type curriculum_tag as enum ('IB', 'British', 'US', 'Other');
create type trust_tier as enum ('seed', 'unverified', 'email', 'school');
create type submission_status as enum ('pending', 'approved', 'rejected');
create type salary_source as enum ('tsv_seed', 'user_submit');
create type valuation_basis as enum ('face', 'market');
create type job_status as enum ('queued', 'running', 'done', 'failed', 'dead');
create type job_type as enum (
  'reddit_fetch', 'embed', 'cluster', 'scrape', 'baseline',
  'turnover', 'fx', 'gap_detect'
);
create type bounty_status as enum ('open', 'filled', 'closed');
create type bounty_kind as enum ('salary', 'col', 'management', 'benefits', 'tenure');

-- ===========================================================================
-- PROFILES  (one row per auth user)
-- ===========================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  display_currency text not null default 'USD',
  -- household composition: { adults, earningAdults, children: [{age, schoolAge}] }
  household jsonb not null default '{"adults":1,"earningAdults":1,"children":[]}'::jsonb,
  reputation_points integer not null default 0,
  role text not null default 'member', -- member | moderator | admin
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- SCHOOLS
-- ===========================================================================
create table schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  country text not null,
  country_code text not null default 'XX',
  region text not null,
  curricula curriculum_tag[] not null default '{}',
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
create index schools_country_idx on schools (country);
create index schools_region_idx on schools (region);

-- ===========================================================================
-- SALARY RECORDS  (canonical USD)
-- ===========================================================================
create table salary_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools (id) on delete cascade,
  year integer not null,
  country text not null,
  city text not null,
  school text not null,                 -- original name (denormalized for fuzzy/backfill)
  curriculum curriculum_tag not null default 'Other',
  role text not null,
  management_role boolean not null default false,
  tenure_years numeric,
  currency text not null default 'USD',
  monthly_salary_usd numeric not null,  -- gross monthly USD
  net_annual_usd numeric not null,      -- net annual USD (canonical)
  net_monthly_usd numeric not null,
  tax_rate numeric,                     -- 0..1
  tax_regime text,
  housing housing_type not null default 'None',
  flights boolean not null default false,
  -- full package breakdown (annual USD, optional) for TANE
  package jsonb not null default '{}'::jsonb,
  source salary_source not null default 'user_submit',
  trust_tier trust_tier not null default 'unverified',
  status submission_status not null default 'pending',
  submitter_id uuid references profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references profiles (id) on delete set null
);
create index salary_school_idx on salary_records (school_id);
create index salary_country_idx on salary_records (country);
create index salary_status_idx on salary_records (status, trust_tier);
create index salary_submitter_idx on salary_records (submitter_id);

-- ===========================================================================
-- TANE COMPONENTS  (per salary_record, normalized annual USD)
-- ===========================================================================
create table tane_components (
  id uuid primary key default gen_random_uuid(),
  salary_record_id uuid not null references salary_records (id) on delete cascade,
  component text not null,              -- base | housing | flights | fees | gratuity | relocation | healthcare | bonus
  amount_usd numeric not null default 0,
  valuation_basis valuation_basis not null default 'face',
  provenance text,
  created_at timestamptz not null default now()
);
create index tane_record_idx on tane_components (salary_record_id);

-- ===========================================================================
-- COST OF LIVING ITEMS  (granular, per city)
-- ===========================================================================
create table col_items (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  region text not null,
  col_index numeric not null default 0,       -- vs London = 100
  median_monthly_usd numeric not null default 0,
  buying_power_usd numeric not null default 0,
  milk numeric, beer numeric, meal numeric, takeaway numeric, gym numeric, taxi numeric,
  source text not null default 'seed',
  trust_tier trust_tier not null default 'seed',
  submitter_id uuid references profiles (id) on delete set null,
  submitted_at timestamptz not null default now()
);
create index col_city_idx on col_items (city, country);

-- ===========================================================================
-- REFERENCE TABLES  (market rent, school-fee tiers) for TANE valuation
-- ===========================================================================
create table market_rents (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  bedrooms integer not null,
  monthly_usd numeric not null,
  source text not null default 'seed'
);
create index market_rents_city_idx on market_rents (city, country, bedrooms);

create table school_fee_tiers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools (id) on delete cascade,
  grade_tier text not null,             -- early | primary | middle | senior
  annual_usd numeric not null,
  source text not null default 'seed'
);
create index fee_tiers_school_idx on school_fee_tiers (school_id);

-- ===========================================================================
-- REDDIT POSTS  (+ pgvector embeddings)
-- ===========================================================================
create table reddit_posts (
  id uuid primary key,                  -- reddit post id
  school_id uuid references schools (id) on delete set null,
  subreddit text not null,
  title text,
  body text,
  author text,
  score integer,
  created_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  sentiment_score numeric,              -- -0.7..0.7 (lexicon baseline)
  themes text[] not null default '{}',
  embedding vector(1536)
);
create index reddit_school_idx on reddit_posts (school_id);
create index reddit_created_idx on reddit_posts (created_at);
create index reddit_embedding_idx on reddit_posts
  using hnsw (embedding vector_cosine_ops);

-- ===========================================================================
-- THEME CLUSTERS  (per school + time window)
-- ===========================================================================
create table theme_clusters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools (id) on delete cascade,
  theme_label text not null,            -- Pay | Management | Housing | Workload | Turnover | Culture | Other
  summary text,
  post_count integer not null default 0,
  sentiment_score numeric not null default 0,
  window_start timestamptz not null,
  window_end timestamptz not null,
  computed_at timestamptz not null default now()
);
create index theme_clusters_school_idx on theme_clusters (school_id, computed_at);

-- ===========================================================================
-- JOB POSTINGS  (turnover monitoring)
-- ===========================================================================
create table job_postings (
  id uuid primary key default gen_random_uuid(),
  hash text not null unique,            -- content hash for dedupe
  source text not null,                 -- tes | grc | teacherhorizons | schrole | eslcafe
  school_id uuid references schools (id) on delete set null,
  school_text text,                     -- raw school name for fuzzy resolution
  title text,
  raw_url text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now()
);
create index postings_school_idx on job_postings (school_id);
create index postings_source_idx on job_postings (source, first_seen_at);

-- ===========================================================================
-- POSTING BASELINE + TURNOVER SIGNALS
-- ===========================================================================
create table posting_baselines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  window text not null,                 -- term label / bucket key
  avg_posts numeric not null default 0,
  computed_at timestamptz not null default now()
);
create index baseline_school_idx on posting_baselines (school_id);

create table turnover_signals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete cascade,
  signal_strength numeric not null default 0,  -- 0..1
  posting_delta numeric not null default 0,
  sentiment_shift numeric not null default 0,
  rationale text,
  computed_at timestamptz not null default now()
);
create index turnover_school_idx on turnover_signals (school_id, computed_at);

-- ===========================================================================
-- BOUNTIES  (reputation model — no money)
-- ===========================================================================
create table bounties (
  id uuid primary key default gen_random_uuid(),
  scope_kind text not null,             -- school | country | role
  scope_value text not null,
  school_id uuid references schools (id) on delete set null,
  kind bounty_kind not null,
  reward_points integer not null default 50,
  status bounty_status not null default 'open',
  created_by uuid references profiles (id) on delete set null,
  filled_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  filled_at timestamptz
);
create index bounties_status_idx on bounties (status);

-- ===========================================================================
-- JOBS QUEUE  (drained by the Railway worker)
-- ===========================================================================
create table jobs (
  id uuid primary key default gen_random_uuid(),
  type job_type not null,
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  locked_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index jobs_status_idx on jobs (status, created_at);

-- ===========================================================================
-- FX RATES  (display-time conversion; USD canonical)
-- ===========================================================================
create table fx_rates (
  currency text primary key,            -- ISO code; USD = 1.0
  rate_to_usd numeric not null,
  fetched_at timestamptz not null default now()
);
insert into fx_rates (currency, rate_to_usd) values ('USD', 1.0)
  on conflict (currency) do nothing;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table profiles enable row level security;
alter table schools enable row level security;
alter table salary_records enable row level security;
alter table tane_components enable row level security;
alter table col_items enable row level security;
alter table market_rents enable row level security;
alter table school_fee_tiers enable row level security;
alter table reddit_posts enable row level security;
alter table theme_clusters enable row level security;
alter table job_postings enable row level security;
alter table posting_baselines enable row level security;
alter table turnover_signals enable row level security;
alter table bounties enable row level security;
alter table jobs enable row level security;
alter table fx_rates enable row level security;

-- Public read on approved/aggregate data
create policy "schools read" on schools for select using (true);
create policy "col approved read" on col_items for select using (true);
create policy "market_rents read" on market_rents for select using (true);
create policy "fee_tiers read" on school_fee_tiers for select using (true);
create policy "reddit read" on reddit_posts for select using (true);
create policy "theme_clusters read" on theme_clusters for select using (true);
create policy "job_postings read" on job_postings for select using (true);
create policy "baselines read" on posting_baselines for select using (true);
create policy "turnover read" on turnover_signals for select using (true);
create policy "bounties read" on bounties for select using (true);
create policy "fx read" on fx_rates for select using (true);

-- Salary records: approved rows are public; pending rows visible only to owner/mod
create policy "salary approved read" on salary_records
  for select using (
    status = 'approved'
    or submitter_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );
create policy "tane via approved" on tane_components
  for select using (
    exists (
      select 1 from salary_records s
      where s.id = tane_components.salary_record_id
        and (s.status = 'approved' or s.submitter_id = auth.uid()
             or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin')))
    )
  );

-- Profiles: a user reads/updates only their own profile
create policy "profile self read" on profiles for select using (id = auth.uid());
create policy "profile self update" on profiles for update using (id = auth.uid());

-- Self-write on submissions
create policy "salary self insert" on salary_records
  for insert with check (submitter_id = auth.uid());
create policy "salary self update" on salary_records
  for update using (submitter_id = auth.uid());
create policy "col self insert" on col_items
  for insert with check (submitter_id = auth.uid());
create policy "col self update" on col_items
  for update using (submitter_id = auth.uid());

-- Moderator/admin write on approvals + bounties
create policy "salary mod update" on salary_records
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );
create policy "tane mod insert" on tane_components
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
    or exists (select 1 from salary_records s where s.id = tane_components.salary_record_id and s.submitter_id = auth.uid())
  );
create policy "bounty mod write" on bounties
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
  );

-- Note: jobs, reddit_posts, theme_clusters, job_postings, posting_baselines,
-- turnover_signals, fx_rates, market_rents, school_fee_tiers are written by the
-- service-role worker (bypasses RLS). Reads are public via the policies above.
