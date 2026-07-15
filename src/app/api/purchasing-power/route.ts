import { NextResponse } from "next/server";
import { getColNearest, getColItems } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const country = searchParams.get("country") ?? "";

  if (city || country) {
    const match = await getColNearest(city, country);
    if (match) return NextResponse.json({ city: match });
  }

  const items = await getColItems();
  const sorted = [...items].sort((a, b) => b.buyingPowerUsd - a.buyingPowerUsd);
  return NextResponse.json({ cities: sorted });
}
