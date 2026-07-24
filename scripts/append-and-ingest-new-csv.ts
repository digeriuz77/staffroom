import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseServer } from "../src/lib/db/supabaseClients";
import { slugify } from "../src/lib/data/schools";
import { regionOfCountry, codeOfCountry } from "../src/lib/data/geo";
import type { CurriculumTag, HousingType } from "../src/lib/types";
import type { SalaryPackageFields } from "../src/lib/db/types";

// Robust CSV Parser
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some((r) => r.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some((r) => r.length > 0)) rows.push(row);
  }
  return rows;
}

function parseMoney(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseTax(val: string | undefined): number | null {
  if (!val) return null;
  const cleaned = val.trim().toLowerCase();
  if (cleaned === "" || cleaned === "na" || cleaned === "n/a" || cleaned === "idk" || cleaned.includes("not stated")) {
    return null;
  }
  const num = Number(cleaned.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num / 100 : null;
}

function normalizeCurriculum(raw: string): CurriculumTag {
  const c = (raw || "").trim().toLowerCase();
  if (c.includes("ib") || c.includes("international baccalaureate")) return "IB";
  if (c.includes("british") || c.includes("cambridge") || c.includes("igcse")) return "British";
  if (c.includes("us") || c.includes("american") || c.includes("alberta") || c.includes("ontario")) return "US";
  return "Other";
}

function normalizeHousing(typeStr: string, amtStr: string): HousingType {
  const t = (typeStr || "").trim().toLowerCase();
  if (t.includes("allowance") || t.includes("provided") || parseMoney(amtStr) > 0) {
    if (t.includes("allowance") || parseMoney(amtStr) > 0) return "Allowance";
    return "Provided";
  }
  return "None";
}

export async function processRawCsvText(rawText: string) {
  const rows = parseCsv(rawText);
  const dataRows = rows[0] && rows[0][0].toLowerCase().startsWith("year") ? rows.slice(1) : rows;

  console.log(`Parsed ${dataRows.length} incoming CSV rows for processing.`);

  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  // 1. Fetch existing schools from Supabase
  const { data: dbSchools } = await client.from("schools").select("id, name, city, country, slug");
  const schoolMapBySlug = new Map<string, string>();
  (dbSchools || []).forEach((s) => schoolMapBySlug.set(s.slug, s.id));

  // 2. Fetch existing salary records from Supabase for deduplication
  const { data: dbSalaries } = await client
    .from("salary_records")
    .select("id, school, country, city, year, role, monthly_salary_usd");

  const existingFingerprints = new Set<string>();
  (dbSalaries || []).forEach((r) => {
    const k1 = `${slugify(r.school)}|${slugify(r.country)}|${slugify(r.city)}|${r.year}|${slugify(r.role)}|${r.monthly_salary_usd}`;
    const k2 = `${slugify(r.school)}|${slugify(r.country)}|${r.year}|${r.monthly_salary_usd}`;
    existingFingerprints.add(k1);
    existingFingerprints.add(k2);
  });

  const schoolsToCreate = new Map<string, any>();
  const recordsToInsert: any[] = [];
  let skippedDupes = 0;

  for (const row of dataRows) {
    if (row.length < 5) continue;
    const [
      yearStr,
      country,
      city,
      schoolName,
      curriculumStr,
      gradeLevel,
      roleStr,
      yearsExp,
      salaryInDollars,
      housingInDollars,
      savingsInDollars,
      salaryCurrency,
      monthlySalaryStr,
      savingsPotential,
      taxRateStr,
      flightsAllowance,
      housingAllowance,
      endOfContractBonuses,
      additionalBenefits,
    ] = row;

    if (!schoolName || !country) continue;

    const year = Number(yearStr) || new Date().getFullYear();
    const role = (roleStr && roleStr.trim() !== "N/A" && roleStr.trim() !== "-" ? roleStr.trim() : (gradeLevel || "Teacher")).trim();
    const curriculum = normalizeCurriculum(curriculumStr);

    let monthlySalaryUsd = parseMoney(monthlySalaryStr) || parseMoney(salaryInDollars);
    if (!monthlySalaryUsd) continue;

    if (monthlySalaryUsd > 12000) {
      monthlySalaryUsd = Math.round(monthlySalaryUsd / 12);
    }

    const taxRate = parseTax(taxRateStr);
    const netMonthlyUsd = taxRate != null ? Math.round(monthlySalaryUsd * (1 - taxRate)) : monthlySalaryUsd;
    const netAnnualUsd = netMonthlyUsd * 12;

    const housingType = normalizeHousing(housingAllowance, housingInDollars);
    const flights = Boolean(flightsAllowance && flightsAllowance.trim() !== "" && flightsAllowance.trim() !== "0");

    const fp1 = `${slugify(schoolName)}|${slugify(country)}|${slugify(city)}|${year}|${slugify(role)}|${monthlySalaryUsd}`;
    const fp2 = `${slugify(schoolName)}|${slugify(country)}|${year}|${monthlySalaryUsd}`;

    if (existingFingerprints.has(fp1) || existingFingerprints.has(fp2)) {
      skippedDupes++;
      continue;
    }

    existingFingerprints.add(fp1);
    existingFingerprints.add(fp2);

    const isAnon =
      schoolName.toLowerCase().includes("don't want") ||
      schoolName.toLowerCase().includes("cannot be disclosed") ||
      schoolName.trim() === "--" ||
      schoolName.trim() === "N/A";

    const schoolSlug = slugify(`${schoolName} ${city || ""} ${country}`);
    let schoolId = schoolMapBySlug.get(schoolSlug);

    if (!schoolId && !isAnon) {
      if (!schoolsToCreate.has(schoolSlug)) {
        const newUuid = crypto.randomUUID();
        const newSchool = {
          id: newUuid,
          slug: schoolSlug,
          name: schoolName.trim(),
          city: (city || "").trim(),
          country: country.trim(),
          country_code: codeOfCountry(country.trim()),
          region: regionOfCountry(country.trim()),
          curricula: [curriculum],
        };
        schoolsToCreate.set(schoolSlug, newSchool);
        schoolMapBySlug.set(schoolSlug, newUuid);
      }
    }

    const pkg: SalaryPackageFields = {};
    const housingAmt = parseMoney(housingInDollars) || parseMoney(housingAllowance);
    if (housingAmt > 0) pkg.housingAllowanceUsd = housingAmt;
    if (housingType === "Provided") pkg.housingProvided = true;
    const flightAmt = parseMoney(flightsAllowance);
    if (flightAmt > 0) pkg.flightsPerPersonUsd = flightAmt;
    const bonusAmt = parseMoney(endOfContractBonuses);
    if (bonusAmt > 0) pkg.bonusUsd = bonusAmt;

    recordsToInsert.push({
      school_slug: schoolSlug,
      school: schoolName.trim(),
      city: (city || "").trim(),
      country: country.trim(),
      year,
      curriculum,
      role,
      management_role: role.toLowerCase().includes("head") || role.toLowerCase().includes("principal") || role.toLowerCase().includes("director"),
      tenure_years: Number(yearsExp) || null,
      currency: salaryCurrency || "USD",
      monthly_salary_usd: monthlySalaryUsd,
      net_monthly_usd: netMonthlyUsd,
      net_annual_usd: netAnnualUsd,
      tax_rate: taxRate,
      housing: housingType,
      flights,
      package: pkg,
      source: "user_submit",
      trust_tier: "seed",
      status: "approved",
    });
  }

  console.log(`Ingestion Plan:`);
  console.log(`- New unique salary records to insert: ${recordsToInsert.length}`);
  console.log(`- Duplicate entries skipped: ${skippedDupes}`);
  console.log(`- New schools to create: ${schoolsToCreate.size}`);

  // Create new schools
  if (schoolsToCreate.size > 0) {
    const schoolList = Array.from(schoolsToCreate.values());
    const { error: schoolErr } = await client.from("schools").upsert(schoolList, { onConflict: "slug" });
    if (schoolErr) {
      console.error("Error creating new schools:", schoolErr.message);
    } else {
      console.log(`Successfully created ${schoolList.length} new schools in Supabase.`);
    }
  }

  // Reload schools to ensure all UUIDs are mapped
  const { data: updatedSchools } = await client.from("schools").select("id, slug");
  (updatedSchools || []).forEach((s) => schoolMapBySlug.set(s.slug, s.id));

  // Insert salary records
  const finalRows = recordsToInsert.map((r) => {
    const { school_slug, ...rest } = r;
    const schoolId = schoolMapBySlug.get(school_slug) || null;
    return {
      ...rest,
      school_id: schoolId,
    };
  });

  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < finalRows.length; i += BATCH_SIZE) {
    const batch = finalRows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await client.from("salary_records").insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch ${i}:`, insertErr.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Inserted ${inserted} new salary records into Supabase.`);
}
