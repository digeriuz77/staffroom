# Project Brief: Staffroom Intel

## Purpose

A tool that helps international school teachers evaluate job offers with real data instead of marketing language. A teacher pastes a job link (from tes.com, Teacher Horizons, Search Associates/GRC, Schrole, etc.) and gets an aggregated overview of: how the salary compares to what's already known, what the purchasing power/savings look like, and what the social sentiment about the school is.

Inspired by mystool.org (salary intelligence) and Wondering Staffroom (community salary tracker) but with a better experience: paste-a-link → instant verdict, cost-of-living-adjusted purchasing power, and live social sentiment.

## Target Users

- International school teachers evaluating job offers
- Teachers comparing packages across countries/schools
- Early-career teachers judging whether a first-contract salary is realistic
- Teachers weighing overseas packages against home-country salaries

## Core Use Cases

1. **Paste a job link** → instant salary verdict, purchasing power, and sentiment
2. **Compare purchasing power** across cities for a given salary
3. **Browse schools** by region to see real salary distributions
4. **Read teacher sentiment** about a specific school

## Key Requirements

### Must Have
- Job-link parser supporting tes.com, Teacher Horizons, Search Associates, Schrole
- Salary comparison against real verified data (percentiles, not just median)
- Cost-of-living-adjusted purchasing power and savings estimate
- Reddit sentiment (live API with fallback)
- Monthly-USD normalization across all currencies/tax regimes

### Planned / Nice to Have
- Background scraper → SQL database as primary data source
- Reddit API as confirmation/refresh layer on top of cached DB
- Anonymous salary submission to grow dataset
- Glassdoor/Facebook/Instagram signals via cached community content
- Granular cost-of-living items (milk, beer, meal, gym, taxi) — DONE

## Constraints

- Framework: Next.js 16 + React 19 + Tailwind CSS 4
- Package manager: Bun
- Reddit API: free tier (~100 requests / 10 min) is sufficient for per-school lookups
- Salary data is self-reported/indicative — must disclaim this

## Success Metrics

- Real salary dataset that rivals competitors (mystool's 700 verified salaries)
- Instant, actionable verdict on any pasted offer
- Clear purchasing-power comparison so teachers understand real value
