import type { JobRow } from "../../src/lib/db/types";
import { generateSchoolBrief } from "../../src/lib/ai/briefs";

export async function handleBrief(job: JobRow): Promise<void> {
  await generateSchoolBrief({
    schoolId:
      typeof job.payload.schoolId === "string"
        ? job.payload.schoolId
        : undefined,
  });
}
