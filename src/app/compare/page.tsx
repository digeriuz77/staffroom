import Link from "next/link";
import { buildSalaryReportAsync, formatUsd } from "@/lib/analysis/salary";
import { getTaxRateForCountry, getSchools } from "@/lib/db/repo";
import { verdictTone, TONE_CLASSES } from "@/lib/tone";
import { DataDisclaimer } from "@/components/ProvenanceBadge";
import { CompareSchoolSearch } from "@/components/CompareSchoolSearch";
import type { Metadata } from "next";
import type { SalaryReport } from "@/lib/analysis/salary";
import type { ColItem } from "@/lib/types";

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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      {/* Header */}
      <Link href={`/school/${entry.slug}`} className="block">
        <h2 className="text-lg font-bold text-white transition hover:text-indigo-300">{school.name}</h2>
        <p className="text-xs text-slate-500">{school.city}, {school.country}</p>
      </Link>

      <div className="mt-1 flex flex-wrap gap-1.5">
        {school.curricula.map((c) => (
          <span key={c} className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300">{c}</span>
        ))}
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{school.region}</span>
      </div>

      {/* Records */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{report.records.length}</span>
        <span className="text-xs text-slate-500">salary records</span>
      </div>

      {/* Salary stats */}
      <div className="mt-4 space-y-2.5 border-t border-white/5 pt-4">
        <Metric
          label="School median (net/mo)"
          value={formatUsd(schoolStats.median, true)}
          highlight={isBestMedian}
        />
        <Metric label="Country median" value={formatUsd(countryStats.median, true)} />
        <Metric label="Region median" value={formatUsd(regionStats.median, true)} />
        <Metric
          label="Country P25–P75"
          value={`${formatUsd(countryStats.p25, true)} – ${formatUsd(countryStats.p75, true)}`}
        />
      </div>

      {/* Tax regime */}
      {taxRate && (
        <div className="mt-4 space-y-2.5 border-t border-white/5 pt-4">
          <Metric label="Tax regime" value={taxRate.taxRegime} />
          <Metric
            label="Take-home %"
            value={`${Math.round(taxRate.takeHomePct * 100)}%`}
            highlight={isBestTakeHome}
          />
          <p className="text-[11px] text-slate-600">
            ~{Math.round(taxRate.effectiveRate * 100)}% effective tax
          </p>
        </div>
      )}

      {/* Cost of living */}
      {col && (
        <div className="mt-4 space-y-2.5 border-t border-white/5 pt-4">
          <Metric label="COL index" value={`${col.colIndex} (London=100)`} />
          <Metric
            label="Buying power (net/mo)"
            value={formatUsd(col.buyingPowerUsd, true)}
            highlight={isBestBuyingPower}
          />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <MiniMetric label="Beer" value={`$${col.beer.toFixed(0)}`} />
            <MiniMetric label="Gym/mo" value={`$${col.gym.toFixed(0)}`} />
            <MiniMetric label="Meal" value={`$${col.meal.toFixed(0)}`} />
          </div>
        </div>
      )}

      {/* Offer verdict */}
      {report.offer && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">Offer verdict</p>
          <p className={`text-base font-bold ${TONE_CLASSES[verdictTone(report.offer.verdict)].text}`}>
            {report.offer.verdict}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatUsd(report.offer.offeredMonthlyUsd)}/mo · {Math.round(report.offer.percentileVsCountry)}%ile
          </p>
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

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-emerald-300" : "text-slate-200"}`}>
        {value}
        {highlight && <span className="ml-1 text-[10px] text-emerald-400/60">★</span>}
      </span>
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
