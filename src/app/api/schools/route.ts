import { after, NextResponse } from "next/server";
import { searchSchools } from "@/lib/db/repo";
import { netValues, statsFor } from "@/lib/analysis/finance";
import {
  recordDiscoveryRequest,
  recordSchoolInterest,
} from "@/lib/db/interest";
import { enqueue } from "@/lib/db/queue";

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

  if (q.trim().length >= 2) {
    after(async () => {
      const uuidResults = results.filter((school) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          school.id,
        ),
      );
      if (uuidResults.length === 0) {
        await recordDiscoveryRequest(q);
        return;
      }
      await recordSchoolInterest(
        uuidResults.slice(0, 5).map((school) => school.id),
        "search",
      );
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(
        uuidResults.slice(0, 3).map((school) =>
          enqueue(
            "reddit_fetch",
            { schoolName: school.name, schoolId: school.id },
            { dedupeKey: `search-discovery-${school.id}-${today}` },
          ),
        ),
      );
    });
  }
  return NextResponse.json({ count: results.length, schools: results });
}
