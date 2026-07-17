// Provider-agnostic embeddings client. Google is the recommended low-cost
// path; OpenAI-compatible and Pinecone Inference remain supported.
import {
  EMBEDDING_DIM,
  embeddingsConfig,
  type EmbeddingsProviderKind,
} from "@/lib/config/jobs";
import type { RedditPostRow } from "@/lib/db/types";
import { supabaseServer } from "@/lib/db/supabaseClients";

interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
}

function compactError(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

export function normalizeEmbedding(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("embedding vector has no usable magnitude");
  }
  return vector.map((value) => value / magnitude);
}

export function prepareEmbedding(
  vector: number[],
  options: { allowPadding?: boolean } = {},
): number[] {
  if (!vector.every(Number.isFinite)) {
    throw new Error("embedding vector contains non-finite values");
  }
  if (vector.length > EMBEDDING_DIM) {
    throw new Error(
      `embedding dimension ${vector.length} exceeds pgvector dimension ${EMBEDDING_DIM}`,
    );
  }
  if (vector.length < EMBEDDING_DIM && !options.allowPadding) {
    throw new Error(
      `embedding dimension ${vector.length} does not match pgvector dimension ${EMBEDDING_DIM}`,
    );
  }
  const fixed =
    vector.length === EMBEDDING_DIM
      ? vector
      : [...vector, ...Array<number>(EMBEDDING_DIM - vector.length).fill(0)];
  return normalizeEmbedding(fixed);
}

function openAIProvider(
  cfg: ReturnType<typeof embeddingsConfig>,
): EmbeddingsProvider {
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
      if (!res.ok) {
        throw new Error(
          `openai embeddings ${res.status}: ${compactError(await res.text())}`,
        );
      }
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      if (data.data.length !== texts.length) {
        throw new Error(`openai embeddings returned ${data.data.length}/${texts.length} vectors`);
      }
      return data.data.map((d) => prepareEmbedding(d.embedding));
    },
  };
}

function googleProvider(
  cfg: ReturnType<typeof embeddingsConfig>,
): EmbeddingsProvider {
  return {
    async embed(texts: string[]): Promise<number[][]> {
      const model = cfg.model.replace(/^models\//, "");
      const res = await fetch(
        `${cfg.baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": cfg.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: texts.map((text) => ({
              model: `models/${model}`,
              content: { parts: [{ text }] },
              taskType: "CLUSTERING",
              outputDimensionality: EMBEDDING_DIM,
            })),
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `google embeddings ${res.status}: ${compactError(await res.text())}`,
        );
      }
      const data = (await res.json()) as {
        embeddings?: { values?: number[] }[];
      };
      const embeddings = data.embeddings ?? [];
      if (embeddings.length !== texts.length) {
        throw new Error(`google embeddings returned ${embeddings.length}/${texts.length} vectors`);
      }
      return embeddings.map((embedding) => prepareEmbedding(embedding.values ?? []));
    },
  };
}

function pineconeProvider(
  cfg: ReturnType<typeof embeddingsConfig>,
): EmbeddingsProvider {
  return {
    async embed(texts: string[]): Promise<number[][]> {
      const res = await fetch(`${cfg.baseUrl}/embed`, {
        method: "POST",
        headers: {
          "Api-Key": cfg.apiKey,
          "Content-Type": "application/json",
          "X-Pinecone-Api-Version": "2025-10",
        },
        body: JSON.stringify({
          model: cfg.model,
          inputs: texts.map((text) => ({ text })),
          parameters: { input_type: "passage", truncate: "END" },
        }),
      });
      if (!res.ok) {
        throw new Error(
          `pinecone embeddings ${res.status}: ${compactError(await res.text())}`,
        );
      }
      const data = (await res.json()) as {
        data?: { values?: number[] }[];
      };
      const embeddings = data.data ?? [];
      if (embeddings.length !== texts.length) {
        throw new Error(`pinecone embeddings returned ${embeddings.length}/${texts.length} vectors`);
      }
      // Pinecone's default hosted model emits 1024 dimensions. Zero-padding
      // preserves cosine similarity while keeping the existing 1536-dim index.
      return embeddings.map((embedding) =>
        prepareEmbedding(embedding.values ?? [], { allowPadding: true }),
      );
    },
  };
}

function createProvider(
  kind: EmbeddingsProviderKind,
  cfg: ReturnType<typeof embeddingsConfig>,
): EmbeddingsProvider {
  if (kind === "google") return googleProvider(cfg);
  if (kind === "pinecone") return pineconeProvider(cfg);
  return openAIProvider(cfg);
}

let provider: EmbeddingsProvider | null | undefined;
function getProvider(): EmbeddingsProvider | null {
  if (provider === undefined) {
    const cfg = embeddingsConfig();
    provider = cfg.apiKey ? createProvider(cfg.provider, cfg) : null;
  }
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
  if (!p) throw new Error("embeddings provider is not configured");
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

export const EMBED_BATCH = 50;

/**
 * Embed Reddit posts that lack vectors. Writes the embedding column via RPC
 * (pgvector arrays need a typed cast). No-ops without a provider.
 */
export async function embedUnembeddedPosts(): Promise<number> {
  const cfg = embeddingsConfig();
  if (!hasEmbeddingsProvider()) {
    console.warn("[embeddings] no provider configured — skipping (posts stay unembedded)");
    return 0;
  }
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");
  const { data, error } = await client
    .from("reddit_posts")
    .select("id, title, body")
    .or(
      `embedding.is.null,embedding_provider.is.null,embedding_model.is.null,embedding_provider.neq.${cfg.provider},embedding_model.neq.${cfg.model}`,
    )
    .limit(EMBED_BATCH);
  if (error) throw new Error(`select posts: ${error.message}`);
  const posts = (data as Pick<RedditPostRow, "id" | "title" | "body">[]) ?? [];
  if (posts.length === 0) return 0;

  const texts = posts.map((p) => `${p.title ?? ""}\n${p.body ?? ""}`.slice(0, 4000));
  const vectors = await embedTexts(texts);

  for (let i = 0; i < posts.length; i++) {
    const { error: upd } = await client.rpc("set_post_embedding_v2", {
      p_id: posts[i].id,
      p_vec: vectors[i],
      p_provider: cfg.provider,
      p_model: cfg.model,
    });
    if (upd) throw new Error(`set embedding ${posts[i].id}: ${upd.message}`);
  }
  console.log(
    `[embeddings] embedded ${posts.length} posts with ${cfg.provider}/${cfg.model}`,
  );
  return posts.length;
}
