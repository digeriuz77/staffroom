// Currency conversion: USD is canonical in the DB. Display-time FX applies a
// maintained rate (refreshed by the `fx` worker job). Comparisons stay USD
// internally so cross-school ordering is always consistent.
import { supabaseServer } from "@/lib/db/supabaseClients";
import type { FxRateRow } from "@/lib/db/types";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.52,
  CAD: 1.37,
  AED: 3.67,
  CNY: 7.24,
  THB: 36,
  JPY: 156,
  SGD: 1.35,
};

let cache: { rates: Record<string, number>; at: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour in-process cache

/** Fetch all rates (rate_to_usd) from Supabase, falling back to a static set. */
export async function loadFxRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rates;
  const client = supabaseServer();
  let rates: Record<string, number> = { ...FALLBACK_RATES };
  if (client) {
    const { data } = await client.from("fx_rates").select("currency, rate_to_usd");
    for (const r of (data as Pick<FxRateRow, "currency" | "rate_to_usd">[]) ?? []) {
      rates[r.currency.toUpperCase()] = r.rate_to_usd;
    }
  }
  cache = { rates, at: Date.now() };
  return rates;
}

/**
 * Convert a canonical-USD amount to the display currency.
 * rate_to_usd is "units per USD" semantics stored as 1/units... we stored
 * rate_to_usd = 1/unitsPerUsd, so displayAmount = usd / rate_to_usd.
 */
export function convertUsd(usd: number, currency: string, rates: Record<string, number>): number {
  const rate = rates[currency.toUpperCase()];
  if (!rate || rate === 0) return usd;
  return usd / rate;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  AED: "د.إ",
  CNY: "¥",
  THB: "฿",
  JPY: "¥",
  SGD: "S$",
};

const POPULAR = ["USD", "GBP", "EUR", "AUD", "CAD", "AED", "CNY", "THB", "JPY", "SGD"];

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? `${code} `;
}

export function popularCurrencies(): string[] {
  return POPULAR;
}

/** Format a USD-canonical amount into the chosen display currency. */
export function formatCurrency(
  usd: number,
  currency: string,
  rates: Record<string, number>,
  compact?: boolean,
): string {
  const sym = currencySymbol(currency);
  const value = convertUsd(usd, currency, rates);
  if (compact && Math.abs(value) >= 1000) {
    return `${sym}${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}
