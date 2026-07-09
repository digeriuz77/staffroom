import type { JobRow } from "../../src/lib/db/types";
import { computeTurnoverSignals } from "../../src/lib/analysis/turnover";

// Correlate posting deltas with sentiment shifts → turnover_signals.
export async function handleTurnover(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolId?: string };
  await computeTurnoverSignals(payload);
}
