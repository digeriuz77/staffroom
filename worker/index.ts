// Worker entrypoint: drains the Supabase `jobs` queue on a loop.
// Deploy on Railway as an always-on service. Set SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, REDDIT_*, EMBEDDINGS_API_KEY as Railway env vars.
import { claimNextJob, completeJob, failJob } from "../src/lib/db/queue";
import { handleRedditFetch } from "./jobs/redditFetch";
import { handleEmbed } from "./jobs/embed";
import { handleCluster } from "./jobs/cluster";
import { handleScrape } from "./jobs/scrape";
import { handleBaseline } from "./jobs/baseline";
import { handleTurnover } from "./jobs/turnover";
import { handleFx } from "./jobs/fx";
import { handleGapDetect } from "./jobs/gapDetect";
import type { JobRow, JobType } from "../src/lib/db/types";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const IDLE_LOG_MS = 60_000;

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
};

let lastLog = Date.now();

async function tick(): Promise<void> {
  const job = await claimNextJob();
  if (!job) {
    if (Date.now() - lastLog > IDLE_LOG_MS) {
      console.log(`[worker] queue idle @ ${new Date().toISOString()}`);
      lastLog = Date.now();
    }
    return;
  }
  const handler = HANDLERS[job.type];
  console.log(`[worker] claimed ${job.type} ${job.id}`);
  try {
    if (!handler) throw new Error(`no handler for ${job.type}`);
    await handler(job);
    await completeJob(job.id);
    console.log(`[worker] done ${job.type} ${job.id}`);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`[worker] failed ${job.type} ${job.id}: ${reason}`);
    await failJob(job.id, reason);
  }
}

async function loop(): Promise<void> {
  console.log(`[worker] started (poll every ${POLL_MS}ms)`);
  while (true) {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] tick error:", e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

loop();
