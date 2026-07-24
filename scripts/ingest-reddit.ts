// Script to sweep subreddits (including r/intschoolreview) and ingest posts into Supabase
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/ingest-reddit.ts

import { fetchAndStoreReddit } from "../src/lib/ai/redditIngest";

async function runSweep() {
  console.log("Starting Subreddit Sweep (including r/intschoolreview)...");
  try {
    const totalStored = await fetchAndStoreReddit({ mode: "sweep" });
    console.log(`Sweep complete! Successfully ingested ${totalStored} posts into Supabase.`);
  } catch (e) {
    console.error("Sweep failed:", e);
    process.exit(1);
  }
}

runSweep();
