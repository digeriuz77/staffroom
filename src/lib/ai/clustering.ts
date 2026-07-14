// Clustering: assign embedded Reddit posts to themes via nearest-centroid to
// keyword-seeded centroids, then write theme_clusters per school + time window.
import { embedTexts } from "@/lib/ai/embeddings";
import { SENTIMENT_THEMES } from "@/lib/config/jobs";
import { supabaseServer } from "@/lib/db/supabaseClients";
import type { RedditPostRow } from "@/lib/db/types";

const THEME_SEED: Record<string, string[]> = {
  Pay: ["salary pay wages compensation package money tax savings"],
  Management: ["leadership management principal head teacher admin SLT micromanage"],
  Housing: ["housing accommodation allowance apartment rent villa"],
  Workload: ["workload hours marking planning burnout balance stressful"],
  Turnover: ["turnover retention renewal leaving quit resigned staff leaving"],
  Culture: ["culture environment toxic supportive community atmosphere"],
  Other: ["general school experience teachers students"],
};

let centroidCache: { label: string; vec: number[] }[] | null = null;

async function themeCentroids(): Promise<{ label: string; vec: number[] }[]> {
  if (centroidCache) return centroidCache;
  const labels = SENTIMENT_THEMES.filter((t) => t !== "Other");
  const texts = labels.map((l) => THEME_SEED[l]?.[0] ?? l);
  const vecs = await embedTexts(texts);
  centroidCache = labels.map((label, i) => ({ label, vec: vecs[i] }));
  return centroidCache;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are L2-normalized
}

function nearestTheme(vec: number[] | null, centroids: { label: string; vec: number[] }[]): string {
  if (!vec) return "Other";
  let best = "Other";
  let bestSim = -Infinity;
  for (const c of centroids) {
    const sim = cosine(vec, c.vec);
    if (sim > bestSim) {
      bestSim = sim;
      best = c.label;
    }
  }
  // Threshold: if nothing is meaningfully close, bucket as Other.
  return bestSim > 0.15 ? best : "Other";
}

interface ClusterPayload {
  schoolId?: string;
}

const WINDOW_DAYS = 90;

export async function runClustering(payload: ClusterPayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  const centroids = await themeCentroids();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 86400 * 1000);

  // Determine target schools.
  let schoolIds: (string | null)[] = [];
  if (payload.schoolId) {
    schoolIds = [payload.schoolId];
  } else {
    const { data } = await client
      .from("reddit_posts")
      .select("school_id")
      .gte("created_at", windowStart.toISOString());
    const set = new Set<string | null>();
    for (const r of (data as { school_id: string | null }[]) ?? []) set.add(r.school_id);
    schoolIds = Array.from(set);
  }

  let clustersWritten = 0;
  for (const schoolId of schoolIds) {
    let query = client
      .from("reddit_posts")
      .select("id, embedding, sentiment_score, themes, title, body")
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    if (schoolId) query = query.eq("school_id", schoolId);
    else query = query.is("school_id", null);
    const { data } = await query;
    const posts = (data as (Pick<RedditPostRow, "id" | "embedding" | "sentiment_score" | "themes" | "title" | "body">)[]) ?? [];
    if (posts.length === 0) continue;

    // Bucket posts by assigned theme.
    const buckets = new Map<string, { count: number; sentSum: number; posts: typeof posts }>();
    for (const p of posts) {
      const theme = nearestTheme(p.embedding, centroids);
      const b = buckets.get(theme) ?? { count: 0, sentSum: 0, posts: [] };
      b.count++;
      b.sentSum += p.sentiment_score ?? 0;
      b.posts.push(p);
      buckets.set(theme, b);
    }

    for (const [theme, b] of buckets) {
      const avgSent = b.count ? b.sentSum / b.count : 0;
      const rep = b.posts
        .sort((x, y) => Math.abs(y.sentiment_score ?? 0) - Math.abs(x.sentiment_score ?? 0))
        .slice(0, 3)
        .map((p) => `${p.title ?? ""}`.trim())
        .filter(Boolean)
        .join(" · ");
      const { error } = await client.from("theme_clusters").insert({
        school_id: schoolId,
        theme_label: theme,
        summary: rep.slice(0, 300),
        post_count: b.count,
        sentiment_score: Math.round(avgSent * 100) / 100,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
      });
      if (error) console.warn(`[cluster] insert ${theme}: ${error.message}`);
      else clustersWritten++;
    }
  }
  console.log(`[cluster] wrote ${clustersWritten} theme clusters across ${schoolIds.length} scopes`);
  return clustersWritten;
}
