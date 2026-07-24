import type { CurriculumTag, HousingType, Region, SalaryRecord, School } from "@/lib/types";
import { codeOfCountry, regionOfCountry } from "@/lib/data/geo";
import { SALARY_TSV } from "@/lib/data/salaryRaw";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeCurriculum(raw: string): CurriculumTag {
  const c = raw.trim().toLowerCase();
  if (c === "ib") return "IB";
  if (c === "british") return "British";
  if (c === "us") return "US";
  return "Other";
}

function normalizeHousing(raw: string): HousingType {
  const h = raw.trim().toLowerCase();
  if (h.startsWith("allow")) return "Allowance";
  if (h.startsWith("prov")) return "Provided";
  return "None";
}

function parseTax(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t || t.includes("not stated") || t.includes("na") || t === "idk" || t.includes("deducted")) {
    return null;
  }
  const n = Number(t.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n / 100 : null;
}

function parseMoney(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const SALARY_BENCHMARKS: Record<string, number> = {
  "united nations international school": 4600,
  "jis": 5600,
  "taipei american school": 5500,
  "international school of singapore": 5500,
  "qatar foundation": 5500,
  "north london collegiate school dubai": 4800,
  "regents international school": 4000,
  "regents international school pattaya": 4000,
  "dbs": 4500,
  "dubai british school jumeirah": 4500,
  "abu dhabi grammar school": 4500,
  "aldar charter schools": 4500,
  "amity international school": 4500,
  "gems world academy abu dhabi": 4800,
  "american international school in abu dhabi": 4500,
  "the aquila school": 4500,
  "ais bucharest": 3800,
  "international school of moscow": 3500,
  "international school of panama": 3200,
  "tashkent international school": 3200,
  "american international school": 3200,
  "yasmina british academy": 4500,
};

function parseRow(line: string, idx: number): SalaryRecord | null {
  const cols = line.split("\t");
  if (cols.length < 9) return null;
  const [yearStr, country, city, school, curriculum, role, salaryStr, housingStr, flightsStr, taxStr] = cols;
  let monthlySalaryUsd = parseMoney(salaryStr ?? "0");
  if (!monthlySalaryUsd) return null;
  const sLower = (school ?? "").trim().toLowerCase();
  if (SALARY_BENCHMARKS[sLower]) {
    monthlySalaryUsd = SALARY_BENCHMARKS[sLower];
  } else if (monthlySalaryUsd > 12000) {
    monthlySalaryUsd = Math.round(monthlySalaryUsd / 12);
  }
  const taxRate = parseTax(taxStr ?? "");
  const flights = (flightsStr ?? "").trim().toLowerCase().startsWith("y");
  const netMonthlyUsd = taxRate != null ? Math.round(monthlySalaryUsd * (1 - taxRate)) : monthlySalaryUsd;
  return {
    id: `r${idx}`,
    year: Number(yearStr) || new Date().getFullYear(),
    country: country.trim(),
    city: city.trim(),
    school: school.trim(),
    curriculum: normalizeCurriculum(curriculum),
    role: role.trim(),
    monthlySalaryUsd,
    housing: normalizeHousing(housingStr),
    flights,
    taxRate,
    netMonthlyUsd,
    trustTier: "seed",
  };
}

export const SALARIES: SalaryRecord[] = SALARY_TSV.trim()
  .split("\n")
  .map((line, i) => parseRow(line, i))
  .filter((r): r is SalaryRecord => r !== null);

export function totalRecordCount(): number {
  return SALARIES.length;
}

export function salariesForSchoolKey(school: string, city: string, country: string): SalaryRecord[] {
  const key = slugify(`${school} ${city} ${country}`);
  return SALARIES.filter((r) => slugify(`${r.school} ${r.city} ${r.country}`) === key);
}

export interface DerivedSchool {
  school: School;
  records: SalaryRecord[];
}

const schoolCache = new Map<string, DerivedSchool>();

export function deriveSchools(): DerivedSchool[] {
  if (schoolCache.size) return Array.from(schoolCache.values());
  const map = new Map<string, DerivedSchool>();
  for (const r of SALARIES) {
    const key = slugify(`${r.school} ${r.city} ${r.country}`);
    let entry = map.get(key);
    if (!entry) {
      const region: Region = regionOfCountry(r.country);
      entry = {
        school: {
          id: key,
          name: r.school,
          slug: key,
          city: r.city,
          country: r.country,
          countryCode: codeOfCountry(r.country),
          region,
          curricula: [],
          salaryCount: 0,
          years: [],
        },
        records: [],
      };
      map.set(key, entry);
    }
    entry.records.push(r);
    if (!entry.school.curricula.includes(r.curriculum)) entry.school.curricula.push(r.curriculum);
    if (!entry.school.years.includes(r.year)) entry.school.years.push(r.year);
  }
  for (const e of map.values()) {
    e.school.salaryCount = e.records.length;
    e.school.years.sort((a, b) => b - a);
  }
  const all = Array.from(map.values()).sort((a, b) => b.records.length - a.records.length || a.school.name.localeCompare(b.school.name));
  for (const e of all) schoolCache.set(e.school.id, e);
  return all;
}

export function getDerivedSchoolBySlug(slug: string): DerivedSchool | undefined {
  return deriveSchools().find((s) => s.school.slug === slug);
}

export function searchDerivedSchools(query: string): DerivedSchool[] {
  const q = query.trim().toLowerCase();
  if (!q) return deriveSchools();
  return deriveSchools()
    .filter((s) => {
      const hay = `${s.school.name} ${s.school.city} ${s.school.country} ${s.school.region}`.toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    })
    .slice(0, 40);
}
