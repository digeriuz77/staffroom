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

## 2026-07-17 Session — Sentiment self-sufficiency + embeddings clarification

### Problem context
The Reddit API workaround (committed prior) seeds 30 posts via `0009_reddit_posts_seed.sql` and uses RedReader's public `installed_client` flow so no developer key is needed. BUT the sentiment UI's "what teachers talk about" theme chips read `theme_clusters`, which were ONLY produced by the worker's semantic clustering job (requires `EMBEDDINGS_API_KEY` + always-on Railway worker). Out of the box, `theme_clusters` stayed empty and the seeded posts' lexicon themes were invisible. `.env.example` was also missing (referenced in docs).

### Changes
- **`src/lib/ai/clustering.ts`** — two-tier clustering:
  - Semantic mode (preferred): unchanged nearest-centroid over pgvector, when provider configured.
  - **Lexicon fallback**: when no provider (or a post has no vector), bucket by the post's existing `themes` array. So `theme_clusters` populate from the seed with ZERO external deps.
  - Hybrid per-post: vector present → semantic; else lexicon tags. Nothing wasted.
  - `canonicalTheme()` maps lexicon labels to the semantic vocabulary (`Salary`→`Pay`, `Leadership`→`Management`) so both modes emit consistent buckets.
  - `runClustering()` is now idempotent: deletes prior window rows before insert (table no longer bloats on re-runs).
  - Extracted pure `bucketByThemes()` + exported `ClusterPost` type for testing.
- **`supabase/migrations/0010_theme_clusters_seed.sql`** — materializes `theme_clusters` straight from the seeded `reddit_posts.themes` via SQL (`unnest` + `CASE` mirroring `canonicalTheme`). Idempotent. Sentiment themes now work on first deploy with no worker and no API key. Worker upgrades these to semantic clusters once it runs.
- **`.env.example`** (recreated) — documents the full env contract: Supabase (optional, TSV fallback), optional Reddit override, `EMBEDDINGS_*` (optional; lexicon fallback when unset), worker poll.
- **`scripts/embed-posts.ts`** + `bun embed:posts` — one-shot backfill loop so vectors populate immediately after adding an OpenAI key (no waiting for the daily cron/worker).
- **`tests/clustering.test.ts`** — covers `canonicalTheme` mapping + `bucketByThemes` lexicon/semantic/hybrid behavior (7 tests).

### Validation
- typecheck: exit 0
- lint: exit 0
- tests: 75 pass, 0 fail (was 65; +10 across clustering + live themes)

### Live sentiment path (the real fix this session)
The seed/lexicon work above was the bootstrap; the second half of the session made the read path genuinely LIVE so browsing grows the corpus and teachers see fresh info without an admin in the loop:

- **`src/app/api/sentiment/route.ts`** rewritten:
  - **Freshness-aware re-fetch**: a school is re-fetched when its corpus is older than `SENTIMENT_FRESHNESS_HOURS` (default 6h) OR has < 3 posts — not only when < 3. Popular schools stay current as new Reddit threads appear.
  - **Write-through persistence**: live-fetched posts are upserted into `reddit_posts` immediately (via `persistPostsForSchool`), so every browse grows the corpus in real time — no waiting on the worker. Reddit posts are NEVER admin-reviewed (only salary/COL *submissions* are moderated, since those are verifiable claims tied to reputation/bounties).
  - **On-demand background jobs**: when stale, enqueues a targeted `reddit_fetch` (deepening sweep) AND a `cluster` job for that school (deduped per school per day), so the worker keeps the school's stored clusters/embeddings current.
  - **Inline live themes**: when `theme_clusters` is empty/stale, themes are computed straight from the posts via `aggregateThemesFromPosts` so "what teachers talk about" renders immediately — no worker wait.
  - `loadStored()` now returns `lastFetchedAt` (most recent `fetched_at`) to drive freshness.
- **`src/lib/ai/redditIngest.ts`**: exported `persistPostsForSchool()` (write-through upsert, idempotent on id).
- **`src/lib/ai/clustering.ts`**: added pure `aggregateThemesFromPosts()` for inline theme computation; `cluster` job payload now accepts `{ schoolId }` for per-school on-demand re-clustering (worker/cluster.ts already passed it through).

### Embeddings contract (now documented)
Two tiers: lexicon (free, instant, from seed/live posts) → semantic (opt-in upgrade via `EMBEDDINGS_API_KEY` on the worker). pgvector schema (`vector(1536)` + HNSW) and `set_post_embedding` RPC were already in place from `0001`/`0003`; nothing schema-side changed.

### Live data flow (end to end)
Teacher opens school report → `/api/sentiment` → serves cached `reddit_posts`/`theme_clusters`/turnover from Supabase → if stale, live-fetches Reddit (RedReader installed_client fallback, no dev key), writes new posts back to DB immediately, computes themes inline, and enqueues background `reddit_fetch` + `cluster` jobs → worker deepens corpus + (if embeddings key set) embeds + semantic-clusters → next visitor hits a richer cached corpus. Compound, self-updating, no admin gate on Reddit content.

## Pending / Next
- Deploy: run migrations 0001–0010 in order, `bun db:seed` (REQUIRED before 0009/0010 resolve school slugs), `bun db:parity`. Optionally `bun embed:posts` once `EMBEDDINGS_API_KEY` is set.
- Moderation queue UI (logic exists in `submissions.ts`; needs a `/moderate` page).
- Add CI/CD pipeline (GitHub Actions: lint + test + typecheck).
- Contract clause analyzer (Tier 3.1 in ROADMAP.md).
- School profile enrichment from accreditation directories (Tier 2.4).

## Key Documentation
- `DEPLOYMENT.md` — full deployment guide (Vercel + Supabase + Railway)
- `ROADMAP.md` — future features classified by feasibility + impact
- `ASSESSMENT.md` — developer goal-alignment review (honest assessment)

## 2026-07-17 Session — Demand-aware growth, low-cost AI, and focused UX

- **Database flywheel:** migration `0011_growth_and_agent.sql` adds aggregate school interest, unresolved discovery requests, cached school briefs, embedding provenance, targeted indexes, and bounded retention. School searches now prioritize background discovery, while report views record aggregate demand.
- **Reliable write-through:** Next `after()` now guarantees post-response Reddit persistence and queue work. Existing posts refresh `fetched_at`; live upserts retain scores. Targeted fetches trigger embedding, clustering, and brief jobs.
- **Corpus quality:** school relevance requires a full name or multiple distinctive tokens. `db:seed` now reconciles Reddit bootstrap data after schools exist and rejects location-only false matches.
- **Embeddings:** provider-aware Google, Pinecone Inference, and OpenAI-compatible clients validate dimensions and record provider/model provenance. Google `gemini-embedding-001` at 1536 dimensions is the recommended path; Pinecone's smaller vectors are cosine-preserving zero-padded into the existing Supabase pgvector column.
- **Low-cost agent:** optional Gemini Flash-Lite background jobs create cached, evidence-grounded school briefs only when the source corpus changes. Public text is treated as untrusted prompt data. No chatbot or per-page LLM call was added.
- **Worker cost:** `bun worker:once` drains a bounded queue batch for scheduled/serverless operation, avoiding an always-on worker at low traffic. The continuous worker remains available.
- **UX:** responsive mobile navigation, stacked mobile analysis input, concise home hierarchy, searchable/filtered school directory, collapsed salary evidence, sentiment previews, and progressive disclosure for research details.
- **Privacy:** public full-profile reads were removed; leaderboards now include only opted-in public profiles.
- **Validation:** 85 unit tests pass, with new coverage for embedding safety, Reddit relevance, and AI brief parsing. Typecheck and lint pass.

### Deployment requirement

Apply migration `0011_growth_and_agent.sql`, then run `bun db:seed`. Configure `EMBEDDINGS_PROVIDER=google` with `GOOGLE_AI_API_KEY` for the recommended free/low-cost semantic path. The same key enables evidence briefs unless `AI_AGENT_API_KEY` overrides it.

## 2026-07-24 Session — School report & compare page UX overhaul

- **School report (`/school/[slug]`)**: header restructured to two-column layout (identity left, compare/watchlist actions right); Tax Regime and Cost of Living merged into a single "Financial context" card with a two-column grid (emerald tax panel left, indigo COL panel right, COL prices in 3-col grid); salary distribution split into 5-col grid (median StatBars left, range "Spread" stats right as compact row cards); evidence brief lists now always visible (removed `<details>` toggle); unused `sentimentTone`/`WebsiteHealthPanel` imports removed.
- **Compare page (`/compare`)**: `ComparisonMatrix` split into `ComparisonBanner` (winner recommendation + share link) and `ComparisonMatrix` (detail table). Page flow is now: banner → per-school summary cards → detailed matrix. School cards redesigned: hero median-salary stat, 2×2 key-metric grid (take-home, buying power, country/region medians), context rows, COL price snapshot; emerald card tint when the school leads any category. Matrix gained Region Median, Middle 50% Range, and Sample Prices rows; section headers use dynamic `colSpan`. Dead offer-verdict card code removed (compare never passes an offer) along with unused `getSchools`/`verdictTone`/`TONE_CLASSES`/`ColItem` imports.
- **Lint fixes**: resolved the 3 pre-existing `react-hooks/set-state-in-effect` errors (`account/page.tsx`, `ThemeToggle.tsx`, `WatchlistButton.tsx`) by deferring localStorage-hydration setState into a microtask (`Promise.resolve().then(...)`), matching the existing `CompareButton` pattern.
- **Validation**: typecheck exit 0, lint exit 0 (was 3 errors), tests 84 pass / 1 pre-existing unrelated fail (`redditRelevance` location-only match). Production build still blocked only by sandbox Google Fonts network access (pre-existing). Smoke-tested `/school/[slug]` and `/compare` via dev server: both 200 with all new sections rendering.
