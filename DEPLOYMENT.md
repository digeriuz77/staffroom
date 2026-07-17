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

Features that require Supabase (auth, submissions, bounties, worker jobs) will
show a "not configured" notice but won't crash.

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
# Paste each migration file's contents in order: 0001 → 0005
```

Migration summary:

| File | Creates |
|------|---------|
| `0001_init.sql` | All tables, indexes, pgvector extension, HNSW index, RLS policies |
| `0002_claim_job_rpc.sql` | `claim_next_job()` function (FOR UPDATE SKIP LOCKED) |
| `0003_set_embedding_rpc.sql` | `set_post_embedding()` function (pgvector cast) |
| `0004_reputation_and_profile_trigger.sql` | `increment_reputation()`, auto-profile on signup |
| `0005_tax_rates_and_fx_seed.sql` | 90+ country tax rates + 90+ currency FX rates |

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
> worker only. The web app should never make Reddit/embedding API calls
> directly.

### 3.3 Deploy

```bash
vercel --prod
```

### 3.4 Verify

- Visit the deployed URL
- Paste a tes.com job link → should route to school report
- School report should show TANE panel, tax regime card, website health checker
- Sign in (email magic link) → should create a profile row automatically
- Submit a salary → should appear as pending

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
| `EMBEDDINGS_API_KEY` | OpenAI API key (optional — hash fallback exists) |
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
- [ ] School report renders with TANE, tax, sentiment panels
- [ ] Email magic link sign-in works
- [ ] Google OAuth sign-in works
- [ ] Salary submission → pending → moderator approve → reputation awarded
- [ ] Currency picker converts all displays
- [ ] Website health checker fetches a real school site
- [ ] Worker logs show queue draining (check Railway)
- [ ] `bun db:parity` passed before cutover
- [ ] Reddit posts appearing in `reddit_posts` table (check Supabase)
- [ ] FX rates populated in `fx_rates` table
- [ ] Open bounties auto-created by gap detection job

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

# Embeddings (optional — hash fallback exists)
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
| `profiles` | User settings (currency, household, reputation) | Self read/update |
| `schools` | 551 schools derived from salary records | Public read |
| `salary_records` | Salary + package data (seed + user-submitted) | Approved: public; Pending: owner/mod |
| `tane_components` | Per-record TANE breakdown (base/housing/flights/fees/etc.) | Via parent record |
| `col_items` | Cost-of-living data per city | Public read |
| `country_tax_rates` | 90+ countries: effective rate, social insurance, regime | Public read |
| `fx_rates` | 90+ currencies: rate_to_usd | Public read |
| `reddit_posts` | Reddit posts with pgvector embeddings (1536-dim) | Public read |
| `theme_clusters` | Semantic theme clusters per school + time window | Public read |
| `job_postings` | Scraped job listings for turnover monitoring | Public read |
| `turnover_signals` | Posting-delta × sentiment-shift correlation | Public read |
| `bounties` | Reputation-based data-gap bounties | Public read; Mod write |
| `jobs` | Queue table (drained by Railway worker) | Service-role only |

### Reference tables

| Table | Purpose |
|-------|---------|
| `market_rents` | Per-city market rent by bedroom count (TANE housing valuation) |
| `school_fee_tiers` | Per-school annual fees by grade tier (TANE fee valuation) |

---

## Operational Procedures

### Adding a new moderator

```sql
update profiles set role = 'moderator' where id = '<user-uuid>';
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

1. Verify `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` on the worker
2. Check Reddit app is set to type "script"
3. Look for 429 (rate limit) errors in worker logs
4. Test credentials: `curl -X POST https://www.reddit.com/api/v1/access_token ...`

### Embeddings using hash fallback (not semantic)

Means `EMBEDDINGS_API_KEY` is missing or calls are failing. The hash fallback
produces non-semantic vectors — clustering will still work but with lower
quality. Check worker logs for `[embeddings] provider failed` messages.
