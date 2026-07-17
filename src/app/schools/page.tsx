import type { Metadata } from "next";
import { getSchools } from "@/lib/db/repo";
import { REGION_ORDER } from "@/lib/types";
import { formatUsd } from "@/lib/analysis/finance";
import { netValues, statsFor } from "@/lib/analysis/finance";
import {
  SchoolDirectory,
  type SchoolDirectoryEntry,
} from "@/components/SchoolDirectory";

export const metadata: Metadata = {
  title: "Browse Schools — Staffroom Intel",
  description: "Browse real international school salary data by region and country.",
};

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const all = await getSchools();
  const entries: SchoolDirectoryEntry[] = all.map(({ school, records }) => {
    const median = statsFor(netValues(records)).median;
    return {
      id: school.id,
      slug: school.slug,
      name: school.name,
      city: school.city,
      country: school.country,
      region: school.region,
      recordCount: records.length,
      medianLabel: median > 0 ? formatUsd(median, true) : null,
    };
  });
  const activeRegions = REGION_ORDER.filter((region) =>
    entries.some((school) => school.region === region),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Browse schools</h1>
        <p className="mt-2 text-slate-400">
          Search {all.length} schools, or choose a region without scrolling through the full directory.
        </p>
      </header>

      <SchoolDirectory schools={entries} regions={activeRegions} />
    </main>
  );
}
