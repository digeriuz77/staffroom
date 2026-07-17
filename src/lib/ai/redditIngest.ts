// Reddit ingest: fetch posts and store them in reddit_posts with fuzzy
// school matching. Reuses the existing OAuth client + theme/sentiment scoring.
import { searchSchoolOnReddit, fetchSubredditNew } from "@/lib/reddit/client";
import { redditSubreddits } from "@/lib/config/jobs";
import { supabaseServer } from "@/lib/db/supabaseClients";
import type { SentimentPost } from "@/lib/types";

interface FetchPayload {
  schoolName?: string;
  subreddit?: string;
  schoolId?: string;
  mode?: string;
}

interface SchoolDirEntry {
  id: string;
  name: string;
  city: string;
}

const GENERIC_TOKENS = ["school", "college", "international", "academy", "institute"];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function loadSchoolDir(): Promise<SchoolDirEntry[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data } = await client.from("schools").select("id, name, city");
  return (data as SchoolDirEntry[]) ?? [];
}

/**
 * Fuzzy-match post text against the school directory. Returns a school_id
 * when a school's distinctive tokens all appear in the text, or null.
 */
function resolveSchoolFromText(text: string, dir: SchoolDirEntry[]): string | null {
  const norm = normalize(text);
  if (!norm) return null;
  let best: { id: string; score: number } | null = null;
  for (const s of dir) {
    const schoolNorm = normalize(s.name);
    const tokens = schoolNorm.split(" ").filter(
      (t) => t.length > 3 && !GENERIC_TOKENS.includes(t),
    );
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => norm.includes(t)).length;
    const score = hits / tokens.length;
    if (score >= 0.7 && (!best || score > best.score)) {
      best = { id: s.id, score };
    }
  }
  return best?.id ?? null;
}

export async function fetchAndStoreReddit(payload: FetchPayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  // Sweep mode: pull newest posts from each configured subreddit and resolve
  // the mentioned school from post text against the schools table.
  if (payload.mode === "sweep" || (!payload.schoolName && !payload.schoolId)) {
    const dir = await loadSchoolDir();
    let total = 0;
    for (const sub of redditSubreddits()) {
      const result = await fetchSubredditNew(sub, 25);
      if (result.posts.length === 0) continue;
      total += await storeSweepPosts(client, result.posts, sub, dir);
    }
    return total;
  }

  // Targeted fetch for a specific school.
  const name = payload.schoolName ?? "";
  const schoolId = payload.schoolId ?? (await resolveSchoolIdByName(name));
  const result = await searchSchoolOnReddit(name, 12);
  return storePosts(client, result.posts, "", schoolId);
}

async function resolveSchoolIdByName(name: string): Promise<string | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data } = await client
    .from("schools")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .limit(1);
  return (data?.[0] as { id: string } | undefined)?.id ?? null;
}

async function storeSweepPosts(
  client: NonNullable<ReturnType<typeof supabaseServer>>,
  posts: SentimentPost[],
  subreddit: string,
  dir: SchoolDirEntry[],
): Promise<number> {
  let stored = 0;
  for (const p of posts) {
    const text = `${p.title ?? ""} ${p.body ?? ""}`;
    const schoolId = resolveSchoolFromText(text, dir);
    const row = {
      id: p.id,
      school_id: schoolId,
      subreddit: p.subreddit ?? subreddit,
      title: p.title ?? null,
      body: p.body ?? null,
      author: p.author,
      created_at: new Date(p.date).toISOString(),
      sentiment_score: p.score,
      themes: p.themes,
    };
    const { error } = await client.from("reddit_posts").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn(`[redditIngest] upsert ${p.id}: ${error.message}`);
      continue;
    }
    stored++;
  }
  console.log(`[redditIngest] sweep stored ${stored}/${posts.length} posts (${subreddit})`);
  return stored;
}

async function storePosts(
  client: NonNullable<ReturnType<typeof supabaseServer>>,
  posts: SentimentPost[],
  subreddit: string,
  schoolId: string | null,
): Promise<number> {
  let stored = 0;
  for (const p of posts) {
    const row = {
      id: p.id,
      school_id: schoolId,
      subreddit: p.subreddit ?? subreddit,
      title: p.title ?? null,
      body: p.body ?? null,
      author: p.author,
      created_at: new Date(p.date).toISOString(),
      sentiment_score: p.score,
      themes: p.themes,
    };
    const { error } = await client.from("reddit_posts").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn(`[redditIngest] upsert ${p.id}: ${error.message}`);
      continue;
    }
    stored++;
  }
  console.log(`[redditIngest] stored ${stored}/${posts.length} posts`);
  return stored;
}
