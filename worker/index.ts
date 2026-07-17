// Always-on worker entrypoint. Low-traffic deployments can instead schedule
// worker/runOnce.ts and avoid paying for an idle process.
import { processNextJob } from "./dispatch";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const IDLE_LOG_MS = 60_000;

let lastLog = Date.now();

async function tick(): Promise<void> {
  const processed = await processNextJob();
  if (!processed) {
    if (Date.now() - lastLog > IDLE_LOG_MS) {
      console.log(`[worker] queue idle @ ${new Date().toISOString()}`);
      lastLog = Date.now();
    }
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
