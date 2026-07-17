// Cron entrypoint: enqueues scheduled jobs. Run on a fixed schedule via
// Railway cron (e.g. daily) or system cron. Idempotent via dedupe keys.
//
//   bun run worker/cron.ts          # runs all due schedules
//   bun run worker/cron.ts daily    # only daily schedules
//
import { enqueue } from "../src/lib/db/queue";

async function scheduleAll() {
  const which = process.argv[2]; // undefined = all
  const due = (k: string) => !which || which === k;

  // Daily: FX refresh, scraper sweep, gap detection.
  const tasks: Promise<unknown>[] = [];
  if (due("daily")) {
    tasks.push(enqueue("fx", {}, { dedupeKey: "fx-daily" }));
    tasks.push(enqueue("scrape", { scope: "all" }, { dedupeKey: "scrape-daily" }));
    tasks.push(enqueue("gap_detect", {}, { dedupeKey: "gap-weekly" }));
    tasks.push(enqueue("embed", {}, { dedupeKey: "embed-ondemand" }));
    tasks.push(enqueue("cluster", {}, { dedupeKey: "cluster-daily" }));
  }
  // Hourly: Reddit ingest.
  if (due("hourly")) {
    tasks.push(enqueue("reddit_fetch", { mode: "sweep" }, { dedupeKey: "reddit-hourly" }));
  }
  // Weekly: baselines + turnover correlation.
  if (due("weekly")) {
    tasks.push(enqueue("baseline", {}, { dedupeKey: "baseline-weekly" }));
    tasks.push(enqueue("turnover", {}, { dedupeKey: "turnover-weekly" }));
  }
  const ids = await Promise.all(tasks);
  console.log(`[cron] enqueued ${ids.filter(Boolean).length} jobs`);
}

scheduleAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
