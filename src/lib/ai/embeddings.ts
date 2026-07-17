// Embeddings client. Default: text-embedding-3-small (1536-dim), behind an
// interface so the provider is swappable. Batched; no-ops if no API key.
import { embeddingsConfig } from "@/lib/config/jobs";
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

/** True when a real embeddings provider is configured. */
export function hasEmbeddingsProvider(): boolean {
  return getProvider() !== null;
}

/**
 * Embed texts with the configured provider. Throws when no provider is
 * configured or a batch fails: persisting non-semantic placeholder vectors
 * would permanently poison the corpus (rows are only embedded once), so
 * failing loudly and retrying later is the correct behavior.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const p = getProvider();
  if (texts.length === 0) return [];
  if (!p) throw new Error("embeddings provider not configured (EMBEDDINGS_API_KEY)");
  // Batch in groups of 64.
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    out.push(...(await p.embed(texts.slice(i, i + 64))));
  }
  return out;
}

/** pgvector columns come back from PostgREST as JSON strings — normalize. */
export function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value)) return value as number[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

const EMBED_BATCH = 50;

/**
 * Embed Reddit posts that lack vectors. Writes the embedding column via RPC
 * (pgvector arrays need a typed cast). No-ops without a provider.
 */
export async function embedUnembeddedPosts(): Promise<number> {
  if (!hasEmbeddingsProvider()) {
    console.warn("[embeddings] no provider configured — skipping (posts stay unembedded)");
    return 0;
  }
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
