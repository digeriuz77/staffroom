import type { SentimentPost, SentimentSource, School } from "@/lib/types";
import { SOURCE_LABEL } from "@/lib/types";

export type SentimentLabel = "Excellent" | "Positive" | "Mixed" | "Concerns" | "Poor";
export type SentimentProvenance = "live" | "static" | "none";

export interface SourceBreakdown {
  source: SentimentSource;
  label: string;
  count: number;
  avgScore: number;
}

export interface ThemeStat {
  theme: string;
  count: number;
  avgScore: number;
}

export interface SentimentReport {
  count: number;
  weightedScore: number;
  label: SentimentLabel;
  bySource: SourceBreakdown[];
  topThemes: ThemeStat[];
  mostPositive?: SentimentPost;
  mostCritical?: SentimentPost;
  posts: SentimentPost[];
  provenance: SentimentProvenance;
}

function weight(p: SentimentPost): number {
  return p.upvotes != null ? Math.log2(2 + p.upvotes) : 1;
}

export function labelFromScore(score: number): SentimentLabel {
  if (score >= 0.35) return "Excellent";
  if (score >= 0.12) return "Positive";
  if (score >= -0.12) return "Mixed";
  if (score >= -0.3) return "Concerns";
  return "Poor";
}

export function buildSentimentReport(school: School, posts: SentimentPost[]): SentimentReport {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) {
    return { count: 0, weightedScore: 0, label: "Mixed", bySource: [], topThemes: [], posts: [], provenance: "none" };
  }
  const tw = sorted.reduce((acc, p) => acc + weight(p), 0);
  const weightedScore = sorted.reduce((acc, p) => acc + p.score * weight(p), 0) / tw;
  const sources = Array.from(new Set(sorted.map((p) => p.source))) as SentimentSource[];
  const bySource: SourceBreakdown[] = sources.map((source) => {
    const pool = sorted.filter((p) => p.source === source);
    const w = pool.reduce((acc, p) => acc + weight(p), 0);
    return { source, label: SOURCE_LABEL[source], count: pool.length, avgScore: pool.reduce((a, p) => a + p.score * weight(p), 0) / w };
  });
  const themeMap = new Map<string, { count: number; score: number; w: number }>();
  for (const p of sorted) {
    for (const t of p.themes) {
      const cur = themeMap.get(t) ?? { count: 0, score: 0, w: 0 };
      cur.count += 1;
      cur.score += p.score * weight(p);
      cur.w += weight(p);
      themeMap.set(t, cur);
    }
  }
  const topThemes: ThemeStat[] = Array.from(themeMap.entries())
    .map(([theme, v]) => ({ theme, count: v.count, avgScore: v.score / v.w }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const byScore = [...sorted].sort((a, b) => b.score - a.score);
  const provenance: SentimentProvenance = sorted.some((p) => p.provenance === "live") ? "live" : "static";
  return {
    count: sorted.length,
    weightedScore,
    label: labelFromScore(weightedScore),
    bySource,
    topThemes,
    mostPositive: byScore[0],
    mostCritical: byScore[byScore.length - 1],
    posts: sorted,
    provenance,
  };
}

export interface ClusteredTheme {
  theme: string;
  count: number;
  sentimentScore: number;
  summary: string | null;
}

/**
 * Read precomputed theme clusters (from the pgvector pipeline) for a school.
 * Returns null when Supabase is unavailable or no clusters exist.
 */
export async function getClusteredThemes(schoolId: string): Promise<ClusteredTheme[] | null> {
  const { supabaseServer } = await import("@/lib/db/supabaseClients");
  const client = supabaseServer();
  if (!client) return null;
  const { data } = await client
    .from("theme_clusters")
    .select("theme_label, post_count, sentiment_score, summary")
    .eq("school_id", schoolId)
    .order("computed_at", { ascending: false });
  const rows = (data as
    | { theme_label: string; post_count: number; sentiment_score: number; summary: string | null }[]
    | null);
  if (!rows || rows.length === 0) return null;
  // Keep the latest row per theme.
  const seen = new Map<string, ClusteredTheme>();
  for (const r of rows) {
    if (!seen.has(r.theme_label)) {
      seen.set(r.theme_label, {
        theme: r.theme_label,
        count: r.post_count,
        sentimentScore: r.sentiment_score,
        summary: r.summary,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.count - a.count);
}
