// Reddit ingest: fetch posts and store them in reddit_posts with fuzzy
// school matching. Reuses the existing OAuth client + theme/sentiment scoring.
import { searchSchoolOnReddit } from "@/lib/reddit/client";
import { redditSubreddits } from "@/lib/config/jobs";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { deriveSchools, slugify } from "@/lib/data/schools";
import type { RedditPostRow } from "@/lib/db/types";

interface FetchPayload {
  schoolName?: string;
  subreddit?: string;
  schoolId?: string;
  mode?: string;
}

function schoolSlugFromName(name: string): string | null {
  const all = deriveSchools();
  const q = name.toLowerCase();
  const hit = all.find(
    (d) => d.school.name.toLowerCase() === q || d.school.name.toLowerCase().includes(q),
  );
  return hit?.school.id ?? null;
}

async function resolveSchoolId(name: string): Promise<string | null> {
  const client = supabaseServer();
  if (!client) return schoolSlugFromName(name);
  const { data } = await client
    .from("schools")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .limit(1);
  return (data?.[0] as { id: string } | undefined)?.id ?? null;
}

export async function fetchAndStoreReddit(payload: FetchPayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  // Sweep mode: iterate configured subreddits and fetch recent posts (no school filter).
  if (payload.mode === "sweep" || (!payload.schoolName && !payload.schoolId)) {
    let total = 0;
    for (const sub of redditSubreddits()) {
      const result = await searchSchoolOnReddit(sub, 15);
      if (result.posts.length === 0) continue;
      total += await storePosts(client, result.posts, sub, null);
    }
    return total;
  }

  const name = payload.schoolName ?? "";
  const schoolId = payload.schoolId ?? (await resolveSchoolId(name));
  const result = await searchSchoolOnReddit(name, 12);
  return storePosts(client, result.posts, "", schoolId);
}

async function storePosts(
  client: NonNullable<ReturnType<typeof supabaseServer>>,
  posts: import("@/lib/types").SentimentPost[],
  subreddit: string,
  schoolId: string | null,
): Promise<number> {
  let stored = 0;
  for (const p of posts) {
    const id = p.id;
    const row = {
      id,
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
      console.warn(`[redditIngest] upsert ${id}: ${error.message}`);
      continue;
    }
    stored++;
  }
  console.log(`[redditIngest] stored ${stored}/${posts.length} posts`);
  return stored;
}

// Keep slugify import referenced for the fallback resolver path.
void slugify;
