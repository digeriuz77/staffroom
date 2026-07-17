// One-time seed: parses the in-memory TSV dataset (619 records) and the
// cost-of-living dataset into Supabase. Idempotent by slug (upsert).
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/seed.ts
//
import { createClient } from "@supabase/supabase-js";
import { SALARIES, slugify } from "../src/lib/data/schools";
import { COST_OF_LIVING } from "../src/lib/data/costOfLiving";
import { codeOfCountry, regionOfCountry } from "../src/lib/data/geo";
import type {
  CurriculumTag,
  HousingType,
  SalaryRecord,
} from "../src/lib/types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false } });

interface SchoolInsert {
  slug: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  region: string;
  curricula: CurriculumTag[];
}

function buildSchools(): Map<string, SchoolInsert> {
  const map = new Map<string, SchoolInsert>();
  for (const r of SALARIES) {
    const slug = slugify(`${r.school} ${r.city} ${r.country}`);
    if (map.has(slug)) {
      const existing = map.get(slug)!;
      if (!existing.curricula.includes(r.curriculum)) {
        existing.curricula.push(r.curriculum);
      }
      continue;
    }
    map.set(slug, {
      slug,
      name: r.school,
      city: r.city,
      country: r.country,
      country_code: codeOfCountry(r.country),
      region: regionOfCountry(r.country),
      curricula: [r.curriculum],
    });
  }
  return map;
}

function salaryRow(r: SalaryRecord) {
  const netAnnualUsd = r.netMonthlyUsd * 12;
  return {
    year: r.year,
    country: r.country,
    city: r.city,
    school: r.school,
    curriculum: r.curriculum,
    role: r.role,
    currency: "USD",
    monthly_salary_usd: r.monthlySalaryUsd,
    net_annual_usd: netAnnualUsd,
    net_monthly_usd: r.netMonthlyUsd,
    tax_rate: r.taxRate,
    housing: r.housing as HousingType,
    flights: r.flights,
    package: {} as Record<string, unknown>,
    source: "tsv_seed",
    trust_tier: "seed",
    status: "approved",
  };
}

async function seed() {
  // 1. Upsert schools
  const schools = buildSchools();
  const schoolRows = Array.from(schools.values());
  console.log(`Upserting ${schoolRows.length} schools...`);
  const { error: schoolErr } = await client.from("schools").upsert(schoolRows, {
    onConflict: "slug",
  });
  if (schoolErr) {
    console.error("schools upsert failed:", schoolErr.message);
    process.exit(1);
  }

  // 2. Resolve slug -> school id
  const { data: schoolData, error: selErr } = await client
    .from("schools")
    .select("id, slug");
  if (selErr || !schoolData) {
    console.error("school select failed:", selErr?.message);
    process.exit(1);
  }
  const slugToId = new Map<string, string>();
  for (const s of schoolData) slugToId.set(s.slug, s.id);

  // 3. Insert salary records (map slug -> school_id)
  const salaryPayload = SALARIES.map((r) => {
    const slug = slugify(`${r.school} ${r.city} ${r.country}`);
    const id = slugToId.get(slug);
    return { ...salaryRow(r), school_id: id ?? null };
  });
  console.log(`Inserting ${salaryPayload.length} salary records...`);
  const { error: salErr } = await client.from("salary_records").insert(salaryPayload);
  if (salErr) {
    console.error("salary insert failed:", salErr.message);
    process.exit(1);
  }

  // 4. Insert cost-of-living items
  const colPayload = COST_OF_LIVING.map((c) => ({
    city: c.city,
    country: c.country,
    region: c.region,
    col_index: c.colIndex,
    median_monthly_usd: c.medianMonthlyUsd,
    buying_power_usd: c.buyingPowerUsd,
    milk: c.milk,
    beer: c.beer,
    meal: c.meal,
    takeaway: c.takeaway,
    gym: c.gym,
    taxi: c.taxi,
    source: "seed",
    trust_tier: "seed",
  }));
  console.log(`Inserting ${colPayload.length} cost-of-living items...`);
  const { error: colErr } = await client.from("col_items").insert(colPayload);
  if (colErr) {
    console.error("col insert failed:", colErr.message);
    process.exit(1);
  }

  console.log("Seed complete.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
