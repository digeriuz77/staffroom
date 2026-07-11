import Link from "next/link";
import { notFound } from "next/navigation";
import { getDerivedSchool } from "@/lib/data/schools";
import { buildSalaryReport, formatUsd } from "@/lib/analysis/salary";
import { Histogram, StatBar } from "@/components/charts";
import { SentimentPanel } from "@/components/SentimentPanel";
import { TanePanel } from "@/components/TanePanel";
import { ArrowIcon } from "@/components/icons";
import { verdictTone, sentimentTone, TONE_CLASSES, pct } from "@/lib/tone";
import { getTaxRateForCountry } from "@/lib/db/repo";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const derived = getDerivedSchool(slug);
  if (!derived) return { title: "School not found" };
  return {
    title: `${derived.school.name} — salary, purchasing power & sentiment`,
    description: `Real salary data, cost of living and teacher reviews for ${derived.school.name} in ${derived.school.city}, ${derived.school.country}.`,
  };
}

export default async function SchoolReport({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ offer?: string }>;
}) {
  const { slug } = await params;
  const { offer } = await searchParams;
  const offerMonthly = offer ? Number(offer) : undefined;
  const derived = getDerivedSchool(slug);
  if (!derived) notFound();

  const job = offerMonthly && Number.isFinite(offerMonthly)
    ? { ok: true, source: "unknown" as const, rawUrl: "", offeredMonthlyUsd: offerMonthly }
    : null;

  const report = buildSalaryReport(slug, job);
  if (!report) notFound();

  const { school, schoolStats, countryStats, regionStats, histogram, col, offer: offerAnalysis, records } = report;
  const taxRate = await getTaxRateForCountry(school.country);
  const vTone = offerAnalysis ? verdictTone(offerAnalysis.verdict) : null;
  const vClasses = vTone ? TONE_CLASSES[vTone] : null;
  const lo = Math.min(countryStats.min, regionStats.min);
  const hi = Math.max(countryStats.max, regionStats.max);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/schools" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white">
        ← All schools
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md bg-white/5 px-2 py-0.5">{school.country}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">{school.city}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">{school.region}</span>
          {school.curricula.map((c) => (
            <span key={c} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-indigo-300">{c}</span>
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{school.name}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {records.length} real salary record{records.length !== 1 ? "s" : ""} · data from {Math.min(...school.years)}–{Math.max(...school.years)}
        </p>
      </header>

      {offerAnalysis && vClasses && (
        <div className={`mb-8 overflow-hidden rounded-2xl border ${vClasses.border} ${vClasses.bg} p-6 animate-rise`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Salary verdict</p>
              <p className={`mt-1 text-2xl font-bold ${vClasses.text}`}>{offerAnalysis.verdict}</p>
              <p className="mt-1 max-w-md text-sm text-slate-400">{offerAnalysis.verdictReason}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Your offer</p>
              <p className="text-2xl font-bold text-white">{formatUsd(offerAnalysis.offeredMonthlyUsd)}/mo</p>
              <p className="text-xs text-slate-500">net ~{formatUsd(offerAnalysis.netMonthlyUsd)}/mo</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="vs country" value={pct(offerAnalysis.percentileVsCountry)} sub="percentile" />
            <MiniStat label="vs region" value={pct(offerAnalysis.percentileVsRegion)} sub="percentile" />
            <MiniStat label="monthly savings" value={formatUsd(offerAnalysis.monthlySavingsUsd)} sub={`${pct(offerAnalysis.savingsRate)} of net`} />
            <MiniStat label="buying power" value={formatUsd(offerAnalysis.buyingPowerUsd)} sub="COL-adjusted" />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Salary distribution</h2>
            <p className="mb-4 text-sm text-slate-400">Net monthly USD across this school&apos;s region</p>
            <Histogram data={histogram} offerValue={offerAnalysis?.offeredMonthlyUsd} />

            <div className="mt-6 space-y-3">
              {records.length >= 1 && (
                <StatBar label="This school median" value={schoolStats.median} min={lo} max={hi} highlight />
              )}
              <StatBar label={`${school.country} median`} value={countryStats.median} min={lo} max={hi} />
              <StatBar label={`${school.region} median`} value={regionStats.median} min={lo} max={hi} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/5 pt-5 text-center">
              <RangeStat label={`${school.country} range`} min={countryStats.min} max={countryStats.max} />
              <RangeStat label={`${school.country} P25–P75`} min={countryStats.p25} max={countryStats.p75} />
              <RangeStat label={`${school.region} range`} min={regionStats.min} max={regionStats.max} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Salary records ({records.length})</h2>
            <div className="space-y-2">
              {records.slice(0, 12).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                  <div>
                    <span className="text-slate-300">{r.role || "Teacher"}</span>
                    <span className="ml-2 text-xs text-slate-500">{r.year}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.housing !== "None" && <span className="text-xs text-indigo-300">{r.housing}</span>}
                    {r.taxRate ? <span className="text-xs text-slate-500">{Math.round(r.taxRate * 100)}% tax</span> : null}
                    <span className="font-semibold text-white">{formatUsd(r.monthlySalaryUsd)}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <TanePanel slug={school.slug} offerMonthlyUsd={offerAnalysis?.offeredMonthlyUsd} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Tax regime</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200">
                {taxRate.taxRegime}
              </span>
              <span className="text-2xl font-bold text-emerald-300">
                {Math.round(taxRate.takeHomePct * 100)}% take-home
              </span>
              <span className="text-sm text-slate-500">
                ~{Math.round(taxRate.effectiveRate * 100)}% effective tax
                {taxRate.socialInsuranceRate != null && ` + ${Math.round(taxRate.socialInsuranceRate * 100)}% social`}
              </span>
            </div>
            {taxRate.specialNotes && (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{taxRate.specialNotes}</p>
            )}
            <p className="mt-2 text-xs text-slate-600">
              Currency: {taxRate.currency} · Source: {taxRate.country === "Unknown" ? "estimated default" : "researched 2026"}
            </p>
          </section>

          {col && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-white">Cost of living &amp; power</h2>
              <p className="mb-4 text-sm text-slate-400">{col.city} · COL index {col.colIndex} (London = 100)</p>
              <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
                <p className="text-xs text-slate-400">Median buying power</p>
                <p className="text-2xl font-bold text-indigo-300">{formatUsd(col.buyingPowerUsd)}/mo</p>
                <p className="text-xs text-slate-500">salary adjusted for local costs</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PriceItem label="Milk (1L)" value={col.milk} />
                <PriceItem label="Beer" value={col.beer} />
                <PriceItem label="Meal out" value={col.meal} />
                <PriceItem label="Takeaway" value={col.takeaway} />
                <PriceItem label="Gym / mo" value={col.gym} />
                <PriceItem label="Taxi fare" value={col.taxi} />
              </div>
              <Link href="/purchasing-power" className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
                Compare cities <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}

          <SentimentPanel schoolId={school.id} schoolName={school.name} />
        </div>
      </div>
    </main>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function RangeStat({ label, min, max }: { label: string; min: number; max: number }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{formatUsd(min, true)}</p>
      <p className="text-xs text-slate-500">to {formatUsd(max, true)}</p>
    </div>
  );
}

function PriceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white">${value.toFixed(value < 10 ? 2 : 0)}</p>
    </div>
  );
}
