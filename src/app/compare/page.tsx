import Link from "next/link";
import { buildSalaryReportAsync, formatUsd } from "@/lib/analysis/salary";
import { getTaxRateForCountry } from "@/lib/db/repo";
import { DataDisclaimer } from "@/components/ProvenanceBadge";
import { CompareSchoolSearch } from "@/components/CompareSchoolSearch";
import { ComparisonBanner, ComparisonMatrix } from "@/components/ComparisonMatrix";
import type { Metadata } from "next";
import type { SalaryReport } from "@/lib/analysis/salary";

export const metadata: Metadata = {
  title: "Compare Schools — Staffroom Intel",
  description: "Side-by-side comparison of international school salary packages, tax regimes, and cost of living.",
};

export const dynamic = "force-dynamic";

interface CompareEntry {
  slug: string;
  report: SalaryReport | null;
  taxRate: { takeHomePct: number; taxRegime: string; effectiveRate: number } | null;
}

function normalizeSlugs(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : (raw ?? "").split(",");
  return list.map((s) => s.trim()).filter(Boolean).slice(0, 3);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ schools?: string | string[] }>;
}) {
  const sp = await searchParams;
  const slugs = normalizeSlugs(sp.schools);

  const entries: CompareEntry[] = await Promise.all(
    slugs.map(async (slug) => {
      const report = await buildSalaryReportAsync(slug);
      const taxRate = report ? await getTaxRateForCountry(report.school.country) : null;
      return {
        slug,
        report,
        taxRate: taxRate
          ? {
              takeHomePct: taxRate.takeHomePct,
              taxRegime: taxRate.taxRegime,
              effectiveRate: taxRate.effectiveRate,
            }
          : null,
      } satisfies CompareEntry;
    }),
  );

  const validEntries = entries.filter((e) => e.report);
  const hasData = validEntries.length > 0;

  // Compute "best" indices for highlighting.
  const bestMedianIdx = bestIndex(validEntries, (e) => e.report?.schoolStats.median);
  const bestTakeHomeIdx = bestIndex(validEntries, (e) => e.taxRate?.takeHomePct);
  const bestBuyingPowerIdx = bestIndex(validEntries, (e) => e.report?.col?.buyingPowerUsd);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Compare schools</h1>
        <p className="mt-2 text-slate-400">
          Side-by-side salary packages, tax regimes, and cost of living. Pick up to 3 schools from the browse page or search below.
        </p>
      </header>
      <CompareSchoolSearch />

      {hasData && (
        <div className="mt-8 space-y-8">
          {/* Overall recommendation */}
          <ComparisonBanner entries={entries} />

          {/* Quick visual summary — one card per school */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e, i) => (
              <SchoolCard
                key={e.slug}
                entry={e}
                isBestMedian={i === bestMedianIdx}
                isBestTakeHome={i === bestTakeHomeIdx}
                isBestBuyingPower={i === bestBuyingPowerIdx}
              />
            ))}
          </div>

          {/* Detailed side-by-side matrix */}
          <ComparisonMatrix entries={entries} />
        </div>
      )}

      {!hasData && slugs.length > 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          No matching schools found for: {slugs.join(", ")}. Try searching above or browsing the{" "}
          <Link href="/schools" className="text-indigo-300 hover:text-indigo-200">schools directory</Link>.
        </div>
      )}

      {!hasData && slugs.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          Select schools above or from the{" "}
          <Link href="/schools" className="text-indigo-300 hover:text-indigo-200">browse page</Link>{" "}
          to start comparing. You can compare up to 3 at once.
        </div>
      )}

      <div className="mt-8">
        <DataDisclaimer />
      </div>
    </main>
  );
}

function bestIndex(entries: CompareEntry[], getter: (e: CompareEntry) => number | undefined | null): number {
  const vals = entries.map((e) => getter(e) ?? -Infinity);
  if (vals.length < 2) return -1;
  const max = Math.max(...vals);
  if (max === -Infinity) return -1;
  return vals.indexOf(max);
}

function SchoolCard({
  entry,
  isBestMedian,
  isBestTakeHome,
  isBestBuyingPower,
}: {
  entry: CompareEntry;
  isBestMedian: boolean;
  isBestTakeHome: boolean;
  isBestBuyingPower: boolean;
}) {
  const { report, taxRate } = entry;
  if (!report) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-slate-600">School not found: {entry.slug}</p>
      </div>
    );
  }

  const { school, schoolStats, countryStats, regionStats, col } = report;
  const anyHighlight = isBestMedian || isBestTakeHome || isBestBuyingPower;

  return (
    <div className={`flex flex-col rounded-2xl border p-5 transition ${
      anyHighlight
        ? "border-emerald-500/25 bg-emerald-500/[0.03]"
        : "border-white/10 bg-white/[0.03]"
    }`}>
      {/* Header */}
      <Link href={`/school/${entry.slug}`} className="block">
        <h2 className="text-base font-bold text-white transition hover:text-indigo-300">{school.name}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{school.city}, {school.country}</p>
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {school.curricula.map((c) => (
          <span key={c} className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300">{c}</span>
        ))}
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{school.region}</span>
        <span className="ml-auto text-[10px] text-slate-600">{report.records.length} record{report.records.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Hero stat: school median */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Median net salary</p>
        <p className={`mt-0.5 text-2xl font-extrabold ${isBestMedian ? "text-emerald-300" : "text-white"}`}>
          {formatUsd(schoolStats.median, true)}
          <span className="text-sm font-medium text-slate-500">/mo</span>
          {isBestMedian && <span className="ml-1.5 text-xs text-emerald-400">★ best</span>}
        </p>
      </div>

      {/* Key metrics — 2-col grid */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <KeyMetric
          label="Take-home"
          value={taxRate ? `${Math.round(taxRate.takeHomePct * 100)}%` : "—"}
          highlight={isBestTakeHome}
        />
        <KeyMetric
          label="Buying power"
          value={col ? formatUsd(col.buyingPowerUsd, true) : "—"}
          highlight={isBestBuyingPower}
        />
        <KeyMetric label="Country median" value={formatUsd(countryStats.median, true)} />
        <KeyMetric label="Region median" value={formatUsd(regionStats.median, true)} />
      </div>

      {/* Context rows */}
      <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Middle 50% range</span>
          <span className="font-medium text-slate-300">
            {formatUsd(countryStats.p25, true)} – {formatUsd(countryStats.p75, true)}
          </span>
        </div>
        {taxRate && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Tax regime</span>
            <span className="font-medium text-slate-300">{taxRate.taxRegime}</span>
          </div>
        )}
        {col && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">COL index</span>
            <span className="font-medium text-slate-300">{col.colIndex} <span className="text-slate-600">(London=100)</span></span>
          </div>
        )}
      </div>

      {/* COL price snapshot */}
      {col && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3">
          <MiniMetric label="Beer" value={`$${col.beer.toFixed(0)}`} />
          <MiniMetric label="Gym/mo" value={`$${col.gym.toFixed(0)}`} />
          <MiniMetric label="Meal" value={`$${col.meal.toFixed(0)}`} />
        </div>
      )}

      <div className="mt-auto pt-4">
        <Link
          href={`/school/${entry.slug}`}
          className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
        >
          View full report →
        </Link>
      </div>
    </div>
  );
}

function KeyMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${
      highlight
        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
        : "border-white/5 bg-white/[0.02]"
    }`}>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-emerald-300" : "text-white"}`}>
        {value}
        {highlight && <span className="ml-1 text-[9px] text-emerald-400/70">★</span>}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-center">
      <p className="text-[10px] text-slate-600">{label}</p>
      <p className="text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
