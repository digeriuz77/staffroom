import { NextResponse } from "next/server";
import { COST_OF_LIVING, colNearest } from "@/lib/data/costOfLiving";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const country = searchParams.get("country") ?? "";

  if (city || country) {
    const match = colNearest(city, country);
    if (match) return NextResponse.json({ city: match });
  }

  const sorted = [...COST_OF_LIVING].sort((a, b) => b.buyingPowerUsd - a.buyingPowerUsd);
  return NextResponse.json({ cities: sorted });
}
