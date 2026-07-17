import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/net/safeFetch";
import { parseJobLink } from "@/lib/parser/jobLink";
import { getSchoolDirectory } from "@/lib/db/repo";
import { loadFxRates } from "@/lib/finance/currency";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { url?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  const pastedText = (body.text ?? "").trim();

  if (!url && !pastedText) {
    return NextResponse.json({ error: "Either a URL or pasted job description text is required" }, { status: 400 });
  }

  // Fetch HTML (may fail due to scraping blocks — that's OK) alongside the
  // live school directory + FX rates used for matching and conversion.
  const [fetched, schools, fx] = await Promise.all([
    url ? safeFetch(url, { timeoutMs: 6000 }) : Promise.resolve(null),
    getSchoolDirectory(),
    loadFxRates(),
  ]);
  const html = fetched?.ok ? fetched.text : "";

  // Parse from whatever sources we have: fetched HTML + pasted text.
  const parsed = parseJobLink(url, { html, text: pastedText, schools, fx });

  // If we got nothing useful and there's pasted text, surface it as a signal.
  if (!parsed.matchedSchoolId && !parsed.offeredMonthlyUsd && pastedText) {
    parsed.warning = "We extracted what we could from the text. Search for the school and enter the salary manually below.";
  }

  return NextResponse.json({ parsed });
}
