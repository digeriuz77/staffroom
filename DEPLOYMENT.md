# Staffroom Intel — Deployment & Implementation Guide

This guide covers the full deployment topology, environment setup, database
seeding, worker configuration, and operational procedures for Staffroom Intel.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                  │
│                   (browser, any device)                      │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│   Vercel (Next.js 16)     │        │   Supabase (Postgres)     │
│   ────────────────────    │        │   ────────────────────    │
│   • SSR pages + API routes│◄──────►│   • Auth (email + Google) │
│   • Server Components     │        │   • Postgres + pgvector   │
│   • Client interactivity  │        │   • Row-Level Security    │
│   • FX / TANE / sentiment │        │   • Jobs queue table      │
│   • Jobs board + account  │        │   • Board posts + flags   │
│   • Enqueues fetch jobs   │        │   • School members        │
│   • Records search/view   │        │   • school_interest       │
│     demand (after())      │        │   • discovery_requests    │
│   • Enqueues brief jobs   │        │   • school_briefs         │
└───────────┬──────────────┘        └──────────┬───────────────┘
            │                                  │
            │ enqueue job                      │ claim job (SKIP LOCKED)
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Railway Worker (continuous or scheduled)        │
│              ─────────────────────────────────────           │
│   • Drains jobs queue (5s poll or bounded batch via once)    │
│   • Reddit fetch → embed → cluster → brief (cascade)         │
│   • Multi-provider embeddings (Google / Pinecone / OpenAI)   │
│   • AI evidence briefs (Gemini Flash-Lite, cached)           │
│   • Job-board scraper → baseline → turnover signals          │
│   • FX refresh, demand-aware gap detection                   │
│   • Reputation awards, board post expiry                     │
│   • Worker table pruning (expanded retention)                │
│   • Redis NOT required — Postgres IS the queue               │
└─────────────────────────────────────────────────────────────┘
```

### Three deploy targets

| Target   | Platform  | What runs there                         | Cost (MVP) |
|----------|-----------|-----------------------------------------|------------|
| Web app  | Vercel    | Next.js 16 SSR + API routes             | Free tier  |
| Database | Supabase  | Postgres + Auth + pgvector + RLS        | Free tier  |
| Worker   | Railway   | Queue-draining background jobs          | ~$5/mo (continuous) or pennies (scheduled) |

> **Graceful fallback:** The app runs entirely on the in-memory TSV dataset
> (619 salary records, 60 cities, static tax/FX) when Supabase env vars are
> absent. This means you can develop and preview locally with zero external
> setup. Flip to Supabase by setting env vars.

---

## Prerequisites

- **Bun** >= 1.3 (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** >= 20 (for Vercel build compatibility)
- A **Vercel** account (free)
- A **Supabase** project (free tier: 500MB DB, 50K auth users)
- A **Railway** account (~$5/mo for always-on worker, or pennies for scheduled mode)
- A **Reddit** app (free, for the OAuth API) — optional; the app falls back to
  the public RedReader installed-client flow without one
- (Optional, recommended) A **Google AI (Gemini)** API key — powers both free-tier
  embeddings (`gemini-embedding-001`) and the low-cost evidence brief agent
  (`gemini-3.1-flash-lite`). Get one at [aistudio.google.com](https://aistudio.google.com/apikey).
- (Optional) A **Pinecone** API key — alternative embeddings provider
  (`llama-text-embed-v2`) via Pinecone Inference
- (Optional) An **OpenAI** API key — legacy embeddings provider
  (`text-embedding-3-small`)

---

## Phase 1: Local Development (Zero External Setup)

The app works immediately with no external services because of the TSV fallback.

```bash
bun install
bun dev    # starts Next.js dev server on :3000
```

Visit `http://localhost:3000`. You'll see:
- 619 salary records from the TSV dataset
- Static tax rates (90+ countries)
- Static FX rates (90+ currencies)
- Purchasing power tool, school browse, school reports
- Reddit sentiment (falls back to curated static posts without credentials)

Features that require Supabase (auth, submissions, bounties, jobs board,
account, worker jobs) will show a "not configured" notice but won't crash.
The TSV fallback covers salary data, tax rates, FX, cost of living, school
reports, and the purchasing-power tool.

```bash
bun test        # 85 tests across 10 files
bun typecheck   # tsc --noEmit
bun lint        # eslint
```

---

## Phase 2: Supabase Setup

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users (e.g., EU-West for European teachers)
3. Set a strong database password — store it in a password manager
4. Wait for provisioning (~2 min)

### 2.2 Run Migrations

All SQL lives in `supabase/migrations/`. Run them in order via the Supabase SQL
Editor (Dashboard → SQL Editor → New query) or via the Supabase CLI:

```bash
# Option A: CLI (recommended)
bunx supabase link --project-ref <your-project-ref>

# Phase 1 — schema migrations (no data dependencies)
for f in supabase/migrations/000[1-8]_*.sql; do
  echo "Running $f..."
  psql "$DATABASE_URL" -f "$f"
done

# Phase 2 — seed salary records, schools, COL, and relevance-filtered
# Reddit posts (supersedes migration 0009 with better filtering)
bun db:seed

# Phase 3 — theme clusters from seeded posts, then growth/agent schema
for f in supabase/migrations/001[0-1]_*.sql; do
  echo "Running $f..."
  psql "$DATABASE_URL" -f "$f"
done

# Note: migration 0009_reddit_posts_seed.sql is superseded by `bun db:seed`,
# which now reconciles Reddit seed posts with relevance filtering (30 → 13
# relevant). You do not need to run 0009 separately.

# Option B: Supabase Dashboard → SQL Editor
# Paste 0001 → 0008, run `bun db:seed`, then paste 0010 → 0011
```

Migration summary:

| File | Creates |
|------|---------|
| `0001_init.sql` | All tables, indexes, pgvector extension, HNSW index, RLS policies |
| `0002_claim_job_rpc.sql` | `claim_next_job()` function (FOR UPDATE SKIP LOCKED) |
| `0003_set_embedding_rpc.sql` | `set_post_embedding()` function (pgvector cast) |
| `0004_reputation_and_profile_trigger.sql` | `increment_reputation()`, auto-profile on signup |
| `0005_tax_rates_and_fx_seed.sql` | 90+ country tax rates + 90+ currency FX rates |
| `0006_stale_job_reaper.sql` | Reclaims jobs stuck in `running` for > 10 min |
| `0007_security_lockdown_and_schema_fixes.sql` | RLS lockdown, `reddit_posts.id` text, `region` column, `merge_schools()` RPC, FK indexes, jobs retention |
| `0008_membership_and_board.sql` | Profile membership fields, `school_members`, `board_posts`, `board_post_flags`, `expire_board_posts()` |
| `0009_reddit_posts_seed.sql` | Seed Reddit posts (runs after `bun db:seed` establishes schools) |
| `0010_theme_clusters_seed.sql` | Seed semantic theme clusters from lexicon-tagged posts |
| `0011_growth_and_agent.sql` | `school_interest`, `discovery_requests`, `school_briefs` tables; `record_school_interest`, `record_school_interest_batch`, `record_discovery_request` RPCs; `set_post_embedding_v2` with provider/model provenance; `brief` job type; expanded `prune_worker_tables()` retention; targeted indexes; drops public profile read policy |

> **Important:** Migrations must be run in order. Migration 0007 alters
> `reddit_posts.id` from uuid to text and adds the `salary_records.region`
> column — without these, the Reddit ingest pipeline and region stats will
> silently fail. Migration 0008 adds the jobs board and membership tables.
> Migration 0010 depends on `reddit_posts` being populated, which `bun db:seed`
> now handles (it reconciles Reddit seed posts with relevance filtering,
> superseding the raw 0009 migration). Migration 0011 adds the demand-aware
> growth and AI evidence brief tables; run it before configuring
> `EMBEDDINGS_PROVIDER` and the AI agent on Railway.

### 2.3 Seed the Database

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

bun db:seed     # inserts 619 salary records, 551 schools, 60 COL items,
                # and reconciles Reddit seed posts (relevance-filtered)
bun db:parity   # verifies aggregate medians match the TSV dataset
```

Expected output from parity check:
```
DB : { count: 619, p25: ..., median: ..., p75: ... }
TSV: { count: 619, p25: ..., median: ..., p75: ... }

PARITY OK
```

### 2.4 Enable Auth Providers

Dashboard → Authentication → Providers:

1. **Email** — enable (magic link, no password needed)
2. **Google** — enable, provide OAuth client ID/secret from Google Cloud Console
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

### 2.5 Set Up a Moderator

After your first user signs up, promote them to moderator via SQL:

```sql
update profiles set role = 'moderator' where id = '<user-uuid>';
```

---

## Phase 3: Vercel Deployment (Web App)

### 3.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Build command: `next build` (auto-detected)
4. Root directory: `/` (project root)

### 3.2 Environment Variables

Set in Vercel → Settings → Environment Variables:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<anon-key>` | Supabase → Settings → API |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Same as public URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service-role-key>` | Supabase → Settings → API |

> **Never** set `REDDIT_*`, `EMBEDDINGS_*`, `GOOGLE_AI_API_KEY`,
> `PINECONE_API_KEY`, or `AI_AGENT_*` on Vercel — those belong on the worker
> only. The web app enqueues jobs (e.g. `reddit_fetch` when the stored
> sentiment corpus is thin) but does not make Reddit, embeddings, or AI API
> calls directly. The service-role key on Vercel is needed for enqueueing and
> for server-side reads that bypass RLS (school directory, FX rates, etc.).

> **No new Vercel env vars were added** in the 0011 migration. The web app's
> demand-aware recording (`school_interest`, `discovery_requests`) and brief
> job enqueueing all use the existing `SUPABASE_SERVICE_ROLE_KEY`. The four
> vars above are all Vercel needs.

### 3.3 Deploy

```bash
vercel --prod
```

### 3.4 Verify

- Visit the deployed URL
- Paste a tes.com job link → should route to school report
- School report should show TANE panel, tax regime card, sentiment panel with theme clusters
- Sign in (email magic link) → should create a profile row automatically
- Submit a salary → should appear as pending
- Compare page: search and add schools to the comparison tray
- Jobs board (`/board`): browse posts; sign in to post
- Account page (`/account`): edit profile, see reputation

---

## Phase 4: Railway Deployment (Worker)

### 4.1 Create Railway Service

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select the same repository
3. Railway auto-detects — set the **Root Directory** to the repo root (the worker
   shares `src/lib` with the app)
4. Set **Build Command**: `bun install`
5. Set **Start Command** (choose one mode — see below):

#### Worker modes

| Mode | Start command | When to use | Cost |
|------|---------------|-------------|------|
| **Continuous** | `bun run worker/index.ts` | Production traffic, real-time ingest | ~$5/mo (always-on) |
| **Scheduled (low-cost)** | `bun run worker:once` | Low traffic, cost-sensitive | Pennies per run (serverless cron) |

**Continuous mode** polls the Postgres queue every `WORKER_POLL_MS` (default 5s)
and drains jobs indefinitely. Best when you have steady traffic and want
real-time sentiment ingestion.

**Scheduled mode** (`bun worker:once`) drains a bounded batch of up to
`WORKER_MAX_JOBS` (default 25) jobs and exits. Pair with a Railway cron
trigger (or Vercel Cron, GitHub Actions, etc.) to run every 15-60 minutes.
This avoids paying for an always-on worker when traffic is low. The demand-aware
queue ensures high-priority schools (more searches/views) are processed first.

### 4.2 Environment Variables (Railway)

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service-role-key>` | Required |
| `REDDIT_CLIENT_ID` | Reddit app client ID | Optional — app falls back to public RedReader flow without it |
| `REDDIT_CLIENT_SECRET` | Reddit app secret | Optional (same as above) |
| `REDDIT_SUBREDDITS` | `InternationalTeachers,InternationalSchools,TEFL` | Optional override (defaults to 12 subreddits) |
| `EMBEDDINGS_PROVIDER` | `google` | Recommended. Also: `pinecone` or `openai` |
| `GOOGLE_AI_API_KEY` | `<google-ai-key>` | Required if `EMBEDDINGS_PROVIDER=google`. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Also powers the AI brief agent unless `AI_AGENT_API_KEY` is set |
| `PINECONE_API_KEY` | `<pinecone-key>` | Required if `EMBEDDINGS_PROVIDER=pinecone` |
| `EMBEDDINGS_API_KEY` | `<openai-key>` | Required if `EMBEDDINGS_PROVIDER=openai` (legacy) |
| `EMBEDDINGS_MODEL` | *(leave blank for provider default)* | google=`gemini-embedding-001`, pinecone=`llama-text-embed-v2`, openai=`text-embedding-3-small` |
| `EMBEDDINGS_BASE_URL` | *(leave blank for provider default)* | Override only for self-hosted/proxy endpoints |
| `AI_AGENT_API_KEY` | *(leave blank to reuse `GOOGLE_AI_API_KEY`)* | Separate key for the evidence brief agent if desired |
| `AI_AGENT_MODEL` | *(leave blank for `gemini-3.1-flash-lite`)* | Override the brief agent model |
| `AI_AGENT_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | Default; override for proxy endpoints |
| `SENTIMENT_FRESHNESS_HOURS` | `6` | Hours before cached corpus is re-fetched live. Lower = fresher, higher = cheaper |
| `WORKER_POLL_MS` | `5000` | Poll interval for continuous worker mode |
| `WORKER_MAX_JOBS` | `25` | Cap for `bun worker:once` (low-cost scheduled mode) |

> **Minimum viable worker config:** Just `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
> + `EMBEDDINGS_PROVIDER=google` + `GOOGLE_AI_API_KEY`. This enables semantic
> clustering, evidence briefs, and demand-aware growth on the free/low-cost
> Google AI tier. Reddit credentials are optional (public flow fallback).
>
> **If you were previously using OpenAI embeddings:** Change
> `EMBEDDINGS_PROVIDER` to `google`, set `GOOGLE_AI_API_KEY`, and remove
> `EMBEDDINGS_API_KEY`. Existing vectors (1536-dim) remain compatible — Google
> `gemini-embedding-001` also emits 1536 dims. Pinecone's 1024-dim vectors are
> zero-padded to 1536 (cosine geometry preserved).

### 4.3 Reddit App Setup

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → Create App
2. Type: **script**
3. Name: `staffroom-intel`
4. Redirect URI: `http://localhost` (script apps don't use it for OAuth)
5. Copy the client ID (under the app name) and secret

### 4.4 Set Up Scheduled Jobs (Railway Cron)

Railway supports cron triggers. Create a second service in the same project:

- **Service Name**: `staffroom-cron`
- **Build Command**: `bun install`
- **Start Command**: `bun run worker/cron.ts daily`
- **Cron Schedule**: `0 6 * * *` (daily at 06:00 UTC)

For hourly Reddit ingest, create another:
- **Start Command**: `bun run worker/cron.ts hourly`
- **Cron Schedule**: `0 * * * *` (every hour)

For weekly baselines/turnover:
- **Start Command**: `bun run worker/cron.ts weekly`
- **Cron Schedule**: `0 4 * * 1` (Monday 04:00 UTC)

> **Low-cost alternative:** Instead of an always-on worker + cron services,
> you can run `bun worker:once` on a single cron trigger (e.g., every 30 min).
> This drains up to `WORKER_MAX_JOBS` queued jobs per run and exits, avoiding
> the always-on worker cost entirely. The demand-aware queue ensures
> high-priority schools are processed first.

### 4.5 Verify Worker

Check Railway logs after deploy:
```
[worker] started (poll every 5000ms)
[worker] claimed reddit_fetch abc123
[worker] done reddit_fetch abc123
[worker] claimed embed def456
[embeddings] provider=google model=gemini-embedding-001
[worker] done embed def456
[worker] claimed brief ghi789
[worker] done brief ghi789
[worker] queue idle @ ...
```

In scheduled (`worker:once`) mode, you'll see the same job processing but the
worker exits after draining `WORKER_MAX_JOBS` jobs:
```
[worker:once] draining up to 25 jobs
[worker] claimed reddit_fetch abc123
[worker] done reddit_fetch abc123
...
[worker:once] batch complete (8 jobs processed)
```

---

## Phase 5: Post-Deploy Checklist

- [ ] Web app loads on Vercel URL
- [ ] School report renders with TANE, tax, sentiment panels (theme clusters + turnover)
- [ ] Email magic link sign-in works
- [ ] Google OAuth sign-in works
- [ ] Salary submission → pending → moderator approve → reputation awarded
- [ ] Currency picker converts all displays
- [ ] Website health checker fetches a real school site
- [ ] Compare page: school cards render, tray persists across pages
- [ ] Jobs board (`/board`): browse works, signed-in users can post
- [ ] Account page (`/account`): profile editing, school affiliation
- [ ] Worker logs show queue draining (check Railway)
- [ ] `bun db:parity` passed before cutover
- [ ] Reddit posts appearing in `reddit_posts` table (check Supabase)
- [ ] FX rates populated in `fx_rates` table
- [ ] Open bounties auto-created by gap detection job
- [ ] Board post auto-expiry runs via daily cron
- [ ] Worker table pruning runs via daily cron (old jobs cleaned up)
- [ ] Migration 0011 applied (`school_interest`, `discovery_requests`, `school_briefs` tables exist)
- [ ] Embeddings provider configured on Railway (`EMBEDDINGS_PROVIDER=google` + `GOOGLE_AI_API_KEY`)
- [ ] Embeddings written with provenance: `select embedding_provider, count(*) from reddit_posts where embedding is not null group by embedding_provider;`
- [ ] AI evidence briefs generating for schools with 3+ posts (check `school_briefs` table after worker runs)
- [ ] Demand-aware growth working: search a school, then check `select * from school_interest order by updated_at desc limit 5;`
- [ ] Leaderboard only shows opted-in public profiles

---

## Environment Variable Reference

### Web App (Vercel)

```env
# Supabase (required for full functionality)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> That's all Vercel needs. No Reddit, embeddings, or AI agent keys go here.

### Worker (Railway)

```env
# Supabase (required)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Reddit API (optional — falls back to public flow without credentials)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_SUBREDDITS=InternationalTeachers,InternationalSchools,TEFL

# Embeddings — choose ONE provider (recommended: Google free tier)
EMBEDDINGS_PROVIDER=google
GOOGLE_AI_API_KEY=<google-ai-key>
# Alternative providers (uncomment if using):
# PINECONE_API_KEY=<pinecone-key>        # EMBEDDINGS_PROVIDER=pinecone
# EMBEDDINGS_API_KEY=<openai-key>        # EMBEDDINGS_PROVIDER=openai
# Optional model/base URL overrides (defaults are provider-specific):
# EMBEDDINGS_MODEL=
# EMBEDDINGS_BASE_URL=

# Evidence brief agent (optional — reuses GOOGLE_AI_API_KEY if empty)
AI_AGENT_API_KEY=
AI_AGENT_MODEL=gemini-3.1-flash-lite
AI_AGENT_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Sentiment freshness (optional)
SENTIMENT_FRESHNESS_HOURS=6

# Worker tuning
WORKER_POLL_MS=5000
WORKER_MAX_JOBS=25
```

### Local Development (optional)

```env
# Copy .env.example to .env.local
# Leave Supabase vars empty to use TSV fallback
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
EMBEDDINGS_PROVIDER=google
GOOGLE_AI_API_KEY=
# AI_AGENT_API_KEY=  # reuses GOOGLE_AI_API_KEY if empty
```

---

## Database Schema Summary

### Core tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User settings (currency, household, reputation, membership kind, school affiliation) | Self read/update/insert; public read if `public_profile` |
| `schools` | Schools derived from salary records + community submissions | Public read |
| `salary_records` | Salary + package data (seed + user-submitted). Has `region` column (added in 0007) | Approved: public; Pending: owner/mod only. Self-insert locked to `status='pending'` |
| `tane_components` | Per-record TANE breakdown (base/housing/flights/fees/etc.) | Via parent record |
| `col_items` | Cost-of-living data per city. Has `status` column (added in 0007) | Approved: public; Pending: owner/mod only |
| `country_tax_rates` | 90+ countries: effective rate, social insurance, regime | Public read (no public write) |
| `fx_rates` | 90+ currencies: rate_to_usd | Public read |
| `reddit_posts` | Reddit posts with pgvector embeddings (1536-dim). `id` is text (Reddit ids) | Public read |
| `theme_clusters` | Semantic theme clusters per school + time window | Public read |
| `job_postings` | Scraped job listings for turnover monitoring | Public read |
| `turnover_signals` | Posting-delta x sentiment-shift correlation | Public read |
| `bounties` | Reputation-based data-gap bounties | Public read; Mod write |
| `jobs` | Queue table (drained by Railway worker) | Service-role only (RPC revoked from anon) |
| `school_members` | School representative affiliations (verified by moderators) | Self insert/read/delete; verified: public; mod write |
| `board_posts` | Community jobs board posts | Active + not expired: public; self read/update; mod write |
| `board_post_flags` | Community moderation flags | Self insert; self/mod read |
| `school_interest` | Aggregate demand per school (searches, views) — no PII | Service-role only (RPC) |
| `discovery_requests` | Unresolved search queries for schools not yet in directory | Service-role only (RPC) |
| `school_briefs` | Cached AI-generated evidence briefs per school | Public read |

### Reference tables

| Table | Purpose |
|-------|---------|
| `market_rents` | Per-city market rent by bedroom count (TANE housing valuation) |
| `school_fee_tiers` | Per-school annual fees by grade tier (TANE fee valuation) |
| `posting_baselines` | Per-school posting-frequency baselines (turnover monitoring). Unique on `(school_id, window)` |

### Key schema notes (migration 0007+)

- `reddit_posts.id` is `text`, not `uuid` (Reddit post ids are strings like `abc123`).
- `reddit_posts` has `embedding_provider` and `embedding_model` columns (added in 0011) tracking which provider generated each vector.
- `salary_records` has a `region` column populated from the linked school's region.
- `salary_records.school_id` uses `ON DELETE RESTRICT` (not cascade) — use the `merge_schools(keep, remove)` RPC to deduplicate schools safely.
- `col_items` has a `status` column (`pending` / `approved` / `rejected`) with the same moderation flow as salary records.
- `profiles` has `profile_kind` (teacher / school_staff / recruiter), `school_id`, `bio`, and `public_profile` columns. Public full-profile reads were removed in 0011 (privacy); leaderboards now filter by `public_profile = true`.
- `posting_baselines` has a unique constraint on `(school_id, window)` to support upserts.
- `school_interest` stores aggregate demand (search count, view count) per school with no PII — updated via `record_school_interest` / `record_school_interest_batch` RPCs.
- `discovery_requests` captures search queries that matched no existing school, preserving demand for future data acquisition.
- `school_briefs` caches AI-generated evidence briefs (summary, strengths, watchouts, questions) per school, refreshed only when the underlying corpus changes.
- Worker RPCs (`claim_next_job`, `set_post_embedding`, `set_post_embedding_v2`, `increment_reputation`, `merge_schools`, `record_school_interest`, `record_discovery_request`, `prune_worker_tables`, `expire_board_posts`) are `service_role` only.
- `prune_worker_tables()` (expanded in 0011) now also deletes unlinked Reddit posts older than 180 days and expired board posts, in addition to old jobs (14 days), theme clusters (180 days), and turnover signals (180 days).

---

## Operational Procedures

### Adding a new moderator

```sql
update profiles set role = 'moderator' where id = '<user-uuid>';
```

### Verifying a school representative

A user joins a school via the Account page (`/account`), which creates an
unverified `school_members` row. A moderator verifies them:

```sql
update school_members set verified = true where user_id = '<user-uuid>';
```

### Merging duplicate schools

Schools are auto-created by the fuzzy resolver, so duplicates are inevitable.
Use the `merge_schools()` RPC to safely repoint all child records and delete
the duplicate (never `DELETE FROM schools` directly, as `salary_records` uses
`ON DELETE RESTRICT`):

```sql
select merge_schools('<keep-uuid>', '<remove-uuid>');
```

This repoints `salary_records`, `job_postings`, `reddit_posts`, `bounties`,
and `school_fee_tiers`, then cleans up baselines/clusters/signals and removes
the duplicate school row.

### Pruning old worker data

The daily cron calls `prune_worker_tables()` automatically, but you can run it
manually:

```sql
select prune_worker_tables();
-- Deletes jobs older than 14 days (done/dead)
-- Deletes theme_clusters and turnover_signals older than 180 days
-- Deletes unlinked Reddit posts older than 180 days (added in 0011)
-- Deletes expired board posts (added in 0011)
```

### Expiring stale board posts

The daily cron calls `expire_board_posts()` automatically. Manual run:

```sql
select expire_board_posts();
-- Sets status='expired' where expires_at <= now()
```

### Refreshing the FX rates manually

```bash
# Enqueue an FX job (worker will pick it up)
# Or directly via the Supabase SQL editor:
select enqueue_job; -- not available; use the cron or worker
```

Simplest: run `bun run worker/cron.ts daily` locally with env vars set.

### Monitoring queue health

```sql
-- Queue depth by status
select status, count(*) from jobs group by status;

-- Recent failures
select type, error, created_at from jobs where status = 'dead'
order by created_at desc limit 20;

-- Last run times per job type
select type, max(completed_at) as last_run from jobs
where status = 'done' group by type order by type;
```

### Backup

Supabase free tier includes daily automated backups (7-day retention). For
production use, enable point-in-time recovery (Pro plan).

### Scaling considerations

| Concern | Threshold | Action |
|---------|-----------|--------|
| DB size | > 400MB (free tier limit) | Upgrade to Supabase Pro ($25/mo) |
| Worker queue depth | Consistently > 100 | Scale worker replicas on Railway, or switch from `worker:once` to continuous mode |
| Reddit rate limits | 429 errors in logs | Reduce fetch frequency; add backoff |
| Embeddings cost | > $5/mo | Switch to Google free tier (`EMBEDDINGS_PROVIDER=google`); reduce batch frequency |
| AI brief cost | > $5/mo | Briefs only run when corpus changes — check `school_briefs` churn rate; increase `SENTIMENT_FRESHNESS_HOURS` |
| Vercel function timeout | Heavy analysis routes | Move to worker via queue |

---

## Troubleshooting

### "supabase not configured" notice

Means `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. The app falls
back to TSV — check your env vars.

### School report shows no TANE breakdown

TANE requires salary records with `status = 'approved'`. Check that the seed
ran (`bun db:seed`) and the school has records.

### Worker not draining jobs

1. Check Railway logs for connection errors
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
3. Confirm the `claim_next_job()` RPC exists (migration 0002)
4. Check `jobs` table for items with `status = 'queued'`

### Reddit sentiment always falls back to static

The sentiment system is now DB-first: it reads from stored `reddit_posts` +
`theme_clusters` + `turnover_signals`, and only hits the live Reddit API when
the stored corpus is thin. If sentiment always falls back:

1. Verify `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` on the **worker** (the
   web app does not make Reddit API calls directly, but it enqueues
   `reddit_fetch` jobs that the worker processes)
2. Check the `jobs` table for `reddit_fetch` jobs — are they being claimed and
   completed by the worker?
3. Check `reddit_posts` table: `select count(*) from reddit_posts;` — if zero,
   the worker hasn't ingested anything yet
4. Check Reddit app is set to type "script"
5. Look for 429 (rate limit) errors in worker logs
6. The web app's sentiment API also enqueues a per-school fetch job when the
   stored corpus is thin — check for errors in those jobs

### Embeddings not producing semantic clusters

Embeddings are now multi-provider. Without a configured provider key, the embed
and cluster jobs skip entirely (posts stay unembedded, no theme clusters are
written). This is by design to prevent non-semantic vectors from polluting
the corpus.

1. Verify `EMBEDDINGS_PROVIDER` and the corresponding key are set on the
   **worker** (not on Vercel):
   - `google` → `GOOGLE_AI_API_KEY` (recommended, free tier)
   - `pinecone` → `PINECONE_API_KEY`
   - `openai` → `EMBEDDINGS_API_KEY` (legacy)
2. Check worker logs for `[embeddings] no provider configured` or
   `[embeddings] provider=google` messages
3. If the key is set but calls fail, check for API errors (401, 429) in worker logs
4. Once the key is working, enqueue an embed job: `bun run worker/cron.ts daily`
   (or `bun worker:once` in scheduled mode)
5. Verify vectors are being written with provenance:
   ```sql
   select count(*) as total,
          count(embedding) as embedded,
          count(embedding_provider) as with_provenance
   from reddit_posts;
   ```

### AI evidence briefs not appearing

Evidence briefs are generated by the `brief` worker job, which runs only when a
school has 3+ posts AND the corpus has changed since the last brief. Briefs are
cached in the `school_briefs` table and shown on school report pages.

1. Verify `GOOGLE_AI_API_KEY` (or `AI_AGENT_API_KEY`) is set on the **worker**
2. Check that the `brief` job type exists (migration 0011 must have run)
3. Check `school_briefs` table: `select school_id, generated_at from school_briefs order by generated_at desc limit 10;`
4. Check `jobs` table for `brief` jobs: `select status, error from jobs where type = 'brief' order by created_at desc limit 10;`
5. The brief agent uses `gemini-3.1-flash-lite` by default — check for API errors if briefs fail
6. Briefs only generate for schools with 3+ stored Reddit posts — check `select school_id, count(*) from reddit_posts group by school_id having count(*) >= 3;`

### Jobs board posts not appearing

1. Check that migration 0008 ran (the `board_posts` table must exist)
2. Verify the poster is signed in (posts require auth)
3. Check if the post was auto-expired: `select status, expires_at from board_posts order by created_at desc limit 5;`
4. Check if the post was flagged and removed: `select * from board_post_flags order by created_at desc limit 10;`
5. Posts expire after 60 days automatically via the daily cron

### Comparison tray not persisting

The compare tray uses `localStorage` (key: `si.compare-tray`). If it is not
persisting:
1. Check browser localStorage is not disabled (private mode, etc.)
2. The tray is limited to 3 schools max
3. Clearing browser data resets the tray
