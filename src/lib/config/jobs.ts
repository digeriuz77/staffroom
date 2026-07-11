// Shared configuration for background jobs (used by app + worker).

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
 * External community sources beyond Reddit. These platforms are crawled for
 * school mentions + sentiment. Configurable via env (comma-separated URLs).
 * Each source has a different scraping strategy (RSS, search, or API).
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
  return [
    {
      key: "google",
      label: "Google Search",
      type: "search",
      searchUrl: (name) =>
        `https://www.google.com/search?q=${encodeURIComponent(`"${name}" teacher review experience`)}`,
      requiresAuth: false,
      priority: 5,
    },
    {
      key: "isc",
      label: "International School Community",
      type: "review",
      searchUrl: (name) =>
        `https://app.internationalschoolcommunity.com/?s=${encodeURIComponent(name)}`,
      requiresAuth: true,
      priority: 4,
    },
    {
      key: "isr",
      label: "International Schools Review",
      type: "forum",
      searchUrl: (name) =>
        `https://internationalschoolsreview.com/v-web/bulletin/bb/search.php?keywords=${encodeURIComponent(name)}`,
      requiresAuth: true,
      priority: 4,
    },
    {
      key: "rft",
      label: "Reviews for Teachers",
      type: "review",
      searchUrl: (name) =>
        `https://reviewsforteachers.com/?s=${encodeURIComponent(name)}`,
      requiresAuth: false,
      priority: 3,
    },
    {
      key: "internationaleducators",
      label: "International Educators Forum",
      type: "forum",
      searchUrl: (name) =>
        `https://www.internationaleducators.com/forum/search.php?keywords=${encodeURIComponent(name)}`,
      requiresAuth: true,
      priority: 3,
    },
    {
      key: "glassdoor",
      label: "Glassdoor",
      type: "review",
      searchUrl: (name) =>
        `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(name)}`,
      requiresAuth: true,
      priority: 4,
    },
  ];
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
