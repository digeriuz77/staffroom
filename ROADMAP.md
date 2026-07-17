# Staffroom Intel — Product Roadmap

This roadmap classifies future features by **feasibility** (technical risk,
dependency complexity, data availability) and **user impact** (how much it
improves the core job-evaluation experience). Features are grouped into tiers
so sequencing is clear.

## Classification Legend

| Tag | Meaning |
|-----|---------|
| **Feasibility: High** | Builds on existing infrastructure; no new external dependencies; under 1 sprint |
| **Feasibility: Medium** | Requires new data, integration, or moderate architectural work; 1-2 sprints |
| **Feasibility: Low** | Complex data acquisition, legal/policy risk, or heavy infrastructure; 3+ sprints |
| **Impact: High** | Directly improves the core verdict/decision; users will notice immediately |
| **Impact: Medium** | Improves depth/trust; valuable but not the headline experience |
| **Impact: Low** | Polish, edge cases, power-user features |

---

## Tier 1: Quick Wins (High feasibility, High impact)

Features that deliver the most value per unit of effort. Do these first.

### 1.1 School comparison view
- **Feasibility:** High — reuses existing `getSchoolBySlug` + TANE engine
- **Impact:** High — the #1 user need (comparing 2-3 offers)
- **Spec:** Add `/compare?schools=slug1,slug2,slug3` page. Side-by-side TANE
  breakdowns, tax regimes, sentiment summaries, turnover signals, and website
  health scores in a single view. Shareable URL.

### 1.2 Offer history / saved searches
- **Feasibility:** High — needs a `saved_offers` table + simple CRUD
- **Impact:** Medium — users researching multiple schools want to revisit
- **Spec:** Logged-in users can save job links + offers. Dashboard at
  `/dashboard` showing saved schools, offers, and reputation.

### 1.3 Saved household profile
- **Feasibility:** High — `profiles.household` JSON already exists
- **Impact:** High — users shouldn't reconfigure household every visit
- **Spec:** On TANE panel interaction, persist household to the user's profile.
  Load it automatically on school report load.

### 1.4 Email notifications for bounty fulfilment
- **Feasibility:** High — Supabase Edge Function + Resend (free tier)
- **Impact:** Medium — drives engagement for the bounty system
- **Spec:** When a user's submission is approved or a bounty they watch is
  filled, send a transactional email.

### 1.5 Improved data disclaimers + provenance display
- **Feasibility:** High — pure UI
- **Impact:** Medium — critical for trust; reduces liability
- **Spec:** Every salary figure shows a provenance badge (seed / user-verified /
  moderator-verified) and a disclaimer. Confidence intervals on percentiles.

---

## Tier 2: Growth Features (Medium feasibility, High impact)

Features that expand the dataset and deepen the analysis. These are what make
the product genuinely better than competitors.

### 2.1 Structured salary submission wizard
- **Feasibility:** Medium — the form exists but needs package-field UX
- **Impact:** High — richer submissions = better TANE data
- **Spec:** Multi-step form: role → base salary → housing → flights → fees →
  benefits → tenure. Auto-fill from pasted job link where possible. Inline
  validation against tax-rate + COL data to flag outliers.

### 2.2 Bulk salary import (CSV/JSON)
- **Feasibility:** Medium — parser + batch insert + moderation queue
- **Impact:** Medium — allows importing data from partnerships or existing
  spreadsheets
- **Spec:** `/import` page for moderators/admins. Drag-and-drop CSV with column
  mapping. All imported rows enter as `pending` for review.

### 2.3 "How long until I save $X?" goal calculator
- **Feasibility:** Medium — builds on takeHome estimator
- **Impact:** High — concrete savings timeline is the #1 question teachers ask
- **Spec:** User inputs target savings + time horizon. Engine shows which
  schools/packages hit the goal, factoring tax + COL + exchange rate.

### 2.4 School profile pages with richer metadata
- **Feasibility:** Medium — needs enrichment from accreditation directories
- **Impact:** Medium — inspection reports, curricula, student count, founding
  year add context to salary data
- **Spec:** Crawl COBIS/CIS/IB directories (already in platform registry) to
  populate `schools.enrichment` JSON. Display accreditation status, inspection
  history, enrollment size on school report.

### 2.5 Notification feed for followed schools
- **Feasibility:** Medium — needs `follows` table + job queue
- **Impact:** Medium — teachers watching a school want alerts on new
  submissions or sentiment shifts
- **Spec:** User clicks "Follow" on a school. When new salary data or a
  sentiment shift is detected, appears in `/dashboard` feed + optional email.

---

## Tier 3: Differentiators (Low-Medium feasibility, High impact)

Features that create moats competitors can't easily replicate.

### 3.1 Contract clause analyzer (LLM)
- **Feasibility:** Low-Medium — needs LLM API + legal prompt engineering
- **Impact:** High — teachers can't spot problematic clauses (probation,
  renewal, repatriation, non-compete)
- **Spec:** User pastes contract text. LLM extracts and flags clauses:
  probation period, notice requirements, end-of-service terms, housing
  conditions, renewal expectations, restrictive covenants. Compares against
  norms for the region.

### 3.2 Career trajectory visualizer
- **Feasibility:** Medium — needs role progression data + role profiles
  (already built)
- **Impact:** Medium — shows what a realistic 5-10 year path looks like
- **Spec:** Given current role + target role (e.g., classroom → HoD → DP),
  visualize the TANE progression, typical tenure per step, and which schools
  have promoted internally. Draws on role profiles data.

### 3.3 Cost-of-living contributor bounty marketplace
- **Feasibility:** Medium — builds on existing bounty system
- **Impact:** Medium — granular COL data (milk, rent, utilities) is the weakest
  dataset
- **Spec:** Expand bounty system to reward COL submissions by city.
  Gamified "fill this city's data" challenges. Tiered rewards for verified
  vs unverified.

### 3.4 Real-time offer comparison chat
- **Feasibility:** Low — needs WebSocket or SSE infra
- **Impact:** Medium — couples comparing offers collaboratively
- **Spec:** Shareable session URL where two people view the same comparison
  side-by-side with live cursors. Uses Supabase Realtime.

---

## Tier 4: Moonshots (Low feasibility, potentially High impact)

High-risk, high-reward. Explore only after Tiers 1-2 are solid.

### 4.1 Glassdoor/ISC/ISR data partnership or licensing
- **Feasibility:** Low — requires business development + legal agreements
- **Impact:** High — would dramatically expand the dataset overnight
- **Spec:** Negotiate data access with established platforms. Display their data
  with attribution + provenance tier. May require revenue share.

### 4.2 Anonymous verification via school email domain
- **Feasibility:** Low-Medium — privacy engineering + email handling
- **Impact:** High — verifies submitters actually work/worked at a school
  without revealing identity
- **Spec:** User provides `@schoolname.org` email. Send a verification code
  (never store the email). Mark submissions as `school-verified` trust tier.

### 4.3 Predictive turnover model (ML)
- **Feasibility:** Low — needs significant historical data + ML pipeline
- **Impact:** High — "this school has a 73% chance of high turnover next year"
  is a game-changer
- **Spec:** Train on historical posting frequency + sentiment shifts + tenure
  data. Requires 2+ years of accumulated data before the model is useful.

### 4.4 Mobile app (React Native / Expo)
- **Feasibility:** Low — full separate build, app store review, push notifications
- **Impact:** Medium — teachers browse on phones but the web app is responsive
- **Spec:** Wrap core flows (paste link → verdict, compare, saved offers).
  Leverage Supabase auth + data. Push notifications for bounty alerts.

### 4.5 Multi-language support (i18n)
- **Feasibility:** Medium — Next.js i18n is straightforward but content
  translation (salary data, school names) is complex
- **Impact:** Medium — opens non-English-speaking markets
- **Spec:** Priority languages: Spanish, French, Arabic, Mandarin. Translate UI;
  keep data in English with locale-formatted currency/dates.

---

## Sequencing Recommendation

```
Q1 (Now)         Q2               Q3               Q4+
───────          ─────            ─────            ─────
Tier 1.1         Tier 2.1         Tier 3.1         Tier 4.2
Compare view     Submission       Contract         Email verify
                 wizard           analyzer
Tier 1.3
Saved household
Tier 1.5
Disclaimers
Tier 2.3
Savings goal
```

**Rationale:** The comparison view (1.1) and saved household (1.3) are the
highest-ROI features — they directly serve the core use case (comparing offers)
with minimal effort. The submission wizard (2.1) and savings calculator (2.3)
deepen the dataset and the analysis. Contract analysis (3.1) is the
differentiator that competitors lack.

---

## Tech Debt & Infrastructure (always-on backlog)

These aren't user-visible features but are necessary for scale:

| Item | Priority | Effort |
|------|----------|--------|
| Migrate read paths from sync TSV to async Supabase repo | High | Medium |
| Add rate limiting on API routes (Upstash Redis) | Medium | Low |
| Add structured logging (Axiom/Logflare) to worker | Medium | Low |
| Set up CI/CD pipeline (GitHub Actions: lint + test + typecheck) | High | Low |
| Add Supabase connection pooling (PgBouncer) | Medium | Low |
| Cache school report pages (ISR / revalidate) | Medium | Low |
| Add OpenGraph images for school reports (sharing) | Low | Medium |
| Implement CSP headers + security middleware | Medium | Low |
