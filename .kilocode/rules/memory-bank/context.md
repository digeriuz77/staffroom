# Active Context: Staffroom Intel

## Current State

**App Status**: ✅ MVP built and deployed

Staffroom Intel is an international teacher job-intelligence tool. A teacher pastes a job link and instantly sees how the salary compares to real verified data, what their purchasing power/savings look like, and what teachers say about the school.

## What's Built

### Core Features
- **Paste-and-analyze flow** (`/`): paste a jobsite URL → parser extracts school, role, salary → routes to school report
- **Job-board parser** (`src/lib/parser/jobLink.ts`): detects source (tes/grc/teacherhorizons/schrole/eslcafe), matches school via fuzzy token matching, extracts salary → normalizes to monthly USD (handles annual/monthly + currency FX)
- **Salary verdict engine** (`src/lib/analysis/salary.ts`): percentile vs country & region, net take-home, monthly savings, savings rate, COL-adjusted buying power, 4-tier verdict
- **Purchasing power tool** (`/purchasing-power`): salary slider, 2-city comparator, ranked leaderboard, everyday prices (milk/beer/meal/takeaway/gym/taxi)
- **Reddit sentiment** (live + fallback): real OAuth Reddit client with graceful static fallback
- **Schools browse** (`/schools`): grouped by region, median salary per school
- **Per-school report** (`/school/[slug]`): verdict header, distribution histogram, percentile bars, salary records table, COL card, sentiment panel

### Data Layer
- **619 real salary records** across **551 schools**, **111 countries** (TSV → parsed at runtime in `src/lib/data/salaryRaw.ts` + `schools.ts`)
- Salaries normalized to **monthly USD** (net = gross × (1 − taxRate))
- **60 cities** cost-of-living data (COL index vs London=100, buying power, 6 granular price items)
- Schools derived dynamically from salary records (slug = normalized school+city+country)

## Architecture Notes

### Reddit Integration
- Client: `src/lib/reddit/client.ts` — OAuth `client_credentials` grant, versioned user-agent (`staffroom-intel/1.0.0`), token caching, rate-limit awareness (429 handling), 8s timeouts
- **Env vars needed**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (not yet set → falls back to static sentiment)
- API route `/api/sentiment` returns live posts or falls back to curated static set (`src/lib/data/sentiment.ts`)

### Planned (per user direction)
- Background scraper → SQL DB as primary source, Reddit as confirmation layer
- Anonymous salary submission to grow dataset
- Glassdoor/Facebook signals via cached community content

## File Structure

```
src/
├── app/
│   ├── page.tsx                  # Home (paste flow)
│   ├── school/[slug]/page.tsx    # School report
│   ├── schools/page.tsx          # Browse by region
│   ├── purchasing-power/page.tsx # COL tool
│   ├── about/page.tsx
│   ├── not-found.tsx
│   └── api/
│       ├── analyze/route.ts      # POST job URL → parsed
│       ├── schools/route.ts      # GET search
│       ├── sentiment/route.ts    # POST school → Reddit + fallback
│       └── purchasing-power/route.ts
├── components/
│   ├── PasteLink.tsx             # Client: paste flow + manual search
│   ├── PurchasingPowerTool.tsx   # Client: COL calculator
│   ├── SentimentPanel.tsx        # Client: fetches live sentiment
│   ├── charts.tsx                # Histogram + StatBar
│   ├── icons.tsx                 # Source icons
│   └── SiteNav.tsx
└── lib/
    ├── types.ts                  # Monthly-USD data model
    ├── data/
    │   ├── salaryRaw.ts          # 619-row TSV constant
    │   ├── schools.ts            # TSV parser + school derivation
    │   ├── costOfLiving.ts       # 60 cities + purchasing power
    │   ├── sentiment.ts          # Static fallback posts
    │   └── geo.ts                # Country→region/code maps
    ├── analysis/
    │   ├── finance.ts            # stats, percentiles, histogram, formatUsd
    │   ├── salary.ts             # buildSalaryReport + verdict
    │   └── sentiment.ts          # buildSentimentReport
    ├── reddit/client.ts          # Real Reddit OAuth API
    ├── parser/jobLink.ts         # Job URL + salary parser
    └── tone.ts                   # Verdict/sentiment color tones
```

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-07-09 | Built Staffroom Intel MVP: real 619-record salary dataset, job-link parser, salary verdict engine, purchasing power tool, live Reddit sentiment with fallback, browse + report pages |
