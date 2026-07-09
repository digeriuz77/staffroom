import { NextResponse } from "next/server";
import { getDerivedSchool } from "@/lib/data/schools";
import { computeTANE, type TaneResult } from "@/lib/analysis/tane";
import { defaultHousehold } from "@/lib/analysis/household";
import { statsFor } from "@/lib/analysis/finance";
import type { Household } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { slug?: string; household?: Household; offerMonthlyUsd?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const derived = getDerivedSchool(slug);
  if (!derived) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const household = body.household ?? defaultHousehold();
  const records = derived.records;
  if (records.length === 0) {
    return NextResponse.json({ error: "No salary records for this school" }, { status: 404 });
  }

  // Use the median net record as the representative package.
  const { median } = statsFor(records.map((r) => r.netMonthlyUsd));
  const rep =
    records.reduce((best, r) =>
      Math.abs(r.netMonthlyUsd - median) < Math.abs(best.netMonthlyUsd - median) ? r : best,
    );

  // If an offer is supplied, compute TANE for the offer too.
  let offerTane: TaneResult | null = null;
  if (body.offerMonthlyUsd && Number.isFinite(body.offerMonthlyUsd)) {
    const offerRec = {
      ...rep,
      netMonthlyUsd: body.offerMonthlyUsd,
      monthlySalaryUsd: body.offerMonthlyUsd,
    };
    offerTane = await computeTANE(offerRec, household);
  }

  const tane = await computeTANE(rep, household);
  return NextResponse.json({ tane, offerTane, household });
}
