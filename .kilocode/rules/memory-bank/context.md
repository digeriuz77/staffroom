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
| 2026-07-10 | Tax rates (90+ countries) + FX seed (90+ currencies); take-home estimator; tax card on school report. |
| 2026-07-11 | Role profiles (14 leadership roles) + inference engine; website health checker; expanded social sources (37-platform registry). |
| 2026-07-13 | Security review: SSRF guard (safeFetch), N+1 fix (loadRecordsBySchool), regex injection fix, error propagation in reputation/bounty flows. Aesthetic polish (glass design system). |
| 2026-07-14 | 65-test suite (safeFetch, websiteHealth, roleInference, currency, taxRates, platformRegistry). Minor fixes: clustering LIMIT, scraper date extraction. Created DEPLOYMENT.md, ROADMAP.md, ASSESSMENT.md. |
| 2026-07-17 | **Major security + pipeline + product overhaul.** See below. |

## 2026-07-17 Session — Security, Pipeline, and Product Overhaul

### Migrations
- **0007_security_lockdown_and_schema_fixes.sql**: Fixed RLS (submitters can no longer self-approve; col_items gets status + moderation); revoked public execute on worker RPCs; `reddit_posts.id` changed uuid→text (was blocking all Reddit ingest); `posting_baselines` unique constraint added; `salary_records.region` column added; school delete cascade→restrict + `merge_schools()` RPC; missing FK/filter indexes (pg_trgm for school search); jobs table autovacuum tuning + `prune_worker_tables()` retention.
- **0008_membership_and_board.sql**: Profile membership fields (profile_kind, school_id, bio, public_profile); `school_members` table (school rep verification); `board_posts` table (community jobs board with RLS); `board_post_flags` table (community moderation); `expire_board_posts()` RPC.

### Security fixes (Critical)
- C1: Salary self-insert/update now constrained to `status='pending'`, `trust_tier in ('unverified','email')`, `source='user_submit'`.
- C2: Dropped public-write policy on `country_tax_rates`.
- C3: Revoked `claim_next_job`/`set_post_embedding`/`increment_reputation` from anon/authenticated.
- C4: `col_items` now has `status` column + moderation flow.

### Pipeline fixes
- Reddit ingest: sweep mode now uses `fetchSubredditNew()` (was searching for subreddit name as a school) + resolves `school_id` from post text against the schools table.
- Embeddings: removed hash fallback (was poisoning the corpus with non-semantic vectors); `embedUnembeddedPosts()` no-ops without a provider; `parseVector()` added for pgvector JSON string normalization; clustering skips posts without real vectors.
- Sentiment API rewired to DB-first: reads stored `reddit_posts` + `theme_clusters` + `turnover_signals`; live Reddit only fills gaps; enqueues background `reddit_fetch` job when corpus is thin.
- `SentimentPanel` now renders theme clusters + turnover signal + "Tracked corpus" badge.

### Parser fixes
- `matchSchool()` now accepts a live school directory (Supabase mode) — community-added schools are matchable.
- Salary extraction: k-multiplier, year false-positive filtering, salary-context-aware candidate selection, range midpoints.
- Live FX rates from `loadFxRates()` instead of hardcoded table.
- `matchedSchoolId` returns the school slug (routing key) instead of the DB id.

### UX fixes
- `/manual` 404 eliminated: PasteLink fallback now switches to manual tab in-place with prefilled school query.
- Compare page rebuilt: card-based comparison (not table), persistent localStorage tray, array-param crash fixed, school search on compare page.
- `CompareTray` (floating bar) + `CompareButton` (school page) added to layout.
- Provenance badges now use the record's actual `trust_tier` (was hardcoded "seed").
- Footer added; AuthButton shows Account link when signed in.
- About page rewritten to reflect actual product (DB-first sentiment, trust tiers, board, comparison).
- Home page updated with board link + 4 feature cards.

### New features
- **Jobs board** (`/board`): list + detail + new post pages; API with honeypot, dwell-time token (HMAC), rate limiting (5/day), duplicate detection, community flagging (auto-remove at 3 flags).
- **Account/membership page** (`/account`): profile editing (name, kind, currency, bio, public profile), school affiliation (self-join, pending verification), reputation display, sign-out.
- Board post expiry + worker table pruning added to daily cron.

### Code hygiene
- Seed script made idempotent (delete-then-insert for seed rows).
- `db/types.ts` updated: `region` on SalaryRecordRow, `status` on ColItemRow, profile membership fields, `country_tax_rates`/`school_members`/`board_posts`/`board_post_flags` table types, new RPC signatures.
- `getSalaryRecordsForRegion` gracefully falls back when `region` column is absent (pre-0007 databases).

### Validation
- typecheck: exit 0
- lint: exit 0
- tests: 65 pass, 0 fail

## Pending / Next
- Deploy: run migrations 0001–0008 in order, `bun db:seed`, `bun db:parity`, deploy worker with REDDIT_*/EMBEDDINGS_* creds.
- Moderation queue UI (logic exists in `submissions.ts`; needs a `/moderate` page).
- Add CI/CD pipeline (GitHub Actions: lint + test + typecheck).
- Contract clause analyzer (Tier 3.1 in ROADMAP.md).
- School profile enrichment from accreditation directories (Tier 2.4).

## Key Documentation
- `DEPLOYMENT.md` — full deployment guide (Vercel + Supabase + Railway)
- `ROADMAP.md` — future features classified by feasibility + impact
- `ASSESSMENT.md` — developer goal-alignment review (honest assessment)
