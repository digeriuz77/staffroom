import { NextResponse } from "next/server";
import { getTaxRateForCountry } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  if (!country) {
    return NextResponse.json({ error: "country query param is required" }, { status: 400 });
  }
  const rate = await getTaxRateForCountry(country);
  return NextResponse.json(rate);
}
