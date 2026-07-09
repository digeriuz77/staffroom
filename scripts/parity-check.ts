// Parity check: compares aggregate medians/p25/p75 from Supabase against the
// in-memory TSV dataset, to confirm the migration didn't skew the data.
// Run after `db:seed`:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/parity-check.ts
//
import { createClient } from "@supabase/supabase-js";
import { SALARIES } from "../src/lib/data/schools";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false } });

function pick(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
function stats(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return { count: s.length, p25: pick(s, 0.25), median: pick(s, 0.5), p75: pick(s, 0.75) };
}
function within(a: number, b: number, tol = 0.01): boolean {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) <= tol;
}

async function main() {
  const { data, error } = await client
    .from("salary_records")
    .select("net_monthly_usd")
    .eq("status", "approved");
  if (error || !data) {
    console.error("query failed:", error?.message);
    process.exit(1);
  }
  const dbVals = (data as { net_monthly_usd: number }[]).map((r) => r.net_monthly_usd);
  const tsvVals = SALARIES.map((r) => r.netMonthlyUsd);
  const db = stats(dbVals);
  const tsv = stats(tsvVals);

  console.log("DB :", db);
  console.log("TSV:", tsv);

  const checks = [
    ["count", db.count, tsv.count, db.count === tsv.count],
    ["p25", db.p25, tsv.p25, within(db.p25, tsv.p25)],
    ["median", db.median, tsv.median, within(db.median, tsv.median)],
    ["p75", db.p75, tsv.p75, within(db.p75, tsv.p75)],
  ] as const;

  let ok = true;
  for (const [, , , pass] of checks) if (!pass) ok = false;
  console.log(ok ? "\nPARITY OK" : "\nPARITY MISMATCH");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
