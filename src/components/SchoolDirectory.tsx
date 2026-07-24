"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export interface SchoolDirectoryEntry {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  region: string;
  recordCount: number;
  medianLabel: string | null;
}

export function SchoolDirectory({
  schools,
  regions,
}: {
  schools: SchoolDirectoryEntry[];
  regions: string[];
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("Featured");
  const [remote, setRemote] = useState<{
    query: string;
    schools: SchoolDirectoryEntry[];
  } | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/schools?q=${encodeURIComponent(normalized)}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: { schools?: {
          id: string;
          slug: string;
          name: string;
          city: string;
          country: string;
          region: string;
          salaryCount: number;
          medianNetUsd?: number;
        }[] }) => {
          setRemote({
            query: normalized.toLowerCase(),
            schools: (data.schools ?? []).map((school) => ({
              ...school,
              recordCount: school.salaryCount,
              medianLabel: school.medianNetUsd
                ? `$${(school.medianNetUsd / 1000).toFixed(1)}k`
                : null,
            })),
          });
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setRemote({ query: normalized.toLowerCase(), schools: [] });
          }
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      if (remote?.query === normalized) return remote.schools;
      return schools
        .filter((school) =>
          `${school.name} ${school.city} ${school.country}`
            .toLowerCase()
            .includes(normalized),
        )
        .slice(0, 60);
    }
    if (region === "Featured") return schools.slice(0, 18);
    return schools.filter((school) => school.region === region);
  }, [query, region, remote, schools]);

  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto]">
        <label>
          <span className="sr-only">Search schools</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by school, city, or country"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>
        <label>
          <span className="sr-only">Filter by region</span>
          <select
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              setQuery("");
            }}
            disabled={Boolean(query)}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0c0f17] px-4 text-sm text-slate-300 outline-none focus:border-indigo-400/50 sm:w-48"
          >
            <option value="Featured">Featured</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">
          {query ? "Search results" : region === "Featured" ? "Popular starting points" : region}
        </h2>
        <span className="text-sm text-slate-500">{visible.length} schools</span>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((school) => (
            <Link
              key={school.id}
              href={`/school/${school.slug}`}
              className="group flex min-w-0 items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition active:scale-[0.99] hover:border-indigo-400/40 hover:bg-white/[0.07] shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base border border-white/10 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10">
                  🏫
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                    {school.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {school.city}, {school.country} · <span className="text-slate-500">{school.recordCount} rec{school.recordCount !== 1 ? "s" : ""}</span>
                  </p>
                </div>
              </div>

              <div className="ml-3 flex shrink-0 items-center gap-2">
                {school.medianLabel && (
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    {school.medianLabel}/mo
                  </span>
                )}
                <span className="text-sm font-bold text-slate-500 group-hover:translate-x-0.5 group-hover:text-indigo-300 transition">
                  ›
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          No matching school yet. Try a city or country, then use Contribute to request missing data.
        </div>
      )}
    </div>
  );
}
