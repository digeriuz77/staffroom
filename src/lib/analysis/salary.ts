import type { ColItem, ParsedJob, SalaryRecord, School } from "@/lib/types";
import { unstable_cache } from "next/cache";
import {
  formatUsd,
  grossValues,
  histogram,
  netValues,
  percentileOf,
  statsFor,
  type HistogramBucket,
  type SalaryStats,
} from "@/lib/analysis/finance";
import { monthlyLivingCostUsd } from "@/lib/data/costOfLiving";
import {
  getSchoolBySlug,
  getSalaryRecordsForCountry,
  getSalaryRecordsForRegion,
  getColNearest,
} from "@/lib/db/repo";

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

/**
 * Cached school report data — the expensive part (DB queries + stat math).
 * Computed once per school, cached until new salary data is approved for it.
 * Does NOT include offer analysis (that's per-user/per-request, pure math).
 */
export interface SchoolReportData {
  school: School;
  records: SalaryRecord[];
  schoolStats: SalaryStats;
  countryStats: SalaryStats;
  regionStats: SalaryStats;
  histogram: HistogramBucket[];
  col: ColItem | undefined;
}

/** Internal cached shape: includes raw value pools for offer percentile math. */
interface CachedSchoolData extends SchoolReportData {
  countryNetValues: number[];
  regionNetValues: number[];
  avgTaxRate: number;
}

export interface SalaryReport extends SchoolReportData {
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

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Fetch and compute the base report data for a school. This does the expensive
 * work (DB queries + percentile/histogram math) and is cached so repeat visits
 * to the same school don't recompute.
 */
async function fetchSchoolReportData(slug: string): Promise<CachedSchoolData | null> {
  const derived = await getSchoolBySlug(slug);
  if (!derived) return null;

  const { school, records } = derived;

  const [countryRecs, regionRecs, col] = await Promise.all([
    getSalaryRecordsForCountry(school.country),
    getSalaryRecordsForRegion(school.region),
    getColNearest(school.city, school.country),
  ]);

  const countryNetValues = netValues(countryRecs);
  const regionNetValues = netValues(regionRecs);

  const schoolStats = statsFor(netValues(records.length >= 3 ? records : countryRecs));
  const countryStats = statsFor(countryNetValues);
  const regionStats = statsFor(regionNetValues);

  const histValues = [...regionNetValues, ...countryNetValues];
  const hist = histogram(histValues.length ? histValues : grossValues(regionRecs));

  return {
    school,
    records,
    schoolStats,
    countryStats,
    regionStats,
    histogram: hist,
    col,
    countryNetValues,
    regionNetValues,
    avgTaxRate: avg(records.map((r) => r.taxRate ?? 0)),
  };
}

/**
 * Cached version of the base report data. Uses Next.js `unstable_cache`:
 * - On Vercel: persists in the Data Cache across requests/instances.
 * - Locally: in-memory per server instance.
 * - Refreshed every 24h via the `revalidate` TTL.
 *
 * For a low-traffic app, the 24h TTL is the simplest correct invalidation
 * strategy. If instant refresh on approval is needed later, add
 * `revalidateTag("school-reports", profile)` with the correct Next 16 API.
 */
export const getSchoolReportData = unstable_cache(
  fetchSchoolReportData,
  ["school-report"],
  {
    revalidate: 86400, // 24h
  },
);

/**
 * Compute offer analysis from cached report data + an offer amount. This is
 * pure math — no DB calls — so it runs per-request at near-zero cost.
 */
function buildOfferAnalysis(
  data: CachedSchoolData,
  offeredMonthlyUsd: number,
): OfferAnalysis {
  const { countryNetValues, regionNetValues, col, avgTaxRate } = data;

  // Percentile vs the country pool and region pool.
  const pctCountry = percentileOf(offeredMonthlyUsd, countryNetValues);
  const pool = regionNetValues.length >= 5 ? regionNetValues : [...countryNetValues, ...regionNetValues];
  const pctRegion = percentileOf(offeredMonthlyUsd, pool);

  const netMonthly = offeredMonthlyUsd * (1 - Math.min(avgTaxRate, 0.4));

  const livingCost = col ? monthlyLivingCostUsd(col) : 0;
  const savings = netMonthly - livingCost;
  const savingsRate = netMonthly > 0 ? savings / netMonthly : -1;
  const buyingPower = col ? (offeredMonthlyUsd / col.colIndex) * 100 : offeredMonthlyUsd;

  const { verdict, reason } = verdictFrom(pctCountry, savingsRate);

  return {
    offeredMonthlyUsd,
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

/**
 * Build the full salary report: cached base data + per-request offer analysis.
 * This is the production entry point. The base data is cached; only the offer
 * analysis runs per-request.
 *
 * A school accumulates multiple records of different types (teacher, management,
 * benefits) over time — they all attach to the same school_id and are aggregated
 * here. Repeat visits reuse the cached aggregation.
 */
export async function buildSalaryReportAsync(
  slug: string,
  job?: ParsedJob | null,
): Promise<SalaryReport | null> {
  const data = await getSchoolReportData(slug);
  if (!data) return null;

  let offer: OfferAnalysis | null = null;
  if (job && job.offeredMonthlyUsd) {
    offer = buildOfferAnalysis(data, job.offeredMonthlyUsd);
  }

  // Strip internal pool fields from the public report shape.
  const { countryNetValues: _a, regionNetValues: _b, avgTaxRate: _c, ...publicData } = data;
  return { ...publicData, offer };
}

export { formatUsd };
