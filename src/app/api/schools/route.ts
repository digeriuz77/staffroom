import { NextResponse } from "next/server";
import { searchSchools } from "@/lib/db/repo";
import { netValues, statsFor } from "@/lib/analysis/finance";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const all = await searchSchools(q);
  const results = all.slice(0, 20).map(({ school, records }) => {
    const median = records.length > 0 ? statsFor(netValues(records)).median : undefined;
    return {
      id: school.id,
      slug: school.slug,
      name: school.name,
      city: school.city,
      country: school.country,
      region: school.region,
      salaryCount: school.salaryCount,
      medianNetUsd: median,
    };
  });
  return NextResponse.json({ count: results.length, schools: results });
}
