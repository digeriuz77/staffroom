# Plan: Staffroom Intel Expansion (Data, Auth, Semantics, Turnover, Bounty)

## Goal

Expand the existing Staffroom Intel MVP (Next.js 16, static 619-record salary dataset, paste-a-link verdict, Reddit sentiment, purchasing-power tool) into a persistent, user-driven platform: household-aware total-package analysis, semantic Reddit analysis, turnover estimation, currency parity, and a reputation-based bounty/self-reporting system.

## Locked Decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Auth + DB | **Supabase** (Postgres + Auth + RLS) |
| 2 | Deployment | **Vercel (web) + Supabase (DB/Auth) + Railway worker** draining a Supabase `jobs` queue |
| 3 | Household model | **Composable parameters** (adults, earningAdults, children+ages) + presets (Single / Teaching couple / Trailing-spouse couple / Family) |
| 4 | Package valuation | **TANE (Total Annual Net Equivalent, USD)** + visible breakdown; face-value cash allowances, local-market in-kind |
| 5 | Reddit semantics | **pgvector embeddings + clustering** |
| 6 | Turnover | **Posting frequency + sentiment correlation**, all 5 parser sources (tes, GRC/Search Associates, Teacher Horizons, Schrole, ESL Cafe) |
| 7 | Currency | **USD canonical in DB**, display-time FX with user-selected display currency |
| 8 | Bounty | **Reputation + verification tiers**, no money |

## Scope Boundaries (In / Out)

**In scope:** Supabase schema + migration of existing data; household/TANE engine; bounty/self-report; pgvector semantic pipeline; turnover scraper; currency display; Railway queue worker.

**Out of scope (noted, not blocking):** monetary bounty payments; non-Reddit sources (Glassdoor/Facebook/Instagram) beyond cached stubs; mobile apps; multi-tenant/white-label; real-time streaming. Open questions at the end.

## Data Model (canonical, USD)

All monetary values stored as USD. FX applied only at render time.

- `profiles`: user_id, display_currency (ISO), household JSON `{adults, earningAdults, children:[{age, schoolAge}]}`, reputation_points
- `schools`: slug (existing derivation), name, city, country, region, lat/lng (nullable)
- `salary_records`: school_id, role, currency, gross_annual, net_annual_usd, tax_regime, source (tsv_seed|user_submit), submitter_id, trust_tier (unverified|email|school), status (pending|approved|rejected), submitted_at, package JSON `{base,housing,flights,fees,gratuity,relocation,healthcare,bonus}`, tenure_years, management_role (bool)
- `tane_components`: per salary_record, normalized annual USD per component with `valuation_basis` (face|market) + provenance note
- `col_items`: city, item_key, value_usd, source, submitted_at, submitter_id, trust_tier
- `reddit_posts`: post_id, school_id (nullable/fuzzy), subreddit, title, body, created_at, fetched_at, embedding VECTOR(1536)
- `theme_clusters`: cluster_id, school_id (nullable), theme_label, summary, post_count, sentiment_score, window_start, window_end
- `job_postings`: source, school_id (fuzzy then resolved), title, posted_at, first_seen_at, raw_url, hash
- `posting_baseline`: school_id, window, avg_posts, computed_at
- `turnover_signals`: school_id, signal_strength, posting_delta, sentiment_shift, computed_at
- `bounties`: id, scope (school_id|country|role), kind (salary|col|management|benefits|tenure), reward_points, status (open|filled), filled_by
- `jobs`: id, type (reddit_fetch|embed|cluster|scrape|baseline|turnover|fx), payload, status (queued|running|done|failed), attempts, locked_at, completed_at, error
- `fx_rates`: currency, rate_to_usd, fetched_at

RLS: users read all approved aggregate data; write only own `salary_records`/`col_items`/`profile`; admins/moderators write approval + `bounties`.

---

## Area 1 — Foundation (Supabase + Auth + Migration)

**Status: Not started**

- [ ] 1.1 Create Supabase project; enable pgvector extension (`create extension vector`).
- [ ] 1.2 Write SQL migration: tables above (without seed data), indexes on `salary_records(school_id)`, `reddit_posts(school_id)`, `jobs(status)`, HNSW index on `reddit_posts.embedding`.
- [ ] 1.3 Write RLS policies: public read on approved records; self-write on submissions/profile; moderator write on approvals/bounties.
- [ ] 1.4 One-time seed script: parse existing `src/lib/data/salaryRaw.ts` (619 rows) → insert `salary_records` with `source=tsv_seed`, `trust_tier=email` (treat seed as baseline-trusted), derive `schools` table.
- [ ] 1.5 Seed `col_items` from existing `costOfLiving.ts` (60 cities).
- [ ] 1.6 Auth: enable Email (magic link) + Google OAuth providers in Supabase; add `@supabase/ssr` (or auth-helpers for Next 16) to the Next app.
- [ ] 1.7 Refactor data layer: add `src/lib/db/supabaseServer.ts` (service-role client) + `supabaseBrowser.ts` (user client); create repository functions replacing direct TSV reads (`getSalaryRecords`, `getSchool`, `searchSchools`). Keep TSV modules as fallback behind a feature flag during rollout.
- [ ] 1.8 Env/secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` on Vercel + Railway worker; `REDDIT_*`, `EMBEDDINGS_API_KEY` on worker only.
- [ ] 1.9 Verify: school report + browse pages render from Supabase with identical numbers to current TSV; write a parity check script comparing aggregate medians before/after migration.

## Area 2 — Household Archetypes + TANE Engine

**Status: Not started**

Depends on: Area 1 (DB), Area 7 (FX for display).

- [ ] 2.1 Define household TypeScript type + presets in `src/lib/types.ts`: `Single`, `TeachingCouple` (2 adults, 2 earners), `TrailingSpouseCouple` (2 adults, 1 earner), `Family` (parameterized children).
- [ ] 2.2 Derive cost drivers from household: `bedrooms = ceil(adults/2) + ceil(schoolAgeChildren/2)`; `flightPersons = adults + children`; `feeChildren = children filtered by schoolAge`.
- [ ] 2.3 Build `src/lib/analysis/tane.ts`: `computeTANE(salaryRecord, household)` → per-component annual USD (base net, housing face-or-market, flights = persons × freq × fare, fees per child × grade tier, gratuity accrued, relocation amortized, healthcare premium, bonus/PD). Return TANE total + breakdown with `valuation_basis` + provenance per component.
- [ ] 2.4 Extend `buildSalaryReport` to accept household and emit TANE distribution percentiles (replace/extend base-salary-only verdict). Verdict tiers re-derived on TANE percentile + savings rate.
- [ ] 2.5 UI: household picker (preset buttons → editable params) on school report + purchasing-power tool; TANE breakdown card with provenance + valuation basis badges; show both "base net" and "TANE" for transparency.
- [ ] 2.6 Default market-rent + grade-tier-fee reference tables (seed minimal set; expand via bounty in Area 3).
- [ ] 2.7 Verify: for a teaching-couple preset, TANE reflects 2 earners + family-scaled housing/flights/fees; snapshot a known school and assert TANE > base net when housing is in-kind.

## Area 3 — Bounty / Self-Reporting (Reputation Model)

**Status: Not started**

Depends on: Area 1 (Auth + DB + RLS).

- [ ] 3.1 Submission forms: salary (+ full package fields), management salary, COL items, benefits, tenure — write to `salary_records`/`col_items` with `source=user_submit`, `trust_tier` default `unverified`, `status=pending`.
- [ ] 3.2 Trust tier logic: `email` on verified email (auto from Supabase Auth), `school` on moderator approval; UI badges reflect tier on every record/card.
- [ ] 3.3 Reputation: award points on approval (school-tier > email > unverified), leaderboard page, profile reputation total. Deduct/no-award on rejection.
- [ ] 3.4 Bounties: admin/moderator creates `bounties` for data gaps (school/region/role with no or stale data); "Open Bounties" page; on approved submission matching a bounty, mark `filled` + bonus points.
- [ ] 3.5 Moderation queue UI (mod role): review pending submissions, escalate trust tier, reject with reason.
- [ ] 3.6 Data-gap detection job (queued): compute schools/regions with < N approved records or stale > 12mo; auto-suggest bounties for moderator confirmation.
- [ ] 3.7 Verify: submit a record as a user → appears pending → approve as mod → reputation awarded → reflects in aggregate school stats (pending records excluded from public percentiles).

## Area 4 — Semantic Analysis (pgvector Embeddings + Clustering)

**Status: Not started**

Depends on: Area 1 (pgvector), Area 7 jobs (worker).

- [ ] 4.1 Embeddings client (`src/lib/ai/embeddings.ts`): default `text-embedding-3-small` (1536-dim) behind an interface so provider is swappable; batch posts per request; store vectors in `reddit_posts.embedding`.
- [ ] 4.2 Fetch job (queued `reddit_fetch`): use existing `src/lib/reddit/client.ts`; for configured subreddits, fetch posts since last cursor, upsert into `reddit_posts` with fuzzy `school_id` match (reuse jobLink fuzzy matcher logic).
- [ ] 4.3 Embed job (queued `embed`): embed new/updated posts lacking vectors.
- [ ] 4.4 Cluster job (queued `cluster`): per school (and global), run HNSW/k-means over embeddings within a time window; assign `theme_label` (Pay, Management, Housing, Workload, Turnover, Culture, Other) via nearest-centroid to seeded theme vectors (or keyword-init then refine); compute cluster `sentiment_score` (lexicon baseline) + LLM summary optional.
- [ ] 4.5 Replace/extend `buildSentimentReport` to surface theme clusters + counts + sentiment + representative posts instead of raw post list; provenance badge retained.
- [ ] 4.6 `SentimentPanel` rewrite: theme chips with counts/sentiment, expandable representative posts, trend over windows.
- [ ] 4.7 Verify: ingest a small known Reddit set → clusters form → themes tagged → school report shows themed sentiment with correct provenance.

## Area 5 — Turnover Estimation (Posting Frequency + Sentiment Correlation)

**Status: Not started**

Depends on: Area 4 (sentiment clusters), Area 1 jobs.

- [ ] 5.1 Scraper job (queued `scrape`): poll the 5 parser sources per school (or region), insert/dupe-check `job_postings` by hash + first_seen_at.
- [ ] 5.2 Baseline job (queued `baseline`): compute per-school rolling posting frequency vs its own historical baseline (`posting_baseline`); flag deltas.
- [ ] 5.3 Turnover job (queued `turnover`): correlate posting delta with clustered sentiment shift in Management/Workload/Compensation themes (from Area 4) → write `turnover_signals` with strength + contributing factors.
- [ ] 5.4 Turnover section on school report: signal strength indicator + rationale (posting spike + which sentiment themes moved) + caveat about estimation.
- [ ] 5.5 Respect robots.txt + per-source rate limits; store `raw_url` + source for audit.
- [ ] 5.6 Verify: synthetic posting spike for a test school + injected sentiment shift → signal fires with documented rationale.

## Area 6 — Currency Parity (Display-Time FX)

**Status: Not started**

Depends on: Area 1 (profile.display_currency).

- [ ] 6.1 FX job (queued `fx`): refresh `fx_rates` from a free source (exchangerate.host or open.er-api) on a schedule; fail-soft to last-known rates.
- [ ] 6.2 Profile setting: user display currency picker; store on `profiles.display_currency`.
- [ ] 6.3 Render-time formatter: all USD-canonical values pass through `formatCurrency(amountUsd, displayCurrency)` applying `fx_rates`; keep "USD canonical" badge; show original-currency where the record has it.
- [ ] 6.4 Comparisons/leaderboards stay USD-canonical internally; only the displayed number is converted, so cross-school parity is consistent.
- [ ] 6.5 Verify: switch display currency → all monetary displays convert consistently; leaderboard ordering unchanged (since ordering is on USD).

## Area 7 — Background Ops (Railway Worker + Queue)

**Status: Not started**

Depends on: Area 1 (jobs table).

- [ ] 7.1 Stand up Railway worker service: long-running Node/Bun process with its own `package.json`/Dockerfile in `/worker` (or `/src/worker`), sharing `src/lib` types where feasible.
- [ ] 7.2 Queue drain loop: poll `jobs` (status=queued), `FOR UPDATE SKIP LOCKED` claim, dispatch by `type`, update status/`locked_at`/`attempts`; backoff + dead-letter on repeated failure.
- [ ] 7.3 Job handlers: reddit_fetch, embed, cluster, scrape, baseline, turnover, fx, gap-detect (Areas 3–6).
- [ ] 7.4 Cron schedules (system cron on Railway, or Railway cron): e.g., reddit_fetch hourly, embed on-demand/queue-triggered, cluster daily, scrape daily, baseline+turnover weekly, fx daily, gap-detect weekly.
- [ ] 7.5 Vercel routes: thin endpoints to enqueue jobs (e.g., "analyze this school now" → queue fetch+embed+cluster) and read results; no heavy work in serverless.
- [ ] 7.6 Reddit API deployment: store `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` as Railway env vars; document the OAuth `client_credentials` setup (already in `reddit/client.ts`); ensure user-agent is versioned + contact-URL set per Reddit policy.
- [ ] 7.7 Observability: `jobs` table is the source of truth — admin view of queue depth, failures, last-run timestamps; minimal structured logging.
- [ ] 7.8 Verify: enqueue a fetch job → worker drains → posts land in Supabase → downstream embed/cluster jobs trigger.

---

## Sequencing (suggested)

1. **Area 1** (foundation) — gates everything.
2. **Area 7** (worker + queue) — gates 3–6's jobs.
3. **Area 6** (FX) — small, unblocks display polish.
4. **Area 2** (household + TANE) — high user value, no worker dependency.
5. **Area 3** (bounty/self-report) — grows the dataset feeding Areas 2/4/5.
6. **Area 4** (semantics) — feeds Area 5.
7. **Area 5** (turnover) — depends on 4.

## Progress Tracking Protocol

- The "Status" line under each Area is updated as work progresses: `Not started` → `In progress` → `Done`.
- Each action checkbox is marked `[x]` when complete; keep partially-done items as `[ ]` and note blockers inline.
- After each Area completes, update `.kilocode/rules/memory-bank/context.md` (Recently Completed + Session History) per repo rules.
- Status table below is the roll-up; keep it in sync with the per-Area checkboxes.

| Area | Status |
|------|--------|
| 1 Foundation (Supabase + Auth + Migration) | Not started |
| 2 Household + TANE | Not started |
| 3 Bounty / Self-report | Not started |
| 4 Semantic analysis (pgvector) | Not started |
| 5 Turnover estimation | Not started |
| 6 Currency parity | Not started |
| 7 Background ops (Railway) | Not started |

## Risks & Mitigations

- **Seed-data trust inflation:** seeding 619 records as `email`-tier could skew early stats. Mitigation: tag seed as a distinct `trust_tier=seed`/`source=tsv_seed`; let reports filter by tier.
- **pgvector cost/latency at scale:** embeddings API calls + HNSW build may grow. Mitigation: batch embeds, cap clusters per run, time-window clustering.
- **Scraper fragility / ToS:** job-board HTML changes or ToS limits. Mitigation: per-source rate limits, robots.txt respect, hash-based dedupe, store raw_url for audit, prefer RSS/API where available.
- **Reddit rate limits:** free tier ~100 req/10min. Mitigation: queue-gated fetch, cursors, cached results in DB.
- **FX drift / inconsistency:** display-time single rate can stale. Mitigation: daily refresh + "rate as of" timestamp; comparisons always USD-canonical internally.
- **RLS correctness:** mis-policies leak data. Mitigation: write policy tests; default-deny; moderator-only approval paths.

## Validation Plan (rollout/migration)

- Parity check: aggregate medians/p25/p75 from Supabase vs current TSV within tolerance before cutting over reads.
- Feature flag during Area 1 cutover so reads can fall back to TSV if Supabase degrades.
- Per-Area verify steps above as acceptance gates.
- End-to-end scenario: new user → Google login → set display currency + household preset → view school report (TANE, themed sentiment, turnover signal, converted currency) → submit a salary (pending) → moderator approves → record appears in aggregates → reputation awarded → data-gap bounty auto-suggested for an empty school.

## Open Questions (non-blocking, to resolve during implementation)

- **Embeddings provider/model** — default `text-embedding-3-small`; interface allows swap.
- **Reddit subreddit scope** — configurable list (e.g., r/InternationalTeachers, r/InternationalSchools, r/tefl).
- **Moderation flow** for `school` trust tier (evidence requirements, reviewer pool).
- **FX source + refresh cadence** (daily default) and graceful degradation.
- **Theme cluster seed centroids** — keyword-initialized then refined, or fully unsupervised.
