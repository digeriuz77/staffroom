# Staffroom Intel — Developer Assessment & Goal Alignment Review

An honest, experienced-developer review of whether the current codebase delivers
on the product's stated goals, where it falls short, and what matters most next.

---

## The Stated Goals (from brief.md)

> A tool that helps international school teachers evaluate job offers with real
> data instead of marketing language. A teacher pastes a job link and gets an
> aggregated overview of how the salary compares, what the purchasing
> power/savings look like, and what the social sentiment about the school is.

**Success metrics defined:**
1. Real salary dataset that rivals competitors (mystool's 700 verified salaries)
2. Instant, actionable verdict on any pasted offer
3. Clear purchasing-power comparison so teachers understand real value

---

## Scorecard: Goal by Goal

### Goal 1: Real salary dataset that rivals competitors

**Status: Mostly met. Below target on volume, ahead on depth.**

| Aspect | Assessment |
|--------|------------|
| Record count | **619 seeded records** — essentially matches mystool's 700. But this is seed data, not organic. The bounty/self-report system is built but unproven at generating new volume. |
| Data depth | **Ahead of competitors.** TANE (Total Annual Net Equivalent) captures housing, flights, fees, gratuity, healthcare, bonus — far richer than base-salary-only platforms. Household archetype scaling (single / couple / family) is genuinely novel. |
| Data freshness | **At risk.** 619 records are static TSV. No mechanism yet for automatic refresh of salary data — only user submissions (which need moderator review). Stale data erodes trust. |
| Trust model | **Well-designed.** Four-tier trust (seed < unverified < email < school) with RLS enforcement and moderator review. Provenance is tracked. This is the right architecture. |

**Verdict:** The dataset *exists* and is *structured better* than competitors,
but the gap between "seeded baseline" and "living, growing dataset" is the
single biggest risk to Goal 1. The bounty system is the bet — it needs real
users to validate.

### Goal 2: Instant, actionable verdict on any pasted offer

**Status: Strongly met. This is the product's best feature.**

The paste-a-link flow works well:
- Parser handles tes.com, Teacher Horizons, Search Associates, Schrole, ESL Cafe
- Routes to a school report with verdict tier (Strong offer / Competitive / Fair / Below market)
- Shows percentile placement on a histogram with the offer highlighted
- Tax regime card immediately surfaces take-home implications
- Role inference predicts what the management role actually involves day-to-day

**What's missing for "actionable":**
- No explicit "should I take this?" recommendation — the verdict is implicit
  (percentile + tone) but a less data-literate user might want a clearer signal
- No comparison to their *current* package (only to the school's existing data)
- The verdict assumes the parsed salary is correct — no "does this look right?"
  sanity check against the distribution

**Verdict:** The core flow delivers. The paste → verdict experience is fast and
information-dense. Minor UX refinements would push this from "strongly met" to
"best-in-class."

### Goal 3: Clear purchasing-power comparison

**Status: Met, with room to deepen.**

The purchasing-power tool works:
- 60 cities with COL indices (London = 100 baseline)
- Salary converted to real spending power
- Granular items (milk, beer, meal, gym, taxi) for street-level comparison
- Currency display conversion (USD canonical, display-time FX)
- Tax rates applied per country (90+ countries researched)

**What limits it:**
- COL data is static seed (Numbeo-derived). No user-contributed COL yet, despite
  the bounty system being capable of it
- The "savings rate" calc is net minus COL median — but COL median is a
  single-person proxy. A family's costs scale non-linearly (the household model
  exists in TANE but not in the purchasing-power tool)
- No scenario modeling ("what if housing isn't provided?")

**Verdict:** The comparison is genuinely useful and ahead of what most
competitors offer. But the disconnect between the TANE household model and the
purchasing-power tool's single-person COL is a conceptual gap users will notice.

---

## Beyond the Brief: What Was Built That Wasn't Asked For

The codebase has grown substantially beyond the original brief. Some additions
are clear wins; others add complexity without proportional value.

### Wins (keep and double down)

| Feature | Why it's a win |
|---------|----------------|
| **TANE engine** | Transforms base-salary comparison into total-package comparison. This is the defensible moat — no competitor does this. |
| **Role inference** | Predictive role analysis (admin vs teaching split, responsibilities, pain points) directly serves the "what will my day actually look like?" question. Genuinely innovative. |
| **Website health checker** | Inspector-style signals are a trust signal competitors completely lack. Low effort, high differentiation. |
| **Platform registry** | 37 sources catalogued with scraping feasibility metadata. This is infrastructure that compounds — every future data source plugs in. |
| **Tax rate reference data** | 90+ countries with effective rates researched. Immediate value for take-home estimation. |

### Concerns (revisit or trim)

| Feature | Concern |
|---------|---------|
| **pgvector semantic clustering** | Sophisticated but depends on (a) embeddings API cost and (b) enough Reddit volume per school to form meaningful clusters. For most schools, there may be 3-5 Reddit posts — clustering won't add much. The simpler lexicon sentiment may suffice for MVP. |
| **Turnover estimation** | The posting-frequency × sentiment correlation is clever but speculative. Without ground-truth turnover data to validate against, the "signal strength" number is uncalibrated. Risk: presenting a fabricated-precision metric. |
| **Worker complexity** | 8 job types, 3 cron schedules, queue management. This is a lot of operational surface area for a product that hasn't proven user traction yet. The worker could be dramatically simplified for launch. |

---

## Architecture Assessment

### What's done well

1. **TSV fallback pattern** — The app works with zero external setup. This is
   excellent for development velocity and demos. The `supabaseEnabled()` gate
   is clean.

2. **RLS-first security** — Row-level security policies are comprehensive and
   correct. Public reads on approved data, self-writes on submissions,
   moderator-gated approvals. This is the right model for user-contributed data.

3. **SSRF protection** — The `safeFetch` module blocks private IPs, metadata
   endpoints, and caps response size. This was caught and fixed before it became
   a vulnerability.

4. **Type safety** — Strict TypeScript throughout, 65 tests covering the
   critical paths (SSRF, currency math, role inference, tax rates). The test
   suite is a strong foundation.

5. **Separation of concerns** — Analysis logic (`src/lib/analysis/`), data
   access (`src/lib/db/`), and presentation (`src/components/`, `src/app/`) are
   cleanly separated. The TANE engine, role inference, and website health
   checker are all pure functions — testable and reusable.

### What needs attention

1. **Read path still uses sync TSV, not async repo.** The async repository
   (`src/lib/db/repo.ts`) is built but the pages still call the synchronous TSV
   functions directly (`getDerivedSchool`, `SALARIES`). This means the Supabase
   cutover is incomplete — user-submitted data won't appear in school reports
   until pages call `getSchoolBySlug()` (async) instead of
   `getDerivedSchool()` (sync TSV).

2. **N+1 patterns may exist elsewhere.** The `getSchools()` N+1 was fixed, but
   `getColNearest()` is called per-record inside `computeTANE()`, which itself
   is called per-school in listing contexts. Watch for this under load.

3. **No rate limiting on API routes.** `/api/analyze`, `/api/website-health`,
   and `/api/tane` all do server-side work (fetching external URLs, computing
   TANE) with no rate limiting. A malicious user could hammer these. Needs
   Upstash Redis or Vercel's built-in limits.

4. **Error states are inconsistent.** Some components show "Computing…"
   indefinitely on failure; others show a red error. The `TanePanel` handles
   this well (remounts on household change), but `SentimentPanel` and
   `WebsiteHealthPanel` could hang on network errors.

5. **No CI/CD pipeline.** Tests run manually. A GitHub Action running
   `bun lint && bun typecheck && bun test` on every PR would prevent regressions.

---

## The Brutally Honest Summary

**Does Staffroom Intel hit its goals?**

**Yes — for the core paste-a-link → verdict flow.** That experience is fast,
data-rich, and genuinely better than competitors. A teacher pasting a tes.com
link gets a verdict, percentile placement, tax implications, purchasing power,
sentiment, role preview, and website health in one view. That's a compelling
product.

**The risk is the data flywheel.** The product's long-term value depends on the
dataset growing beyond the 619 seed records. The bounty system, trust tiers,
and self-report flow are all built — but they're unproven. If users don't
submit, the dataset stagnates, and the product becomes a static reference tool
rather than a living intelligence platform.

**The over-engineering risk is real.** The pgvector clustering, turnover
estimation, and 8-job worker pipeline are sophisticated — arguably too
sophisticated for a product without proven user traction. A leaner MVP (TSV +
verdict + purchasing power + sentiment + submissions) would validate the core
thesis faster, then layer in the advanced analytics once there's data volume
to make them meaningful.

**What matters most right now (in order):**

1. **Cutover the read paths to Supabase** — so user submissions actually appear
2. **Get real users submitting data** — the bounty system is the bet; validate it
3. **Add the comparison view** (Tier 1.1) — the #1 missing user flow
4. **Add CI/CD** — protect what's been built
5. **Resist adding more analysis features** until there's data volume to justify them

The foundation is strong. The architecture is sound. The security posture is
good. The product just needs to prove its data flywheel works.
