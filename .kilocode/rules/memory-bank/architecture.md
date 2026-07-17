# System Patterns: Staffroom Intel

## Architecture Overview

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout + SiteNav
│   ├── page.tsx                # Home: paste-a-link flow
│   ├── school/[slug]/page.tsx  # Per-school report (server)
│   ├── schools/page.tsx        # Browse by region (server)
│   ├── purchasing-power/page.tsx
│   ├── about/page.tsx
│   ├── not-found.tsx
│   └── api/
│       ├── analyze/            # POST job URL → ParsedJob
│       ├── schools/            # GET search schools
│       ├── sentiment/          # POST school → Reddit + fallback
│       └── purchasing-power/   # GET city COL data
├── components/                 # React components
│   ├── PasteLink.tsx           # Client: paste + manual fallback
│   ├── PurchasingPowerTool.tsx # Client: COL calculator
│   ├── SentimentPanel.tsx      # Client: fetches live sentiment
│   ├── charts.tsx              # Histogram + StatBar
│   ├── icons.tsx
│   └── SiteNav.tsx
└── lib/
    ├── types.ts                # Monthly-USD data model
    ├── data/                   # Data layer (static → future SQL)
    ├── analysis/               # Verdict + sentiment engines
    ├── reddit/client.ts        # Real Reddit OAuth API
    ├── parser/jobLink.ts       # Job URL + salary parser
    └── tone.ts
```

## Key Design Patterns

### 1. Data Layer (Static → SQL migration path)
- Salary data stored as a TSV constant (`salaryRaw.ts`), parsed once at runtime into `SalaryRecord[]`
- Schools are **derived** from salary records (no separate school table) — this will map cleanly to SQL tables later
- All salaries normalized to **monthly USD** with a `netMonthlyUsd` field (gross × (1 − taxRate))
- COL data is a static array; `colNearest()` falls back country-level when a city isn't found

### 2. Salary Verdict Engine (`analysis/salary.ts`)
`buildSalaryReport(schoolId, job?)` returns:
- School/country/region stats (min, max, median, p25, p75, mean)
- Offer analysis: percentile vs country & region, net take-home, living cost, savings rate, buying power, verdict tier
- Verdict tiers: Strong offer / Competitive / Fair / Below market (driven by percentile + savings rate)

### 3. Reddit Sentiment (Live + Fallback)
- **Live**: `reddit/client.ts` uses OAuth `client_credentials`, versioned user-agent, token caching, rate-limit aware
- **Fallback**: `/api/sentiment` falls back to curated static posts (`data/sentiment.ts`) when Reddit has no results or credentials unset
- `SentimentPanel` (client) fetches and shows provenance badge (live / fallback / offline)
- Future: scraper writes to SQL DB; Reddit becomes confirmation layer

### 4. Server Components by Default
- Data-heavy pages (school report, browse, purchasing power shell) are Server Components
- Only interactive pieces (`PasteLink`, `PurchasingPowerTool`, `SentimentPanel`) are Client Components

### 5. Job Parser (`parser/jobLink.ts`)
- Source detection (regex per jobsite)
- Fuzzy school matching (token overlap + city match against derived schools)
- Salary extraction → currency detection → annual/monthly inference → FX to monthly USD

## Styling Conventions
- Dark theme (`#07090f` background), Tailwind CSS 4
- Glassmorphism cards: `border-white/10 bg-white/[0.03]`
- Gradient accents: indigo → fuchsia
- Tone system (`tone.ts`): good=emerald, warn=amber, bad=rose

## State Management
- `useState` for local client state (salary slider, search query)
- Server Components for all data fetching and report building
- No global state library needed yet

## Demand-Aware Growth and AI (2026-07-17)

- `/api/schools` records aggregate demand for matched schools and unresolved queries, then enqueues targeted discovery for the top results.
- `/api/sentiment` is DB-first and freshness-aware. Next `after()` guarantees write-through persistence and post-response queue work in serverless deployments.
- `school_interest` prioritizes data-gap bounties; `discovery_requests` preserves demand for schools not yet in the directory.
- Embeddings stay in Supabase pgvector. Providers are swappable (`google`, `pinecone`, `openai`), dimension-checked, normalized, and tagged with provider/model provenance.
- `school_briefs` caches optional Gemini-generated evidence briefs. The agent runs only after evidence changes and produces bounded summary, strength, watchout, and interview-question fields.
- Worker modes:
  - `bun worker` continuously polls the Postgres queue.
  - `bun worker:once` drains a bounded batch for scheduled low-cost deployments.
- UI uses progressive disclosure: the verdict and evidence brief lead, while raw salary records, full sentiment posts, and research checks stay collapsed until requested.
