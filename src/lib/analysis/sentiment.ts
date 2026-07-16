export type SentimentLabel = "Excellent" | "Positive" | "Mixed" | "Concerns" | "Poor";

/** Map a sentiment score (-0.7..0.7) to a human-readable label. */
export function labelFromScore(score: number): SentimentLabel {
  if (score >= 0.35) return "Excellent";
  if (score >= 0.12) return "Positive";
  if (score >= -0.12) return "Mixed";
  if (score >= -0.3) return "Concerns";
  return "Poor";
}
