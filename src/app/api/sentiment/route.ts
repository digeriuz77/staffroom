import { NextResponse } from "next/server";
import { searchSchoolOnReddit } from "@/lib/reddit/client";
import { staticSentimentFor } from "@/lib/data/sentiment";
import { supabaseEnabled, supabaseServer } from "@/lib/db/supabaseClients";
import { latestTurnoverSignal } from "@/lib/analysis/turnover";
import { enqueue } from "@/lib/db/queue";
import type { RedditPostRow, ThemeClusterRow } from "@/lib/db/types";
import type { SentimentPost } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ThemeSummary {
  label: string;
  count: number;
  sentiment: number;
}

interface TurnoverSummary {
  strength: number;
  rationale: string | null;
}

function storedPostToSentiment(row: RedditPostRow, schoolName: string): SentimentPost {
  return {
    id: row.id,
    school: schoolName,
    source: "reddit",
    provenance: "stored",
    author: row.author ?? "unknown",
    date: row.created_at.slice(0, 10),
    title: row.title ?? undefined,
    body: (row.body ?? row.title ?? "").slice(0, 600),
    score: row.sentiment_score ?? 0,
    upvotes: row.score ?? undefined,
    subreddit: row.subreddit,
    themes: row.themes ?? [],
  };
}

/**
 * DB-first sentiment: the worker-maintained corpus (posts, theme clusters,
 * turnover signal) is the primary source — fast, consistent, and it compounds
 * as data accumulates. Live Reddit only fills gaps, and a fetch job is
 * enqueued so the next visitor hits the stored path.
 */
async function loadStored(schoolId: string, schoolName: string): Promise<{
  posts: SentimentPost[];
  themes: ThemeSummary[];
  turnover: TurnoverSummary | null;
} | null> {
  const client = supabaseServer();
  if (!client) return null;

  const [postsRes, clustersRes, turnover] = await Promise.all([
    client
      .from("reddit_posts")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("theme_clusters")
      .select("theme_label, post_count, sentiment_score, computed_at")
      .eq("school_id", schoolId)
      .order("computed_at", { ascending: false })
      .limit(24),
    latestTurnoverSignal(schoolId),
  ]);

  const posts = ((postsRes.data as RedditPostRow[]) ?? []).map((r) =>
    storedPostToSentiment(r, schoolName),
  );

  // Keep only the latest cluster row per theme.
  const seen = new Set<string>();
  const themes: ThemeSummary[] = [];
  for (const c of ((clustersRes.data as Pick<ThemeClusterRow, "theme_label" | "post_count" | "sentiment_score" | "computed_at">[]) ?? [])) {
    if (seen.has(c.theme_label)) continue;
    seen.add(c.theme_label);
    themes.push({ label: c.theme_label, count: c.post_count, sentiment: c.sentiment_score });
  }
  themes.sort((a, b) => b.count - a.count);

  return {
    posts,
    themes,
    turnover:
      turnover && turnover.signal_strength >= 0.2
        ? { strength: turnover.signal_strength, rationale: turnover.rationale }
        : null,
  };
}

export async function POST(request: Request) {
  let body: { schoolName?: string; schoolId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const schoolName = (body.schoolName ?? "").trim();
  const schoolId = (body.schoolId ?? "").trim();
  if (!schoolName) return NextResponse.json({ error: "schoolName is required" }, { status: 400 });

  let posts: SentimentPost[] = [];
  let themes: ThemeSummary[] = [];
  let turnover: TurnoverSummary | null = null;
  let redditStatus: "stored" | "live" | "fallback" | "unavailable" = "unavailable";
  let redditReason: string | undefined;

  const useStored = supabaseEnabled() && UUID_RE.test(schoolId);
  if (useStored) {
    const stored = await loadStored(schoolId, schoolName);
    if (stored) {
      posts = stored.posts;
      themes = stored.themes;
      turnover = stored.turnover;
      if (posts.length >= 3) redditStatus = "stored";
    }
    if (posts.length < 3) {
      // Grow the corpus in the background; dedupe per school per day.
      void enqueue(
        "reddit_fetch",
        { schoolName, schoolId },
        { dedupeKey: `reddit-school-${schoolId}-${new Date().toISOString().slice(0, 10)}` },
      );
    }
  }

  if (posts.length < 3) {
    const reddit = await searchSchoolOnReddit(schoolName);
    redditReason = reddit.reason;
    if (reddit.source === "live") {
      redditStatus = reddit.posts.length > 0 ? "live" : "fallback";
    }
    const known = new Set(posts.map((p) => p.id));
    posts = [...posts, ...reddit.posts.filter((p) => !known.has(p.id))].slice(0, 12);
  }

  if (posts.length < 3) {
    const fallback = staticSentimentFor(schoolName).map((p) => ({ ...p, school: schoolName }));
    posts = [...posts, ...fallback].slice(0, 12);
  }

  return NextResponse.json({
    count: posts.length,
    redditStatus,
    redditReason,
    posts,
    themes,
    turnover,
  });
}
