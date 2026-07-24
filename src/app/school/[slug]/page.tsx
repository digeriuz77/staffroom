import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSalaryReportAsync, formatUsd } from "@/lib/analysis/salary";
import { Histogram, StatBar } from "@/components/charts";
import { SentimentPanel } from "@/components/SentimentPanel";
import { TanePanel } from "@/components/TanePanel";
import { WebsiteHealthPanel } from "@/components/WebsiteHealthPanel";
import { RolePreviewPanel } from "@/components/RolePreviewPanel";
import { ProvenanceBadge, DataDisclaimer } from "@/components/ProvenanceBadge";
import { OfferInput } from "@/components/OfferInput";
import { CompareButton } from "@/components/CompareButton";
import { WatchlistButton } from "@/components/WatchlistButton";
import { ContractPackagePanel } from "@/components/ContractPackagePanel";
import { NegotiationCopilot } from "@/components/NegotiationCopilot";
import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { ArrowIcon } from "@/components/icons";
import { verdictTone, sentimentTone, TONE_CLASSES, pct } from "@/lib/tone";
import { getTaxRateForCountry } from "@/lib/db/repo";
import { getSchoolBrief } from "@/lib/db/interest";
import type { SchoolBriefRow } from "@/lib/db/types";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = await buildSalaryReportAsync(slug);
  if (!meta) return { title: "School not found" };
  return {
    title: `${meta.school.name} — salary, purchasing power & sentiment`,
    description: `Real salary data, cost of living and teacher reviews for ${meta.school.name} in ${meta.school.city}, ${meta.school.country}.`,
  };
}

export default async function SchoolReport({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ offer?: string; role?: string }>;
}) {
  const { slug } = await params;
  const { offer, role } = await searchParams;
  const offerMonthly = offer ? Number(offer) : undefined;

  const job = offerMonthly && Number.isFinite(offerMonthly)
    ? { ok: true, source: "unknown" as const, rawUrl: "", offeredMonthlyUsd: offerMonthly }
    : null;

  const report = await buildSalaryReportAsync(slug, job);
  if (!report) notFound();

  const { school, schoolStats, countryStats, regionStats, histogram, col, offer: offerAnalysis, records } = report;
  const [taxRate, brief] = await Promise.all([
    getTaxRateForCountry(school.country),
    getSchoolBrief(school.id),
  ]);
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
          {records.length} real salary record{records.length !== 1 ? "s" : ""}
          {school.years.length > 0 &&
            ` · data from ${Math.min(...school.years)}–${Math.max(...school.years)}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CompareButton slug={school.slug} name={school.name} city={school.city} country={school.country} />
          <WatchlistButton slug={school.slug} name={school.name} city={school.city} country={school.country} />
        </div>
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

          {(role || offerAnalysis) && (
            <div className="mt-4">
              <RolePreviewPanel roleText={role ?? (report.records[0]?.role ?? "")} />
            </div>
          )}
        </div>
      )}
      {/* 1. Full Compensation Package */}
      <ContractPackagePanel records={records} />

      <GoogleAdSlot className="my-6" />

      {/* 2. Salary Distribution */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-bold text-white">Salary distribution</h2>
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

        <details className="group mt-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-white">
            <span>View all verified salary records ({records.length})</span>
            <span className="text-xs font-normal text-slate-400 group-open:hidden">Show records ›</span>
            <span className="hidden text-xs font-normal text-slate-400 group-open:inline">Hide records ‹</span>
          </summary>
          <div className="space-y-2 border-t border-white/[0.06] p-4">
            {records.slice(0, 15).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                <div>
                  <span className="text-slate-300">{r.role || "Teacher"}</span>
                  <span className="ml-2 text-xs text-slate-500">{r.year}</span>
                  <ProvenanceBadge tier={r.trustTier ?? "seed"} />
                </div>
                <div className="flex items-center gap-3">
                  {r.housing !== "None" && <span className="text-xs text-indigo-300">{r.housing}</span>}
                  {r.taxRate ? <span className="text-xs text-slate-500">{Math.round(r.taxRate * 100)}% tax</span> : null}
                  <span className="font-semibold text-white">{formatUsd(r.monthlySalaryUsd)}/mo</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 3. Tax Regime & Net Income */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-bold text-white">Tax regime</h2>
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
      </section>

      {/* 4. Teacher Sentiment */}
      <div className="mb-8">
        <SentimentPanel schoolId={school.id} schoolName={school.name} />
      </div>

      {/* 5. Cost of Living & Purchasing Power */}
      {col && (
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">Cost of living &amp; purchasing power</h2>
          <p className="mb-4 text-sm text-slate-400">{col.city} · COL index {col.colIndex} (London = 100)</p>
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">Median buying power</p>
              <p className="text-2xl font-bold text-indigo-300">{formatUsd(col.buyingPowerUsd)}/mo</p>
            </div>
            <Link href="/purchasing-power" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-200">
              Compare cities <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <PriceItem label="Milk (1L)" value={col.milk} />
            <PriceItem label="Beer" value={col.beer} />
            <PriceItem label="Meal out" value={col.meal} />
            <PriceItem label="Takeaway" value={col.takeaway} />
            <PriceItem label="Gym / mo" value={col.gym} />
            <PriceItem label="Taxi fare" value={col.taxi} />
          </div>
        </section>
      )}

      {/* 6. TANE & Evidence Brief */}
      {brief && <EvidenceBrief brief={brief} />}
      <div className="mb-8">
        <TanePanel slug={school.slug} offerMonthlyUsd={offerAnalysis?.offeredMonthlyUsd} />
      </div>

      {/* 7. Contract Negotiation Assistant */}
      <div className="mb-8">
        <NegotiationCopilot schoolName={school.name} city={school.city} country={school.country} records={records} />
      </div>

      <OfferInput slug={school.slug} currentOffer={offerAnalysis?.offeredMonthlyUsd} />

      <DataDisclaimer />
    </main>
  );
}

function EvidenceBrief({ brief }: { brief: SchoolBriefRow }) {
  return (
    <section className="mb-8 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.05] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Evidence brief
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">What to investigate</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
          AI-assisted · {brief.source_post_count} public posts
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{brief.summary}</p>
      <details className="group mt-4 border-t border-white/[0.06] pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-indigo-200">
          <span className="group-open:hidden">Show evidence-led prompts</span>
          <span className="hidden group-open:inline">Hide evidence-led prompts</span>
        </summary>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <BriefList title="Positive signals" items={brief.strengths} tone="text-emerald-300" />
          <BriefList title="Watch closely" items={brief.watchouts} tone="text-amber-300" />
          <BriefList title="Ask the school" items={brief.questions} tone="text-indigo-300" />
        </div>
      </details>
      <p className="mt-4 text-[11px] text-slate-500">
        A low-cost agent summarizes patterns, not facts. Verify every claim directly.
      </p>
    </section>
  );
}

function BriefList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${tone}`}>{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-400">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-slate-600">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Not enough repeated evidence yet.</p>
      )}
    </div>
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
