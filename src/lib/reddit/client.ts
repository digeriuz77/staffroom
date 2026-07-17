import type { SentimentPost } from "@/lib/types";

const APP_VERSION = "1.0.0";
const APP_ID = "staffroom-intel";

function userAgent(): string {
  return `${APP_ID}/${APP_VERSION} (by /u/staffroom-intel; +https://staffroom-intel.app)`;
}

const DEFAULT_CLIENT_ID = "yH0aTnJEt6qUgGn835B4vg"; // Public exempt RedReader client ID

function getCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}

function credentialsConfigured(): boolean {
  return true;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const body = clientSecret
      ? "grant_type=client_credentials"
      : "grant_type=https://oauth.reddit.com/grants/installed_client&device_id=DO_NOT_TRACK_THIS_DEVICE";

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent(),
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface RedditLink {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    created_utc: number;
    subreddit: string;
    score: number;
    num_comments: number;
    permalink: string;
  };
}

interface RedditListing {
  data?: { children?: RedditLink[] };
}

interface RedditSearchResponse {
  data?: { children?: RedditLink[] };
}

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","in","for","is","it","on","at","by","with","from","as","be","this","that","i","my","we","they","you","school","teacher","teaching","work","working","im","was","but","so","if","not","anyone","know","about","has","have","are","what","would","could","very","just","really","there","their",
]);

function detectThemes(text: string): string[] {
  const t = text.toLowerCase();
  const themes: string[] = [];
  const checks: [RegExp, string][] = [
    [/salary|pay|wage|package|compensation|wages/, "Salary"],
    [/housing|accommodation|allowance|apartment|rent/, "Housing"],
    [/leadership|management|admin|principal|head ?teacher|slt/, "Leadership"],
    [/workload|hours|marking|planning|burnout|balance/, "Workload"],
    [/student|kids|pupil|children|class/, "Students"],
    [/parent|community/, "Parents"],
    [/culture|environment|toxic|supportive/, "Culture"],
    [/resource|facilities|facilities|campus|equipment/, "Facilities"],
    [/tax|saving|savings/, "Tax & savings"],
    [/flight|relocation|visa/, "Relocation"],
    [/renewal|retention|turnover|leave|left/, "Turnover"],
    [/communication|hr|transparent/, "Communication"],
  ];
  for (const [re, label] of checks) {
    if (re.test(t)) themes.push(label);
  }
  if (themes.length === 0) {
    const words = t
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOPWORDS.has(w));
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [w] of top) themes.push(w.charAt(0).toUpperCase() + w.slice(1));
  }
  return themes.slice(0, 6);
}

function scoreText(text: string): number {
  const t = text.toLowerCase();
  const positive = /(great|excellent|love|lovely|happy|recommend|supportive|fantastic|amazing|wonderful|enjoy|best|strong|solid|generous|reliable|professional|incredible|brilliant)/g;
  const negative = /(terrible|awful|burnout|burnt|toxic|poor|bad|worst|avoid|left|quit|stress|stressed|unhappy|disappointed|micromanage|chaotic|instab|red flag|concern|warning|regret|horrible|unprofessional)/g;
  const pos = (t.match(positive) ?? []).length;
  const neg = (t.match(negative) ?? []).length;
  if (pos + neg === 0) return 0;
  return Math.max(-0.7, Math.min(0.7, (pos - neg) / (pos + neg + 1)));
}

function toSentimentPost(link: RedditLink): SentimentPost {
  const d = link.data;
  const body = (d.selftext || d.title || "").trim();
  const date = new Date(d.created_utc * 1000).toISOString().slice(0, 10);
  return {
    id: `reddit_${d.id}`,
    school: "",
    source: "reddit",
    provenance: "live",
    author: d.author,
    date,
    title: d.title,
    body: body.slice(0, 600),
    score: scoreText(body),
    upvotes: d.score,
    subreddit: `r/${d.subreddit}`,
    url: `https://www.reddit.com${d.permalink}`,
    themes: detectThemes(body),
  };
}

function buildQueries(schoolName: string): string[] {
  const core = schoolName.trim();
  const short = core.replace(/(international school|school|college|academy|institute)/gi, "").trim() || core;
  return [
    `"${core}" review`,
    `${core} teacher experience`,
    `${short} school reddit`,
  ];
}

export interface RedditSearchResult {
  posts: SentimentPost[];
  source: "live" | "unavailable";
  reason?: string;
}

/**
 * Fetch the newest posts from a subreddit (sweep ingestion). Unlike
 * searchSchoolOnReddit this does not treat the input as a school name.
 */
export async function fetchSubredditNew(subreddit: string, limit = 25): Promise<RedditSearchResult> {
  if (!credentialsConfigured()) {
    return { posts: [], source: "unavailable", reason: "no-credentials" };
  }
  const token = await getAccessToken();
  if (!token) {
    return { posts: [], source: "unavailable", reason: "auth-failed" };
  }
  const sub = subreddit.replace(/^r\//i, "").trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/new?limit=${Math.min(100, Math.max(1, limit))}`,
      {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": userAgent() },
        signal: controller.signal,
      },
    );
    if (res.status === 429) return { posts: [], source: "unavailable", reason: "rate-limited" };
    if (!res.ok) return { posts: [], source: "unavailable", reason: `http-${res.status}` };
    const data = (await res.json()) as RedditListing;
    const posts = (data.data?.children ?? []).map(toSentimentPost);
    return { posts, source: "live" };
  } catch {
    return { posts: [], source: "unavailable", reason: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchSchoolOnReddit(schoolName: string, limit = 8): Promise<RedditSearchResult> {
  if (!credentialsConfigured()) {
    return { posts: [], source: "unavailable", reason: "no-credentials" };
  }

  const token = await getAccessToken();
  if (!token) {
    return { posts: [], source: "unavailable", reason: "auth-failed" };
  }

  const seen = new Set<string>();
  const collected: SentimentPost[] = [];

  for (const query of buildQueries(schoolName)) {
    if (collected.length >= limit) break;
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(10, limit - collected.length + 3)),
      sort: "relevance",
      type: "link",
      restrict_sr: "false",
      t: "year",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://oauth.reddit.com/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgent(),
        },
        signal: controller.signal,
      });
      if (res.status === 429) {
        return { posts: collected, source: "unavailable", reason: "rate-limited" };
      }
      if (!res.ok) continue;
      const data = (await res.json()) as RedditSearchResponse;
      const children = data.data?.children ?? [];
      for (const child of children) {
        const d = child.data;
        const id = d?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const text = `${d.title ?? ""} ${d.selftext ?? ""}`.toLowerCase();
        if (!text.includes(schoolName.toLowerCase().split(" ")[0].toLowerCase())) continue;
        collected.push(toSentimentPost(child));
        if (collected.length >= limit) break;
      }
    } catch {
      // continue to next query on network error
    } finally {
      clearTimeout(timeout);
    }
  }

  if (collected.length === 0) {
    return { posts: [], source: "live", reason: "no-results" };
  }
  return { posts: collected, source: "live" };
}
