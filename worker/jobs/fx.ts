import type { JobRow } from "../../src/lib/db/types";
import { supabaseServer } from "../../src/lib/db/supabaseClients";
import { FX_SOURCE } from "../../src/lib/config/jobs";

// Refresh FX rates from a free source (USD base). Fail-soft to last-known rates.
export async function handleFx(_job: JobRow): Promise<void> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let rates: Record<string, number> = {};
  try {
    const res = await fetch(FX_SOURCE, { signal: controller.signal });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      rates = data.rates ?? {};
    }
  } finally {
    clearTimeout(timeout);
  }
  if (Object.keys(rates).length === 0) throw new Error("empty FX response");

  // Source returns USD-base rates (units per USD). rate_to_usd = 1 / units_per_usd.
  const rows = Object.entries(rates).map(([currency, unitsPerUsd]) => ({
    currency,
    rate_to_usd: 1 / unitsPerUsd,
    fetched_at: new Date().toISOString(),
  }));
  // Ensure USD exists.
  if (!rows.find((r) => r.currency === "USD")) {
    rows.push({ currency: "USD", rate_to_usd: 1, fetched_at: new Date().toISOString() });
  }
  const { error } = await client.from("fx_rates").upsert(rows, { onConflict: "currency" });
  if (error) throw new Error(`fx upsert: ${error.message}`);
  console.log(`[fx] updated ${rows.length} rates`);
}
