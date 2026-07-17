import { NextResponse } from "next/server";
import { loadFxRates, popularCurrencies } from "@/lib/finance/currency";

export const runtime = "nodejs";

export async function GET() {
  const rates = await loadFxRates();
  return NextResponse.json({ rates, currencies: popularCurrencies() });
}
