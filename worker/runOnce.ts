import { processNextJob } from "./dispatch";

const maxJobs = Math.max(1, Number(process.env.WORKER_MAX_JOBS ?? 25));

async function main(): Promise<void> {
  let processed = 0;
  while (processed < maxJobs && (await processNextJob())) {
    processed++;
  }
  console.log(`[worker-once] processed ${processed} job${processed === 1 ? "" : "s"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
