# Active Context: Staffroom Intel

## Current State

**App Status**: ✅ MVP + Expansion foundation built

Staffroom Intel is an international teacher job-intelligence tool. The MVP (paste-a-link verdict, salary data, purchasing power, Reddit sentiment) is now extended with a persistent, user-driven platform layer covering all 7 planned expansion areas.

## What's Built

### Core Features (MVP)
- **Paste-and-analyze flow** (`/`): paste a jobsite URL → parser extracts school, role, salary → routes to school report
- **Job-board parser** (`src/lib/parser/jobLink.ts`): tes/grc/teacherhorizons/schrole/eslcafe
- **Salary verdict engine** (`src/lib/analysis/salary.ts`)
- **Purchasing power tool** (`/purchasing-power`)
- **Reddit sentiment** (live + fallback)
- **Schools browse** (`/schools`) + per-school report (`/school/[slug]`)

### Expansion (this session — all 7 areas)
- **Area 1 — Foundation (Supabase)**: SQL migration (`supabase/migrations/0001–0004`), typed row types (`src/lib/db/types.ts`), loose Supabase clients (`src/lib/db/supabaseClients.ts`) with **TSV fallback** when unconfigured, async repository (`src/lib/db/repo.ts`), jobs queue (`src/lib/db/queue.ts` + `claim_next_job` RPC), seed + parity scripts (`scripts/`), Supabase Auth (email magic-link + Google) via `AuthProvider`/`AuthButton`.
- **Area 7 — Background ops**: Railway worker (`worker/index.ts`) draining the queue via `FOR UPDATE SKIP LOCKED`, all 8 job handlers (`worker/jobs/`), cron scheduler (`worker/cron.ts`), Dockerfile + package.json.
- **Area 4 — Semantics**: pgvector embeddings (`src/lib/ai/embeddings.ts`, `set_post_embedding` RPC), Reddit ingest (`src/lib/ai/redditIngest.ts`), theme clustering (`src/lib/ai/clustering.ts`), cluster-aware sentiment (`getClusteredThemes`).
- **Area 5 — Turnover**: board scraper (`src/lib/scraper/boardScraper.ts`), baselines + signal correlation (`src/lib/analysis/turnover.ts`).
- **Area 6 — Currency parity**: FX module (`src/lib/finance/currency.ts`), `/api/fx`, `CurrencyProvider` + picker in nav, USD canonical with display-time conversion.
- **Area 2 — Household + TANE**: presets + cost drivers (`src/lib/analysis/household.ts`), TANE engine (`src/lib/analysis/tane.ts`), `/api/tane`, `TanePanel` on school report.
- **Area 3 — Bounty/self-report**: submissions library (`src/lib/submissions.ts`), reputation RPC + profile trigger (`0004`), `/submit` page, `/bounties` + leaderboard, `/api/bounties`.

## Architecture Notes

### Supabase + TSV fallback
- App runs on the in-memory TSV dataset when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are absent (sandbox/dev). Flip on deploy.
- Supabase clients are loosely typed (row types asserted at read boundaries) to keep insert/update portable across supabase-js versions; the `Database` type is defined for reference.
- RLS: public read on approved/aggregate; self-write on submissions; moderator write on approvals/bounties.

### Worker
- Vercel (web) + Supabase (DB/Auth) + Railway worker. Worker uses service-role (bypasses RLS). Reddit + embeddings creds live on the worker.

## File Structure (additions)

```
supabase/migrations/        0001_init, 0002_claim_job_rpc, 0003_set_embedding_rpc, 0004_reputation_and_profile_trigger
scripts/                    seed.ts, parity-check.ts
worker/                     index.ts, cron.ts, Dockerfile, package.json, jobs/*.ts
src/lib/db/                 types.ts, supabaseClients.ts, repo.ts, queue.ts
src/lib/ai/                 embeddings.ts, redditIngest.ts, clustering.ts
src/lib/scraper/            boardScraper.ts
src/lib/analysis/           household.ts, tane.ts, turnover.ts
src/lib/finance/            currency.ts
src/lib/config/             jobs.ts
src/lib/submissions.ts
src/app/api/                tane/, fx/, bounties/
src/app/submit/page.tsx, src/app/bounties/page.tsx
src/components/             AuthProvider, AuthButton, CurrencyProvider, TanePanel
.env.example
```

## Session History

| Date | Changes |
|------|---------|
| 2026-07-09 | Built Staffroom Intel MVP |
| 2026-07-09 | Expansion: Supabase foundation (Area 1), Railway worker + queue (Area 7), pgvector semantics (Area 4), turnover monitor (Area 5), currency parity (Area 6), household + TANE (Area 2), bounty/self-report (Area 3). Typecheck + lint clean. Build blocked in sandbox only by Google Fonts network access (pre-existing, unrelated). |

## Pending / Next
- Deploy: set Supabase env vars, run `0001–0004` migrations, `bun db:seed`, `bun db:parity`, deploy worker to Railway with REDDIT_*/EMBEDDINGS_* creds.
- Cutover read paths from TSV to Supabase (repo.ts ready; UI still on sync TSV for now).
- Moderation queue UI + role-gated approve route (logic in `submissions.ts`).
- Wire `SentimentPanel` to `getClusteredThemes` when Supabase live.
