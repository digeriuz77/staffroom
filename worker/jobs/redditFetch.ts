import type { JobRow } from "../../src/lib/db/types";
import { fetchAndStoreReddit } from "../../src/lib/ai/redditIngest";

// Fetch new Reddit posts for a school (or a subreddit sweep) and store them.
export async function handleRedditFetch(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolName?: string; subreddit?: string; schoolId?: string };
  await fetchAndStoreReddit(payload);
}
