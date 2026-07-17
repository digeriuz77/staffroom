import type { JobRow } from "../../src/lib/db/types";
import { fetchAndStoreReddit } from "../../src/lib/ai/redditIngest";
import { enqueue } from "../../src/lib/db/queue";

// Fetch new Reddit posts for a school (or a subreddit sweep) and store them.
export async function handleRedditFetch(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolName?: string; subreddit?: string; schoolId?: string };
  const stored = await fetchAndStoreReddit(payload);
  if (stored === 0 || !payload.schoolId) return;

  const today = new Date().toISOString().slice(0, 10);
  await enqueue("embed", {}, { dedupeKey: `embed-${today}` });
  await enqueue(
    "cluster",
    { schoolId: payload.schoolId },
    { dedupeKey: `cluster-school-${payload.schoolId}-${today}` },
  );
  await enqueue(
    "brief",
    { schoolId: payload.schoolId },
    { dedupeKey: `brief-school-${payload.schoolId}-${today}` },
  );
}
