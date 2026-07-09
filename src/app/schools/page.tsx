import type { Metadata } from "next";
import Link from "next/link";
import { deriveSchools } from "@/lib/data/schools";
import { REGION_ORDER } from "@/lib/types";
import { formatUsd } from "@/lib/analysis/finance";
import { netValues, statsFor } from "@/lib/analysis/finance";

export const metadata: Metadata = {
  title: "Browse Schools — Staffroom Intel",
  description: "Browse real international school salary data by region and country.",
};

export default function SchoolsPage() {
  const all = deriveSchools();
  const byRegion = new Map<string, typeof all>();
  for (const s of all) {
    const list = byRegion.get(s.school.region) ?? [];
    list.push(s);
    byRegion.set(s.school.region, list);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Browse schools</h1>
        <p className="mt-2 text-slate-400">
          {all.length} schools with real salary data across {byRegion.size} regions.
        </p>
      </header>

      <div className="space-y-10">
        {REGION_ORDER.map((region) => {
          const list = byRegion.get(region);
          if (!list || list.length === 0) return null;
          return (
            <section key={region}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-white">{region}</h2>
                <span className="text-sm text-slate-500">{list.length} schools</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map(({ school, records }) => {
                  const med = statsFor(netValues(records)).median;
                  return (
                    <Link
                      key={school.id}
                      href={`/school/${school.slug}`}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-indigo-400/30 hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white group-hover:text-indigo-300">{school.name}</p>
                        <p className="text-xs text-slate-500">{school.city}, {school.country} · {records.length} record{records.length !== 1 ? "s" : ""}</p>
                      </div>
                      {med > 0 && (
                        <span className="ml-3 shrink-0 text-sm font-semibold text-white">{formatUsd(med, true)}/mo</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
