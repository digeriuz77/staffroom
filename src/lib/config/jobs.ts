// Shared configuration for background jobs (used by app + worker).

import { automatableSources, type PlatformEntry } from "@/lib/data/platformRegistry";

/** Job-board sources the turnover scraper monitors (matches the parser). */
export const JOB_BOARD_SOURCES = [
  "tes",
  "grc",
  "teacherhorizons",
  "schrole",
  "eslcafe",
] as const;

export type JobBoardSource = (typeof JOB_BOARD_SOURCES)[number];

/** Reddit subreddits scanned for teacher sentiment. Configurable via env. */
export function redditSubreddits(): string[] {
  const raw = process.env.REDDIT_SUBREDDITS;
  if (!raw)
    return [
      "InternationalTeachers",
      "InternationalSchools",
      "TEFL",
      "teachinginkorea",
      "teachinginjapan",
      "teachinginchina",
      "teachinginthailand",
      "teachinginDubai",
      "teachinginuae",
      "teachingabroad",
      "expatteachers",
      "teachers",
    ];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}

/**
 * External community sources beyond Reddit. Derived from the comprehensive
 * platform registry (platformRegistry.ts) — only includes sources the worker
 * can actually scrape (feasibility high/medium, free/freemium access).
 * Override with EXTERNAL_SOURCES env var (comma-separated keys, or "off").
 */
export interface ExternalSource {
  key: string;
  label: string;
  type: "forum" | "review" | "social" | "search";
  searchUrl: (schoolName: string) => string;
  /** Whether this source requires auth/cookies (limits scraping). */
  requiresAuth: boolean;
  priority: number; // higher = more valuable signal
}

export function externalSources(): ExternalSource[] {
  const raw = process.env.EXTERNAL_SOURCES;
  if (raw === "off") return [];
  return automatableSources().map((p: PlatformEntry) => ({
    key: p.key,
    label: p.label,
    type: p.category === "accreditation" ? "review" : (p.category as "forum" | "review" | "social" | "search"),
    searchUrl: p.searchUrl,
    requiresAuth: p.access === "free_with_auth" || p.access === "membership" || p.access === "paid",
    priority: p.priority,
  }));
}

/** Theme labels used for clustering + sentiment correlation. */
export const SENTIMENT_THEMES = [
  "Pay",
  "Management",
  "Housing",
  "Workload",
  "Turnover",
  "Culture",
  "Other",
] as const;

/** Themes whose sentiment shifts most strongly correlate with turnover. */
export const TURNOVER_THEMES = ["Management", "Workload", "Pay", "Turnover"] as const;

/** Embeddings model dimensions (must match the vector(1536) column). */
export const EMBEDDING_DIM = 1536;

export function embeddingsConfig() {
  return {
    baseUrl: process.env.EMBEDDINGS_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.EMBEDDINGS_MODEL ?? "text-embedding-3-small",
    apiKey: process.env.EMBEDDINGS_API_KEY ?? "",
  };
}

/** Default FX rate source (free, no key). */
export const FX_SOURCE = "https://open.er-api.com/v6/latest/USD";
