import { supabaseEnabled, supabaseServer } from "@/lib/db/supabaseClients";
import type {
  ColItemRow,
  SalaryRecordRow,
  SchoolRow,
} from "@/lib/db/types";
import type {
  ColItem,
  CurriculumTag,
  HousingType,
  Region,
  SalaryRecord,
  School,
} from "@/lib/types";
import { codeOfCountry, regionOfCountry } from "@/lib/data/geo";
import {
  COST_OF_LIVING,
  colNearest as tsvColNearest,
} from "@/lib/data/costOfLiving";
import {
  SALARIES,
  deriveSchools,
  getDerivedSchoolBySlug,
  searchDerivedSchools,
  salariesForSchoolKey,
} from "@/lib/data/schools";

// ---------------------------------------------------------------------------
// Adapters: DB row -> app type (keeps the analysis layer unchanged)
// ---------------------------------------------------------------------------

export function rowToSalaryRecord(row: SalaryRecordRow): SalaryRecord {
  const monthlySalaryUsd = row.monthly_salary_usd;
  const taxRate = row.tax_rate;
  const netMonthlyUsd =
    row.net_monthly_usd ||
    (taxRate != null ? monthlySalaryUsd * (1 - taxRate) : monthlySalaryUsd);
  return {
    id: row.id,
    year: row.year,
    country: row.country,
    city: row.city,
    school: row.school,
    curriculum: (row.curriculum as CurriculumTag) ?? "Other",
    role: row.role,
    monthlySalaryUsd,
    housing: (row.housing as HousingType) ?? "None",
    flights: row.flights,
    taxRate,
    netMonthlyUsd,
  };
}

export function rowToSchool(row: SchoolRow, count = 0, years: number[] = []): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    region: row.region as Region,
    curricula: row.curricula ?? [],
    salaryCount: count,
    years,
  };
}

export function rowToColItem(row: ColItemRow): ColItem {
  return {
    city: row.city,
    country: row.country,
    region: row.region as Region,
    countryCode: codeOfCountry(row.country),
    colIndex: row.col_index,
    medianMonthlyUsd: row.median_monthly_usd,
    buyingPowerUsd: row.buying_power_usd,
    milk: row.milk ?? 0,
    beer: row.beer ?? 0,
    meal: row.meal ?? 0,
    takeaway: row.takeaway ?? 0,
    gym: row.gym ?? 0,
    taxi: row.taxi ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Derived School (school + its records)
// ---------------------------------------------------------------------------

export interface DerivedSchool {
  school: School;
  records: SalaryRecord[];
}

export async function getSchools(): Promise<DerivedSchool[]> {
  if (!supabaseEnabled()) {
    return deriveSchools();
  }
  const client = supabaseServer()!;
  const { data: schools, error } = await client.from("schools").select("*");
  if (error || !schools) return [];
  const out: DerivedSchool[] = [];
  for (const s of schools as SchoolRow[]) {
    const records = await getSalaryRecordsForSchool(s.id);
    out.push({ school: rowToSchool(s, records.length), records });
  }
  out.sort(
    (a, b) =>
      b.records.length - a.records.length ||
      a.school.name.localeCompare(b.school.name),
  );
  return out;
}

export async function getSchoolBySlug(slug: string): Promise<DerivedSchool | null> {
  if (!supabaseEnabled()) {
    return getDerivedSchoolBySlug(slug) ?? null;
  }
  const client = supabaseServer()!;
  const { data } = await client
    .from("schools")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const school = data as SchoolRow;
  const records = await getSalaryRecordsForSchool(school.id);
  return { school: rowToSchool(school, records.length), records };
}

export async function searchSchools(query: string): Promise<DerivedSchool[]> {
  if (!supabaseEnabled()) {
    return searchDerivedSchools(query);
  }
  const client = supabaseServer()!;
  const q = query.trim();
  let data: SchoolRow[] | null = null;
  if (q) {
    const { data: rows } = await client
      .from("schools")
      .select("*")
      .or(`name.ilike.%${q}%,city.ilike.%${q}%,country.ilike.%${q}%`)
      .limit(40);
    data = (rows as SchoolRow[]) ?? null;
  } else {
    const { data: rows } = await client.from("schools").select("*").limit(40);
    data = (rows as SchoolRow[]) ?? null;
  }
  if (!data) return [];
  const out: DerivedSchool[] = [];
  for (const s of data) {
    const records = await getSalaryRecordsForSchool(s.id);
    out.push({ school: rowToSchool(s, records.length), records });
  }
  return out;
}

export async function getSalaryRecordsForSchool(schoolId: string): Promise<SalaryRecord[]> {
  if (!supabaseEnabled()) {
    return salariesForSchoolKey(schoolId, "", "");
  }
  const client = supabaseServer()!;
  const { data } = await client
    .from("salary_records")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "approved");
  return ((data as SalaryRecordRow[]) ?? []).map(rowToSalaryRecord);
}

export async function getSalaryRecordsForCountry(country: string): Promise<SalaryRecord[]> {
  if (!supabaseEnabled()) {
    return SALARIES.filter(
      (r) => r.country.toLowerCase() === country.trim().toLowerCase(),
    );
  }
  const client = supabaseServer()!;
  const { data } = await client
    .from("salary_records")
    .select("*")
    .ilike("country", country.trim())
    .eq("status", "approved");
  return ((data as SalaryRecordRow[]) ?? []).map(rowToSalaryRecord);
}

export async function getSalaryRecordsForRegion(region: Region): Promise<SalaryRecord[]> {
  if (!supabaseEnabled()) {
    return SALARIES.filter((r) => regionOfCountry(r.country) === region);
  }
  const client = supabaseServer()!;
  const { data } = await client
    .from("salary_records")
    .select("*")
    .eq("region", region)
    .eq("status", "approved");
  return ((data as SalaryRecordRow[]) ?? []).map(rowToSalaryRecord);
}

// ---------------------------------------------------------------------------
// Cost of living
// ---------------------------------------------------------------------------

export async function getColItems(): Promise<ColItem[]> {
  if (!supabaseEnabled()) {
    return COST_OF_LIVING;
  }
  const client = supabaseServer()!;
  const { data } = await client.from("col_items").select("*");
  return ((data as ColItemRow[]) ?? []).map(rowToColItem);
}

export async function getColNearest(city: string, country: string): Promise<ColItem | undefined> {
  if (!supabaseEnabled()) {
    return tsvColNearest(city, country);
  }
  const items = await getColItems();
  const exact = items.find(
    (c) => c.city.toLowerCase() === city.toLowerCase() && c.country.toLowerCase() === country.toLowerCase(),
  );
  if (exact) return exact;
  const byCountry = items.find((c) => c.country.toLowerCase() === country.toLowerCase());
  return byCountry ?? items.find((c) => c.country === "United Kingdom");
}

// ---------------------------------------------------------------------------
// Tax rates (reference data — Supabase or static fallback)
// ---------------------------------------------------------------------------

import type { TaxRateEntry } from "@/lib/data/taxRates";
import { getTaxRateStatic } from "@/lib/data/taxRates";

interface TaxRateRow {
  country: string;
  currency: string;
  effective_rate: number;
  social_insurance_rate: number | null;
  tax_regime: string;
  special_notes: string;
}

function rowToTaxRate(row: TaxRateRow): TaxRateEntry {
  return {
    country: row.country,
    currency: row.currency,
    effectiveRate: Number(row.effective_rate),
    socialInsuranceRate: row.social_insurance_rate != null ? Number(row.social_insurance_rate) : null,
    taxRegime: row.tax_regime,
    takeHomePct: 1 - Number(row.effective_rate),
    specialNotes: row.special_notes,
  };
}

export async function getTaxRateForCountry(country: string): Promise<TaxRateEntry> {
  if (!supabaseEnabled()) {
    return getTaxRateStatic(country);
  }
  const client = supabaseServer()!;
  const { data } = await client
    .from("country_tax_rates")
    .select("country, currency, effective_rate, social_insurance_rate, tax_regime, special_notes")
    .ilike("country", country.trim())
    .maybeSingle();
  if (data) return rowToTaxRate(data as TaxRateRow);
  return getTaxRateStatic(country);
}
