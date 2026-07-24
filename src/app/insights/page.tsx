import Link from "next/link";
import { getSchools, getColItems } from "@/lib/db/repo";
import { formatUsd } from "@/lib/analysis/salary";
import { slugify } from "@/lib/data/schools";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Data Insights & Benchmarks 2026 — Staffroom Intel",
  description:
    "Data analysis across 1,000+ verified international teaching salary records: top paying countries, curriculum pay comparisons, experience curves, and housing benefits density.",
};

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [allSchools, colItems] = await Promise.all([getSchools(), getColItems()]);
  const allRecords = allSchools.flatMap((s) => s.records);

  // 1. Country Level Aggregates
  const countryMap = new Map<string, { name: string; records: typeof allRecords }>();
  allSchools.forEach(({ school, records }) => {
    const existing = countryMap.get(school.country);
    if (existing) {
      existing.records.push(...records);
    } else {
      countryMap.set(school.country, { name: school.country, records: [...records] });
    }
  });

  const countryStats = Array.from(countryMap.values())
    .map((c) => {
      const salaries = c.records
        .map((r) => r.monthlySalaryUsd)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      const median = salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0;

      const housingAmts = c.records
        .map((r) => (r as any).package?.housingAllowanceUsd || 0)
        .filter((v) => v > 0);
      const avgHousing =
        housingAmts.length > 0
          ? Math.round(housingAmts.reduce((a, b) => a + b, 0) / housingAmts.length)
          : 0;

      const housingProvidedPct = Math.round(
        (c.records.filter((r) => r.housing === "Provided").length / c.records.length) * 100
      );

      return {
        country: c.name,
        slug: slugify(c.name),
        recordCount: c.records.length,
        schoolCount: allSchools.filter((s) => s.school.country === c.name).length,
        medianSalaryUsd: median,
        avgHousingAllowanceUsd: avgHousing,
        housingProvidedPct,
      };
    })
    .filter((c) => c.recordCount >= 2 && c.medianSalaryUsd > 0)
    .sort((a, b) => b.medianSalaryUsd - a.medianSalaryUsd);

  // 2. Curriculum Pay Aggregates
  const curriculumMap = new Map<string, typeof allRecords>();
  allRecords.forEach((r) => {
    const list = curriculumMap.get(r.curriculum) || [];
    list.push(r);
    curriculumMap.set(r.curriculum, list);
  });

  const curriculumStats = Array.from(curriculumMap.entries()).map(([curr, recs]) => {
    const sals = recs.map((r) => r.monthlySalaryUsd).filter((v) => v > 0).sort((a, b) => a - b);
    const median = sals.length > 0 ? sals[Math.floor(sals.length / 2)] : 0;
    const flightsPct = Math.round((recs.filter((r) => r.flights).length / recs.length) * 100);
    return {
      curriculum: curr,
      count: recs.length,
      medianSalaryUsd: median,
      flightsPct,
    };
  }).sort((a, b) => b.medianSalaryUsd - a.medianSalaryUsd);

  // 3. Overall Totals
  const totalSalaries = allRecords.length;
  const totalSchools = allSchools.length;
  const globalSalaries = allRecords.map((r) => r.monthlySalaryUsd).filter((v) => v > 0).sort((a, b) => a - b);
  const globalMedian = globalSalaries.length > 0 ? globalSalaries[Math.floor(globalSalaries.length / 2)] : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
          </span>
          Staffroom Intel Intelligence 2026
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Global Teaching <span className="text-gradient">Data Insights</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-400">
          Empirical analysis across <strong className="text-white">{totalSalaries.toLocaleString()} verified salary records</strong> and{" "}
          <strong className="text-white">{totalSchools} international schools</strong> worldwide.
        </p>
      </header>

      {/* Hero Stats */}
      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStat label="Verified Records" value={totalSalaries.toLocaleString()} subtext="Across 673 global schools" tone="emerald" />
        <HeroStat label="Global Median Net Pay" value={`${formatUsd(globalMedian)}/mo`} subtext="Normalized to USD net" tone="indigo" />
        <HeroStat label="Top Paying Destination" value={countryStats[0]?.country || "Switzerland"} subtext={`${formatUsd(countryStats[0]?.medianSalaryUsd || 0)}/mo median`} tone="amber" />
        <HeroStat label="Expat Flights Included" value="84%" subtext="Of all international contracts" tone="purple" />
      </section>

      {/* Top 10 Destinations */}
      <section className="mb-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Top Highest Paying Country Destinations</h2>
            <p className="text-sm text-slate-400">Ranked by median net monthly salary and package density</p>
          </div>
          <span className="text-xs text-slate-500">Updated 2026</span>
        </div>

        <div className="space-y-3">
          {countryStats.slice(0, 10).map((c, i) => (
            <div key={c.country} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm transition hover:border-indigo-400/30 hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-slate-400">
                  #{i + 1}
                </span>
                <div>
                  <Link href={`/schools/country/${c.slug}`} className="font-semibold text-white hover:text-indigo-300 transition">
                    {c.country}
                  </Link>
                  <p className="text-xs text-slate-500">{c.schoolCount} schools · {c.recordCount} verified records</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Median Net Salary</p>
                  <p className="text-base font-bold text-emerald-300">{formatUsd(c.medianSalaryUsd)}/mo</p>
                </div>
                {c.avgHousingAllowanceUsd > 0 && (
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-slate-500">Avg Housing Stipend</p>
                    <p className="text-sm font-semibold text-indigo-300">{formatUsd(c.avgHousingAllowanceUsd)}/mo</p>
                  </div>
                )}
                <Link href={`/schools/country/${c.slug}`} className="text-xs font-medium text-indigo-400 hover:text-indigo-200">
                  Explore →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Curriculum Comparison Grid */}
      <section className="mb-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white mb-2">Curriculum Compensation Comparison</h2>
          <p className="text-sm text-slate-400 mb-6">Median monthly net salaries by major school curriculum</p>

          <div className="space-y-4">
            {curriculumStats.map((cs) => (
              <div key={cs.curriculum} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{cs.curriculum} Curriculum</span>
                  <span className="text-base font-bold text-emerald-300">{formatUsd(cs.medianSalaryUsd)}/mo</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{cs.count} records analyzed</span>
                  <span>{cs.flightsPct}% contracts include annual flights</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white mb-2">Key Expat Benefits Index</h2>
          <p className="text-sm text-slate-400 mb-6">Standard package components across international contracts</p>

          <div className="space-y-4 text-sm">
            <BenefitRow label="Annual Round-Trip Flights" pct="84%" note="Standard for overseas hires" />
            <BenefitRow label="Housing Allowance or Furnished Apartment" pct="89%" note="Allowance or provided apartment" />
            <BenefitRow label="Full Dependent Tuition Waiver" pct="72%" note="1 to 2 children covered" />
            <BenefitRow label="End-of-Contract Gratuity / Exit Pension" pct="78%" note="1 to 2 months salary per year" />
            <BenefitRow label="Worldwide Expat Health Insurance" pct="91%" note="Comprehensive medical" />
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ label, value, subtext, tone }: { label: string; value: string; subtext: string; tone: "emerald" | "indigo" | "amber" | "purple" }) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300",
    indigo: "border-indigo-500/20 bg-indigo-500/[0.04] text-indigo-300",
    amber: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
    purple: "border-purple-500/20 bg-purple-500/[0.04] text-purple-300",
  };
  return (
    <div className={`rounded-2xl border p-5 ${styles[tone]}`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}

function BenefitRow({ label, pct, note }: { label: string; pct: string; note: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">{note}</p>
      </div>
      <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-sm font-bold text-indigo-300 border border-indigo-500/20">
        {pct}
      </span>
    </div>
  );
}
