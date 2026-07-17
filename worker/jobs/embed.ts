import type { JobRow } from "../../src/lib/db/types";
import { embedUnembeddedPosts } from "../../src/lib/ai/embeddings";

// Embed Reddit posts that lack vectors.
export async function handleEmbed(_job: JobRow): Promise<void> {
  await embedUnembeddedPosts();
}
