import { after, NextResponse } from "next/server";
import { searchSchoolOnReddit } from "@/lib/reddit/client";
import { staticSentimentFor } from "@/lib/data/sentiment";
import { supabaseEnabled, supabaseServer } from "@/lib/db/supabaseClients";
import { latestTurnoverSignal } from "@/lib/analysis/turnover";
import { enqueue } from "@/lib/db/queue";
import { persistPostsForSchool } from "@/lib/ai/redditIngest";
import { aggregateThemesFromPosts } from "@/lib/ai/clustering";
import { recordSchoolInterest } from "@/lib/db/interest";
import type { RedditPostRow, ThemeClusterRow } from "@/lib/db/types";
import type { SentimentPost } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How long stored sentiment is served from cache before a live re-fetch is
// triggered. Tunable via env. Short enough to stay current, long enough to
// respect Reddit's shared public rate limits.
const FRESHNESS_MS =
  Number(process.env.SENTIMENT_FRESHNESS_HOURS ?? 6) * 60 * 60 * 1000;

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
  lastFetchedAt: Date | null;
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

  const rawPosts = (postsRes.data as RedditPostRow[]) ?? [];
  const posts = rawPosts.map((r) => storedPostToSentiment(r, schoolName));

  // Freshness: most recent fetch time across the school's posts. Null when the
  // school has never been ingested.
  let lastFetchedAt: Date | null = null;
  for (const r of rawPosts) {
    const t = Date.parse(r.fetched_at);
    if (!Number.isNaN(t) && (!lastFetchedAt || t > lastFetchedAt.getTime())) {
      lastFetchedAt = new Date(t);
    }
  }

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
    lastFetchedAt,
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
  let livePostsForPersistence: SentimentPost[] = [];

  const useStored = supabaseEnabled() && UUID_RE.test(schoolId);
  const today = new Date().toISOString().slice(0, 10);

  // 1) Serve cached corpus from the DB when available.
  let stale = true;
  if (useStored) {
    const stored = await loadStored(schoolId, schoolName);
    if (stored) {
      posts = stored.posts;
      themes = stored.themes;
      turnover = stored.turnover;
      // Stale = never fetched, or fetched longer ago than the freshness window.
      // Re-fetching when stale (not only when < 3 posts) keeps popular schools
      // current as new discussions appear.
      const ageMs = stored.lastFetchedAt
        ? Date.now() - stored.lastFetchedAt.getTime()
        : Infinity;
      stale = ageMs > FRESHNESS_MS || posts.length < 3;
      if (posts.length >= 3) redditStatus = "stored";
    }
  }

  // 2) Live enrichment when stale: fetch fresh posts, WRITE-THROUGH persist
  //    them so browsing grows the corpus in real time, and kick off background
  //    jobs so the worker deepens + re-clusters this school.
  if (stale) {
    const reddit = await searchSchoolOnReddit(schoolName);
    redditReason = reddit.reason;
    if (reddit.source === "live") {
      redditStatus = reddit.posts.length > 0 ? "live" : "fallback";
    }
    if (useStored && reddit.posts.length > 0) {
      livePostsForPersistence = reddit.posts;
    }
    const known = new Set(posts.map((p) => p.id));
    posts = [...posts, ...reddit.posts.filter((p) => !known.has(p.id))].slice(0, 12);
  }

  // 3) Live themes: if the worker hasn't cached theme_clusters yet (or they're
  //    empty), compute the breakdown straight from the posts we now have so the
  //    teacher sees "what teachers talk about" immediately — no worker wait.
  if (themes.length === 0 && posts.length > 0) {
    themes = aggregateThemesFromPosts(
      posts.map((p) => ({ themes: p.themes, sentiment: p.score })),
    );
  }

  // 4) Last-resort static fallback only when nothing else was found.
  if (posts.length < 3) {
    const fallback = staticSentimentFor(schoolName).map((p) => ({ ...p, school: schoolName }));
    posts = [...posts, ...fallback].slice(0, 12);
  }

  if (useStored) {
    const evidenceCount = posts.filter((post) => post.provenance !== "static").length;
    after(async () => {
      await recordSchoolInterest([schoolId], "view");
      if (livePostsForPersistence.length > 0) {
        await persistPostsForSchool(livePostsForPersistence, schoolId);
      }
      if (stale) {
        await Promise.all([
          enqueue(
            "reddit_fetch",
            { schoolName, schoolId },
            { dedupeKey: `reddit-school-${schoolId}-${today}` },
          ),
          enqueue(
            "cluster",
            { schoolId },
            { dedupeKey: `cluster-school-${schoolId}-${today}` },
          ),
        ]);
      }
      if (evidenceCount >= 3) {
        await enqueue(
          "brief",
          { schoolId },
          { dedupeKey: `brief-school-${schoolId}-${today}` },
        );
      }
    });
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
