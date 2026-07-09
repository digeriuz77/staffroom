import type { JobRow } from "../../src/lib/db/types";
import { computeBaselines } from "../../src/lib/analysis/turnover";

// Recompute per-school posting-frequency baselines.
export async function handleBaseline(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolId?: string };
  await computeBaselines(payload);
}
