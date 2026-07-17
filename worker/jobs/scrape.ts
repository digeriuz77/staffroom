import type { JobRow } from "../../src/lib/db/types";
import { runScraper } from "../../src/lib/scraper/boardScraper";

// Poll job boards for a school/region and dedupe into job_postings.
export async function handleScrape(job: JobRow): Promise<void> {
  const payload = job.payload as { schoolId?: string; source?: string; region?: string };
  await runScraper(payload);
}
