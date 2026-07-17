import type { JobRow } from "../../src/lib/db/types";
import {
  EMBED_BATCH,
  embedUnembeddedPosts,
} from "../../src/lib/ai/embeddings";

// Embed Reddit posts that lack vectors.
export async function handleEmbed(_job: JobRow): Promise<void> {
  for (let pass = 0; pass < 20; pass++) {
    const embedded = await embedUnembeddedPosts();
    if (embedded < EMBED_BATCH) return;
  }
}
