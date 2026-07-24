import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchools, getTaxRateForCountry, getColItems } from "@/lib/db/repo";
import { formatUsd } from "@/lib/analysis/salary";
import { CompareButton } from "@/components/CompareButton";
import { slugify } from "@/lib/data/schools";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: rawCountry } = await params;
  const decoded = decodeURIComponent(rawCountry).replace(/-/g, " ");
  const allSchools = await getSchools();

  const matchingSchools = allSchools.filter(
    (s) => slugify(s.school.country) === slugify(decoded)
  );

  if (matchingSchools.length === 0) {
    return { title: "Country not found — Staffroom Intel" };
  }

  const countryName = matchingSchools[0].school.country;
  const totalSalaries = matchingSchools.reduce((sum, s) => sum + s.records.length, 0);

  return {
    title: `International School Salaries in ${countryName} (2026) — Staffroom Intel`,
    description: `Verified compensation packages, housing allowances, tax rates, and teacher reviews across ${matchingSchools.length} international schools in ${countryName}. Data from ${totalSalaries} verified records.`,
    openGraph: {
      title: `International School Salaries in ${countryName}`,
      description: `Compare packages, housing allowances, and purchasing power across ${matchingSchools.length} schools in ${countryName}.`,
    },
  };
}

export default async function CountryLandingPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: rawCountry } = await params;
  const decoded = decodeURIComponent(rawCountry).replace(/-/g, " ");
  const [allSchools, colItems] = await Promise.all([getSchools(), getColItems()]);

  const matchingSchools = allSchools.filter(
    (s) => slugify(s.school.country) === slugify(decoded)
  );

  if (matchingSchools.length === 0) {
    notFound();
  }

  const countryName = matchingSchools[0].school.country;
  const allRecords = matchingSchools.flatMap((s) => s.records);
  const taxRate = await getTaxRateForCountry(countryName);

  // Compute Country Salary Aggregates
  const monthlySalaries = allRecords
    .map((r) => r.monthlySalaryUsd)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  const medianSalary =
    monthlySalaries.length > 0
      ? monthlySalaries[Math.floor(monthlySalaries.length / 2)]
      : 0;

  const minSalary = monthlySalaries.length > 0 ? monthlySalaries[0] : 0;
  const maxSalary =
    monthlySalaries.length > 0 ? monthlySalaries[monthlySalaries.length - 1] : 0;

  const housingAllowances = allRecords
    .map((r) => (r as any).package?.housingAllowanceUsd || 0)
    .filter((v) => v > 0);

  const avgHousingAllowance =
    housingAllowances.length > 0
      ? Math.round(
          housingAllowances.reduce((a, b) => a + b, 0) / housingAllowances.length
        )
      : 0;

  // Find CoL data for primary city in country
  const countryCol = colItems.find(
    (c) => slugify(c.country) === slugify(countryName)
  );

  const estimatedTakeHome = Math.round(medianSalary * taxRate.takeHomePct);
  const estimatedColExpense = countryCol ? countryCol.medianMonthlyUsd : 1800;
  const estimatedSavings = Math.max(0, estimatedTakeHome - estimatedColExpense);

  // JSON-LD Structured Data for Search Engine Optimization
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    name: `International School Salaries in ${countryName}`,
    description: `Verified compensation packages and teacher reviews across ${matchingSchools.length} international schools in ${countryName}.`,
    priceCurrency: "USD",
    lowPrice: minSalary,
    highPrice: maxSalary,
    offerCount: allRecords.length,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/schools"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white"
      >
        ← All destinations
      </Link>

      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Country Compensation Report 2026
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Teaching in <span className="text-gradient">{countryName}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-400">
          Explore salary benchmarks, housing stipends, tax rates, and verified teacher data across{" "}
          <strong className="text-white">{matchingSchools.length} international schools</strong> in {countryName}.
        </p>
      </header>

      {/* Key Stats Bar */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Median Base Salary"
          value={`${formatUsd(medianSalary)}/mo`}
          subtext={`Range: ${formatUsd(minSalary)} - ${formatUsd(maxSalary)}`}
          tone="emerald"
        />
        <StatCard
          label="Average Housing Allowance"
          value={avgHousingAllowance > 0 ? `${formatUsd(avgHousingAllowance)}/mo` : "Provided Housing"}
          subtext="Typical expat housing benefit"
          tone="indigo"
        />
        <StatCard
          label="Take-Home Pay Rate"
          value={`${Math.round(taxRate.takeHomePct * 100)}%`}
          subtext={`Effective Tax: ~${Math.round(taxRate.effectiveRate * 100)}%`}
          tone="amber"
        />
        <StatCard
          label="Est. Monthly Savings"
          value={`${formatUsd(estimatedSavings)}/mo`}
          subtext="Single teacher post-expenses"
          tone="purple"
        />
      </section>

      {/* Tax & Cost of Living Overview */}
      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Tax Regime &amp; Income</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200">
              {taxRate.taxRegime}
            </span>
            <span className="text-xl font-bold text-emerald-300">
              {Math.round(taxRate.takeHomePct * 100)}% net salary
            </span>
          </div>
          {taxRate.specialNotes ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{taxRate.specialNotes}</p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Standard local tax regulations apply for international educators in {countryName}.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Cost of Living Profile</h2>
          {countryCol ? (
            <div>
              <p className="mt-2 text-sm text-slate-400">
                City: <strong className="text-white">{countryCol.city}</strong> · COL Index:{" "}
                <strong className="text-indigo-300">{countryCol.colIndex}</strong> (London = 100)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-slate-500">Est. Single Expenses</p>
                  <p className="text-base font-semibold text-white">${countryCol.medianMonthlyUsd}/mo</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-slate-500">Buying Power Index</p>
                  <p className="text-base font-semibold text-indigo-300">${countryCol.buyingPowerUsd}/mo</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Living costs in {countryName} offer competitive savings potential compared to Western hubs.
            </p>
          )}
        </section>
      </div>

      {/* Schools Directory in Country */}
      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Schools in {countryName}</h2>
            <p className="text-sm text-slate-400">Click any school to view full verified reports &amp; reviews</p>
          </div>
          <span className="text-xs text-slate-500">{matchingSchools.length} schools listed</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matchingSchools.map(({ school, records }) => {
            const schoolMonthly = records.map((r) => r.monthlySalaryUsd).filter((v) => v > 0);
            const schoolMedian =
              schoolMonthly.length > 0
                ? schoolMonthly[Math.floor(schoolMonthly.length / 2)]
                : 0;

            return (
              <div
                key={school.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-indigo-400/40 hover:bg-white/[0.06]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{school.city}</span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                      {records.length} record{records.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-white group-hover:text-indigo-300 transition">
                    <Link href={`/school/${school.slug}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {school.name}
                    </Link>
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {school.curricula.map((c) => (
                      <span key={c} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-white/5 pt-4">
                  <div>
                    <p className="text-[11px] text-slate-500">Median Net Pay</p>
                    <p className="text-base font-bold text-emerald-300">
                      {schoolMedian > 0 ? `${formatUsd(schoolMedian)}/mo` : "Data pending"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-indigo-400 group-hover:translate-x-0.5 transition">
                    View report →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  subtext,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  tone: "emerald" | "indigo" | "amber" | "purple";
}) {
  const toneClasses = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300",
    indigo: "border-indigo-500/20 bg-indigo-500/[0.04] text-indigo-300",
    amber: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
    purple: "border-purple-500/20 bg-purple-500/[0.04] text-purple-300",
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
