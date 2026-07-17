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
└───────────┬──────────────┘        └──────────┬───────────────┘
            │                                  │
            │ enqueue job                      │ claim job (SKIP LOCKED)
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Railway Worker (always-on)                      │
│              ─────────────────────────────                   │
│   • Drains jobs queue (5s poll)                              │
│   • Reddit fetch → embed → cluster                           │
│   • Job-board scraper → baseline → turnover signals          │
│   • FX refresh, gap detection, reputation awards             │
│   • Board post expiry + worker table pruning                 │
│   • Redis NOT required — Postgres IS the queue               │
└─────────────────────────────────────────────────────────────┘
```

### Three deploy targets

| Target   | Platform  | What runs there                         | Cost (MVP) |
|----------|-----------|-----------------------------------------|------------|
| Web app  | Vercel    | Next.js 16 SSR + API routes             | Free tier  |
| Database | Supabase  | Postgres + Auth + pgvector + RLS        | Free tier  |
| Worker   | Railway   | Queue-draining background jobs          | ~$5/mo     |

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
- A **Railway** account (~$5/mo for always-on worker)
- A **Reddit** app (free, for the OAuth API)
- (Optional) An **OpenAI** API key for embeddings (text-embedding-3-small)

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
bun test        # 65 tests across 6 files
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
for f in supabase/migrations/0*.sql; do
  echo "Running $f..."
  psql "$DATABASE_URL" -f "$f"
done

# Option B: Supabase Dashboard → SQL Editor
# Paste each migration file's contents in order: 0001 → 0008
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

> **Important:** Migrations must be run in order. Migration 0007 alters
> `reddit_posts.id` from uuid to text and adds the `salary_records.region`
> column — without these, the Reddit ingest pipeline and region stats will
> silently fail. Migration 0008 adds the jobs board and membership tables.

### 2.3 Seed the Database

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

bun db:seed     # inserts 619 salary records, 551 schools, 60 COL items
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

> **Never** set `REDDIT_*` or `EMBEDDINGS_*` on Vercel — those belong on the
> worker only. The web app enqueues jobs (e.g. `reddit_fetch` when the stored
> sentiment corpus is thin) but does not make Reddit or embedding API calls
> directly. The service-role key on Vercel is needed for enqueueing and for
> server-side reads that bypass RLS (school directory, FX rates, etc.).

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
5. Set **Start Command**: `bun run worker/index.ts`

### 4.2 Environment Variables (Railway)

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service-role-key>` |
| `REDDIT_CLIENT_ID` | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Reddit app secret |
| `EMBEDDINGS_API_KEY` | OpenAI API key (required for semantic clustering — without it, embed/cluster jobs skip) |
| `EMBEDDINGS_MODEL` | `text-embedding-3-small` (default) |
| `WORKER_POLL_MS` | `5000` (optional, default 5s) |

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

### 4.5 Verify Worker

Check Railway logs after deploy:
```
[worker] started (poll every 5000ms)
[worker] claimed reddit_fetch abc123
[worker] done reddit_fetch abc123
[worker] claimed fx def456
[fx] updated 94 rates
[worker] done fx def456
[worker] queue idle @ ...
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

### Worker (Railway)

```env
# Supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Reddit API (free tier)
REDDIT_CLIENT_ID=<app-client-id>
REDDIT_CLIENT_SECRET=<app-secret>
REDDIT_SUBREDDITS=InternationalTeachers,InternationalSchools,TEFL

# Embeddings (required for semantic clustering — without it, jobs skip)
EMBEDDINGS_API_KEY=<openai-key>
EMBEDDINGS_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_MODEL=text-embedding-3-small

# Worker tuning
WORKER_POLL_MS=5000
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
EMBEDDINGS_API_KEY=
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

### Reference tables

| Table | Purpose |
|-------|---------|
| `market_rents` | Per-city market rent by bedroom count (TANE housing valuation) |
| `school_fee_tiers` | Per-school annual fees by grade tier (TANE fee valuation) |
| `posting_baselines` | Per-school posting-frequency baselines (turnover monitoring). Unique on `(school_id, window)` |

### Key schema notes (migration 0007+)

- `reddit_posts.id` is `text`, not `uuid` (Reddit post ids are strings like `abc123`).
- `salary_records` has a `region` column populated from the linked school's region.
- `salary_records.school_id` uses `ON DELETE RESTRICT` (not cascade) — use the `merge_schools(keep, remove)` RPC to deduplicate schools safely.
- `col_items` has a `status` column (`pending` / `approved` / `rejected`) with the same moderation flow as salary records.
- `profiles` has `profile_kind` (teacher / school_staff / recruiter), `school_id`, `bio`, and `public_profile` columns.
- `posting_baselines` has a unique constraint on `(school_id, window)` to support upserts.
- Worker RPCs (`claim_next_job`, `set_post_embedding`, `increment_reputation`, `merge_schools`, `prune_worker_tables`, `expire_board_posts`) are `service_role` only.

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
| Worker queue depth | Consistently > 100 | Scale worker replicas on Railway |
| Reddit rate limits | 429 errors in logs | Reduce fetch frequency; add backoff |
| Embeddings cost | > $10/mo | Switch to local embeddings or reduce batch frequency |
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

There is no longer a hash fallback. Without `EMBEDDINGS_API_KEY`, the embed
and cluster jobs skip entirely (posts stay unembedded, no theme clusters are
written). This is by design to prevent non-semantic vectors from polluting
the corpus.

1. Verify `EMBEDDINGS_API_KEY` is set on the **worker** (not on Vercel)
2. Check worker logs for `[embeddings] no provider configured` messages
3. If the key is set but calls fail, check for API errors in worker logs
4. Once the key is working, enqueue an embed job: `bun run worker/cron.ts daily`
5. Verify vectors are being written: `select count(*) from reddit_posts where embedding is not null;`

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
