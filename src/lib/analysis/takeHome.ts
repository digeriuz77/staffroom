// Take-home pay estimator: uses the country's effective tax rate (from the
// researched reference data) to estimate net take-home from a gross offer.
import { getTaxRateForCountry } from "@/lib/db/repo";
import type { TaxRateEntry } from "@/lib/data/taxRates";
import { getColNearest } from "@/lib/db/repo";
import type { ColItem } from "@/lib/types";

export interface TakeHomeEstimate {
  grossMonthlyUsd: number;
  grossAnnualUsd: number;
  taxRate: TaxRateEntry;
  netMonthlyUsd: number;
  netAnnualUsd: number;
  monthlyLivingCostUsd: number;
  monthlySavingsUsd: number;
  savingsRate: number;
  buyingPowerUsd: number;
  col: ColItem | undefined;
}

export async function estimateTakeHome(
  grossMonthlyUsd: number,
  country: string,
  city?: string,
): Promise<TakeHomeEstimate> {
  const taxRate = await getTaxRateForCountry(country);
  const grossAnnualUsd = grossMonthlyUsd * 12;

  const netMonthlyUsd = grossMonthlyUsd * taxRate.takeHomePct;
  const netAnnualUsd = netMonthlyUsd * 12;

  const col = await getColNearest(city ?? "", country);
  const monthlyLivingCostUsd = col ? col.medianMonthlyUsd : 0;

  const monthlySavingsUsd = netMonthlyUsd - monthlyLivingCostUsd;
  const savingsRate = netMonthlyUsd > 0 ? monthlySavingsUsd / netMonthlyUsd : -1;

  const buyingPowerUsd = col ? (netMonthlyUsd / col.colIndex) * 100 : netMonthlyUsd;

  return {
    grossMonthlyUsd,
    grossAnnualUsd,
    taxRate,
    netMonthlyUsd,
    netAnnualUsd,
    monthlyLivingCostUsd,
    monthlySavingsUsd,
    savingsRate,
    buyingPowerUsd,
    col,
  };
}
