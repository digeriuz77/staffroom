import { NextResponse } from "next/server";
import { parseJobLink } from "@/lib/parser/jobLink";
import { searchDerivedSchools } from "@/lib/data/schools";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = searchDerivedSchools(q).slice(0, 20).map(({ school }) => ({
    id: school.id,
    slug: school.slug,
    name: school.name,
    city: school.city,
    country: school.country,
    region: school.region,
    salaryCount: school.salaryCount,
  }));
  return NextResponse.json({ count: results.length, schools: results });
}
