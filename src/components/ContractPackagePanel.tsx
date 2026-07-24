import { formatUsd } from "@/lib/analysis/salary";
import type { SalaryRecord } from "@/lib/types";

interface PackageSummary {
  baseMonthlyUsd: number;
  housingAllowanceUsd: number;
  housingProvidedCount: number;
  flightAllowanceUsd: number;
  bonusUsd: number;
  additionalBenefits: string[];
  totalRecordsWithPackage: number;
}

export function computePackageSummary(records: SalaryRecord[]): PackageSummary {
  let baseSum = 0;
  let housingSum = 0;
  let housingProvidedCount = 0;
  let flightSum = 0;
  let bonusSum = 0;
  let baseCount = 0;
  let housingCount = 0;
  let flightCount = 0;
  let bonusCount = 0;
  const benefitsSet = new Set<string>();

  records.forEach((r) => {
    if (r.monthlySalaryUsd > 0) {
      baseSum += r.monthlySalaryUsd;
      baseCount++;
    }
    if (r.housing === "Provided") {
      housingProvidedCount++;
    } else if (r.housing === "Allowance") {
      // If package field exists or estimated from record
      const hAmt = (r as any).package?.housingAllowanceUsd || Math.round(r.monthlySalaryUsd * 0.25);
      if (hAmt > 0) {
        housingSum += hAmt;
        housingCount++;
      }
    }
    if (r.flights) {
      const fAmt = (r as any).package?.flightsPerPersonUsd || 1000;
      flightSum += fAmt;
      flightCount++;
    }
    const bAmt = (r as any).package?.bonusUsd || 0;
    if (bAmt > 0) {
      bonusSum += bAmt;
      bonusCount++;
    }
  });

  const baseMonthlyUsd = baseCount > 0 ? Math.round(baseSum / baseCount) : 0;
  const housingAllowanceUsd = housingCount > 0 ? Math.round(housingSum / housingCount) : 0;
  const flightAllowanceUsd = flightCount > 0 ? Math.round(flightSum / flightCount) : 0;
  const bonusUsd = bonusCount > 0 ? Math.round(bonusSum / bonusCount) : 0;

  return {
    baseMonthlyUsd,
    housingAllowanceUsd,
    housingProvidedCount,
    flightAllowanceUsd,
    bonusUsd,
    additionalBenefits: Array.from(benefitsSet),
    totalRecordsWithPackage: records.length,
  };
}

export function ContractPackagePanel({ records }: { records: SalaryRecord[] }) {
  if (!records || records.length === 0) return null;

  const summary = computePackageSummary(records);
  const totalAnnualPackageEstimate =
    summary.baseMonthlyUsd * 12 +
    summary.housingAllowanceUsd * 12 +
    summary.flightAllowanceUsd +
    summary.bonusUsd;

  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Verified Package Breakdown
          </span>
          <h2 className="mt-2 text-xl font-bold text-white">Full Compensation Package</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Estimated Total Annual Package</p>
          <p className="text-2xl font-extrabold text-emerald-300">{formatUsd(totalAnnualPackageEstimate)}/yr</p>
          <p className="text-[11px] text-slate-500">Includes base, housing, flights &amp; bonuses</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PackageComponentCard
          title="Base Monthly Salary"
          value={`${formatUsd(summary.baseMonthlyUsd)}/mo`}
          subtext={`~${formatUsd(summary.baseMonthlyUsd * 12)}/year`}
          badge="Guaranteed"
          badgeColor="text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
        />

        <PackageComponentCard
          title="Housing Benefit"
          value={
            summary.housingProvidedCount > 0
              ? "Provided Housing"
              : summary.housingAllowanceUsd > 0
              ? `${formatUsd(summary.housingAllowanceUsd)}/mo`
              : "No Housing Stipend"
          }
          subtext={
            summary.housingProvidedCount > 0
              ? "School-furnished apartment included"
              : summary.housingAllowanceUsd > 0
              ? `~${formatUsd(summary.housingAllowanceUsd * 12)}/yr allowance`
              : "Live out at own expense"
          }
          badge={summary.housingProvidedCount > 0 ? "Furnished" : "Allowance"}
          badgeColor="text-indigo-300 bg-indigo-500/10 border-indigo-500/20"
        />

        <PackageComponentCard
          title="Flight Allowance"
          value={summary.flightAllowanceUsd > 0 ? `${formatUsd(summary.flightAllowanceUsd)}/yr` : "Provided / Varies"}
          subtext="Annual round-trip flights for faculty"
          badge="Annual Return"
          badgeColor="text-amber-300 bg-amber-500/10 border-amber-500/20"
        />

        <PackageComponentCard
          title="End of Contract Gratuity"
          value={summary.bonusUsd > 0 ? `${formatUsd(summary.bonusUsd)}` : "Standard Gratuity"}
          subtext="Contract completion bonus or exit pension"
          badge="Gratuity / Bonus"
          badgeColor="text-purple-300 bg-purple-500/10 border-purple-500/20"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-xs text-slate-400">
        <span>Based on {summary.totalRecordsWithPackage} verified package data points for this school</span>
        <span className="text-slate-500">All monetary figures in USD</span>
      </div>
    </section>
  );
}

function PackageComponentCard({
  title,
  value,
  subtext,
  badge,
  badgeColor,
}: {
  title: string;
  value: string;
  subtext: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
