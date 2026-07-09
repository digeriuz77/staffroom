// TANE — Total Annual Net Equivalent (USD). Sums base + benefits into one
// comparable figure, with a visible breakdown (Decision 4). Cash allowances are
// valued at face value; in-kind provision (housing, fees) at local market value.
// The household archetype scales housing/flights/fees (Decision 3).
import type { Household, SalaryPackageFields, ValuationBasis } from "@/lib/db/types";
import type { SalaryRecord } from "@/lib/types";
import { bedroomsNeeded, feeChildren, flightPersons } from "@/lib/analysis/household";
import { getColNearest } from "@/lib/db/repo";

export type TaneComponentKey =
  | "base"
  | "housing"
  | "flights"
  | "fees"
  | "gratuity"
  | "relocation"
  | "healthcare"
  | "bonus";

export interface TaneComponent {
  key: TaneComponentKey;
  amountAnnualUsd: number;
  valuationBasis: ValuationBasis;
  provenance: string;
}

export interface TaneResult {
  totalAnnualUsd: number;
  totalMonthlyUsd: number;
  components: TaneComponent[];
}

// Reasonable defaults when a record lacks explicit package detail (TSV seed).
const DEFAULT_FLIGHT_FARE_USD = 900;
const DEFAULT_RELOCATION_USD = 2000;
const DEFAULT_HEALTHCARE_PER_PERSON_USD = 1200;
const DEFAULT_GATUITY_MONTHS_ME = 1; // Gulf end-of-service gratuity
const DEFAULT_FEE_ANNUAL_USD = 14000; // global average international-school fee
const MARKET_RENT_PER_BEDROOM_USD = 1200; // monthly fallback when no COL data

function isGulfTaxRegime(country: string, taxRate: number | null): boolean {
  const gulf = ["United Arab Emirates", "Qatar", "Saudi Arabia", "Oman", "Kuwait", "Bahrain"];
  return gulf.some((c) => c.toLowerCase() === country.toLowerCase()) || taxRate === 0;
}

/**
 * Estimate monthly market rent for the needed bedrooms in a city, using the COL
 * dataset's median rent as a proxy scaled by bedrooms (market value).
 */
async function marketRentMonthlyUsd(
  city: string,
  country: string,
  bedrooms: number,
): Promise<number> {
  const col = await getColNearest(city, country);
  if (!col) return bedrooms * MARKET_RENT_PER_BEDROOM_USD;
  // medianMonthlyUsd is a single-person living cost proxy; scale by bedrooms.
  const perBedroom = col.medianMonthlyUsd * 0.45;
  return Math.round(perBedroom * bedrooms);
}

/**
 * Compute TANE for a salary record under a given household composition.
 * Accepts the legacy app SalaryRecord plus optional explicit package fields.
 */
export async function computeTANE(
  record: Pick<
    SalaryRecord,
    "school" | "city" | "country" | "housing" | "flights" | "netMonthlyUsd" | "monthlySalaryUsd" | "taxRate"
  >,
  household: Household,
  pkg: SalaryPackageFields = {},
): Promise<TaneResult> {
  const components: TaneComponent[] = [];

  // --- Base salary (net) ---
  const baseAnnual = pkg.baseAnnualUsd ?? record.netMonthlyUsd * 12;
  components.push({
    key: "base",
    amountAnnualUsd: baseAnnual,
    valuationBasis: "face",
    provenance: "Net take-home (gross × (1 − tax))",
  });

  // --- Housing ---
  const beds = bedroomsNeeded(household);
  const marketMonthly = await marketRentMonthlyUsd(record.city, record.country, beds);
  const marketAnnual = marketMonthly * 12;
  if (record.housing === "Provided" || pkg.housingProvided) {
    components.push({
      key: "housing",
      amountAnnualUsd: marketAnnual,
      valuationBasis: "market",
      provenance: `In-kind provision valued at local market rent (${beds}br)`,
    });
  } else if (record.housing === "Allowance" || pkg.housingAllowanceUsd) {
    const faceAnnual = (pkg.housingAllowanceUsd ?? marketMonthly) * 12;
    components.push({
      key: "housing",
      amountAnnualUsd: faceAnnual,
      valuationBasis: "face",
      provenance: `Cash allowance (face value)`,
    });
  }

  // --- Flights ---
  if (record.flights) {
    const persons = flightPersons(household);
    const freqYears = pkg.flightFrequencyYears ?? 1;
    const fare = pkg.flightsPerPersonUsd ?? DEFAULT_FLIGHT_FARE_USD;
    const annual = (persons * fare) / freqYears;
    components.push({
      key: "flights",
      amountAnnualUsd: Math.round(annual),
      valuationBasis: "face",
      provenance: `${persons} covered persons × ${fare}/flight, every ${freqYears}y`,
    });
  }

  // --- Dependent education fees ---
  const kids = feeChildren(household);
  if (kids.length > 0) {
    const coveragePct = pkg.feesCoveragePct ?? 100;
    const perChild = DEFAULT_FEE_ANNUAL_USD;
    const annual = (kids.length * perChild * coveragePct) / 100;
    components.push({
      key: "fees",
      amountAnnualUsd: Math.round(annual),
      valuationBasis: "market",
      provenance: `${kids.length} school-age child(ren) × market fee, ${coveragePct}% covered`,
    });
  }

  // --- End-of-service gratuity (Gulf regimes) ---
  if (isGulfTaxRegime(record.country, record.taxRate) || pkg.gratuityMonthsPerYear) {
    const months = pkg.gratuityMonthsPerYear ?? DEFAULT_GATUITY_MONTHS_ME;
    const monthlyGross = pkg.baseAnnualUsd ? pkg.baseAnnualUsd / 12 : record.monthlySalaryUsd;
    components.push({
      key: "gratuity",
      amountAnnualUsd: Math.round(monthlyGross * months),
      valuationBasis: "face",
      provenance: "Accrued end-of-service gratuity (statutory)",
    });
  }

  // --- Relocation ---
  if (pkg.relocationUsd) {
    components.push({
      key: "relocation",
      amountAnnualUsd: pkg.relocationUsd,
      valuationBasis: "face",
      provenance: "Amortized annual relocation value",
    });
  }

  // --- Healthcare ---
  const people = household.adults + household.children.length;
  const healthcare = pkg.healthcareUsd ?? people * DEFAULT_HEALTHCARE_PER_PERSON_USD;
  if (healthcare > 0) {
    components.push({
      key: "healthcare",
      amountAnnualUsd: Math.round(healthcare),
      valuationBasis: "face",
      provenance: `Family premium value (${people} covered)`,
    });
  }

  // --- Bonus / PD ---
  if (pkg.bonusUsd) {
    components.push({
      key: "bonus",
      amountAnnualUsd: pkg.bonusUsd,
      valuationBasis: "face",
      provenance: "Target bonus / PD allowance",
    });
  }

  const totalAnnualUsd = components.reduce((s, c) => s + c.amountAnnualUsd, 0);
  return {
    totalAnnualUsd: Math.round(totalAnnualUsd),
    totalMonthlyUsd: Math.round(totalAnnualUsd / 12),
    components,
  };
}
