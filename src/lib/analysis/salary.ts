import type { ColItem, ParsedJob, SalaryRecord, School } from "@/lib/types";
import { getDerivedSchool } from "@/lib/data/schools";
import { colNearest, monthlyLivingCostUsd } from "@/lib/data/costOfLiving";
import {
  formatUsd,
  grossValues,
  histogram,
  netValues,
  percentileOf,
  recordsForCountry,
  recordsForRegion,
  statsFor,
  type HistogramBucket,
  type SalaryStats,
} from "@/lib/analysis/finance";

export type OfferVerdict = "Strong offer" | "Competitive" | "Fair" | "Below market";

export interface OfferAnalysis {
  offeredMonthlyUsd: number;
  percentileVsCountry: number;
  percentileVsRegion: number;
  netMonthlyUsd: number;
  monthlyLivingCostUsd: number;
  monthlySavingsUsd: number;
  savingsRate: number;
  buyingPowerUsd: number;
  verdict: OfferVerdict;
  verdictReason: string;
}

export interface SalaryReport {
  school: School;
  records: SalaryRecord[];
  schoolStats: SalaryStats;
  countryStats: SalaryStats;
  regionStats: SalaryStats;
  histogram: HistogramBucket[];
  col: ColItem | undefined;
  offer: OfferAnalysis | null;
}

function verdictFrom(pct: number, savingsRate: number): { verdict: OfferVerdict; reason: string } {
  if (savingsRate < 0) {
    return { verdict: "Below market", reason: "Estimated living costs exceed net take-home for this package." };
  }
  if (pct < 25) return { verdict: "Below market", reason: "Offer sits in the bottom quartile vs comparable local and regional packages." };
  if (pct < 50) return { verdict: "Fair", reason: "Offer is around or just below the local median for similar roles." };
  if (pct < 75) return { verdict: "Competitive", reason: "Offer is above the local median with healthy savings potential." };
  return { verdict: "Strong offer", reason: "Offer is in the top quartile with strong savings potential." };
}

export function buildSalaryReport(schoolId: string, job?: ParsedJob | null): SalaryReport | null {
  const derived = getDerivedSchool(schoolId);
  if (!derived) return null;
  const { school, records } = derived;

  const countryRecs = recordsForCountry(school.country);
  const regionRecs = recordsForRegion(school.region);

  const schoolStats = statsFor(netValues(records.length >= 3 ? records : countryRecs));
  const countryStats = statsFor(netValues(countryRecs));
  const regionStats = statsFor(netValues(regionRecs));

  const col = colNearest(school.city, school.country);

  const histValues = [...netValues(regionRecs), ...netValues(countryRecs)];
  const hist = histogram(histValues.length ? histValues : grossValues(regionRecs));

  let offer: OfferAnalysis | null = null;
  if (job && job.offeredMonthlyUsd) {
    const offered = job.offeredMonthlyUsd;
    const pool = regionRecs.length >= 5 ? netValues(regionRecs) : netValues([...countryRecs, ...regionRecs]);
    const pctCountry = percentileOf(offered, netValues(countryRecs));
    const pctRegion = percentileOf(offered, pool);

    const avgTax = avg(records.map((r) => r.taxRate ?? 0));
    const netMonthly = offered * (1 - Math.min(avgTax, 0.4));

    const livingCost = col ? monthlyLivingCostUsd(col) : 0;
    const savings = netMonthly - livingCost;
    const savingsRate = netMonthly > 0 ? savings / netMonthly : -1;
    const buyingPower = col ? (offered / col.colIndex) * 100 : offered;

    const { verdict, reason } = verdictFrom(pctCountry, savingsRate);
    offer = {
      offeredMonthlyUsd: offered,
      percentileVsCountry: pctCountry,
      percentileVsRegion: pctRegion,
      netMonthlyUsd: netMonthly,
      monthlyLivingCostUsd: livingCost,
      monthlySavingsUsd: savings,
      savingsRate,
      buyingPowerUsd: buyingPower,
      verdict,
      verdictReason: reason,
    };
  }

  return {
    school,
    records,
    schoolStats,
    countryStats,
    regionStats,
    histogram: hist,
    col,
    offer,
  };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export { formatUsd };
