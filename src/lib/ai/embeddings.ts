// Embeddings client. Default: text-embedding-3-small (1536-dim), behind an
// interface so the provider is swappable. Batched; no-ops if no API key.
import { embeddingsConfig, EMBEDDING_DIM } from "@/lib/config/jobs";
import type { RedditPostRow } from "@/lib/db/types";
import { supabaseServer } from "@/lib/db/supabaseClients";

interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
}

function openAIProvider(): EmbeddingsProvider | null {
  const cfg = embeddingsConfig();
  if (!cfg.apiKey) return null;
  return {
    async embed(texts: string[]): Promise<number[][]> {
      const res = await fetch(`${cfg.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: cfg.model, input: texts }),
      });
      if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      return data.data.map((d) => d.embedding);
    },
  };
}

let provider: EmbeddingsProvider | null | undefined;
function getProvider(): EmbeddingsProvider | null {
  if (provider === undefined) provider = openAIProvider();
  return provider;
}

/**
 * Fallback deterministic hashing embedding so clustering can run without an
 * API key (lower quality, but keeps the pipeline functional). NOT semantic.
 */
function hashEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 0;
    for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0;
    vec[h % EMBEDDING_DIM] += 1;
    vec[(h >> 8) % EMBEDDING_DIM] += 0.5;
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const p = getProvider();
  if (!p || texts.length === 0) return texts.map(hashEmbed);
  // Batch in groups of 64.
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    try {
      out.push(...(await p.embed(batch)));
    } catch (e) {
      console.warn("[embeddings] provider failed, using hash fallback:", e);
      out.push(...batch.map(hashEmbed));
    }
  }
  return out;
}

const EMBED_BATCH = 50;

/**
 * Embed Reddit posts that lack vectors. Writes the embedding column via RPC
 * (pgvector arrays need a typed cast).
 */
export async function embedUnembeddedPosts(): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");
  const { data, error } = await client
    .from("reddit_posts")
    .select("id, title, body")
    .is("embedding", null)
    .limit(EMBED_BATCH);
  if (error) throw new Error(`select posts: ${error.message}`);
  const posts = (data as Pick<RedditPostRow, "id" | "title" | "body">[]) ?? [];
  if (posts.length === 0) return 0;

  const texts = posts.map((p) => `${p.title ?? ""}\n${p.body ?? ""}`.slice(0, 4000));
  const vectors = await embedTexts(texts);

  for (let i = 0; i < posts.length; i++) {
    const { error: upd } = await client.rpc("set_post_embedding", {
      p_id: posts[i].id,
      p_vec: vectors[i],
    });
    if (upd) console.warn(`[embeddings] set ${posts[i].id}: ${upd.message}`);
  }
  console.log(`[embeddings] embedded ${posts.length} posts`);
  return posts.length;
}
