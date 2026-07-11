import { NextResponse } from "next/server";
import { estimateTakeHome } from "@/lib/analysis/takeHome";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { grossMonthlyUsd?: number; country?: string; city?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const gross = body.grossMonthlyUsd;
  const country = (body.country ?? "").trim();
  if (!gross || !Number.isFinite(gross) || gross <= 0) {
    return NextResponse.json({ error: "grossMonthlyUsd must be a positive number" }, { status: 400 });
  }
  if (!country) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }

  const estimate = await estimateTakeHome(gross, country, body.city);
  return NextResponse.json(estimate);
}
