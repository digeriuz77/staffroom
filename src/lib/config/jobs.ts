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
  if (!raw) return ["InternationalTeachers", "InternationalSchools", "TEFL"];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
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
