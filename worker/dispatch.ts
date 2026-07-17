import { claimNextJob, completeJob, failJob } from "../src/lib/db/queue";
import type { JobRow, JobType } from "../src/lib/db/types";
import { handleBaseline } from "./jobs/baseline";
import { handleBrief } from "./jobs/brief";
import { handleCluster } from "./jobs/cluster";
import { handleEmbed } from "./jobs/embed";
import { handleFx } from "./jobs/fx";
import { handleGapDetect } from "./jobs/gapDetect";
import { handleRedditFetch } from "./jobs/redditFetch";
import { handleScrape } from "./jobs/scrape";
import { handleTurnover } from "./jobs/turnover";

type Handler = (job: JobRow) => Promise<void>;

const HANDLERS: Record<JobType, Handler> = {
  reddit_fetch: handleRedditFetch,
  embed: handleEmbed,
  cluster: handleCluster,
  scrape: handleScrape,
  baseline: handleBaseline,
  turnover: handleTurnover,
  fx: handleFx,
  gap_detect: handleGapDetect,
  brief: handleBrief,
};

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const handler = HANDLERS[job.type];
  console.log(`[worker] claimed ${job.type} ${job.id}`);
  try {
    if (!handler) throw new Error(`no handler for ${job.type}`);
    await handler(job);
    await completeJob(job.id);
    console.log(`[worker] done ${job.type} ${job.id}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[worker] failed ${job.type} ${job.id}: ${reason}`);
    await failJob(job.id, reason);
  }
  return true;
}
