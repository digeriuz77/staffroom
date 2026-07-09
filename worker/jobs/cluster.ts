import type { JobRow } from "../../src/lib/db/types";
import { runClustering } from "../../src/lib/ai/clustering";

// Cluster embedded posts into themes per school (and global), write theme_clusters.
export async function handleCluster(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolId?: string };
  await runClustering(payload);
}
