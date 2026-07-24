import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseServer } from "../src/lib/db/supabaseClients";
import { slugify } from "../src/lib/data/schools";
import { regionOfCountry, codeOfCountry } from "../src/lib/data/geo";
import type { CurriculumTag, HousingType } from "../src/lib/types";
import type { SalaryPackageFields } from "../src/lib/db/types";

// Robust CSV Parser supporting multiline quoted strings & escaped quotes
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
  if (c.includes("british")) return "British";
  if (c.includes("us") || c.includes("american")) return "US";
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

async function processIngestion(dryRun = true) {
  const csvPath = path.join(process.cwd(), "supabase", "international_schools_salary_data.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    return;
  }

  const fileText = fs.readFileSync(csvPath, "utf8");
  const allRows = parseCsv(fileText);
  if (allRows.length < 2) {
    console.error("CSV has no data rows.");
    return;
  }

  const header = allRows[0];
  const dataRows = allRows.slice(1);
  console.log(`Parsed CSV successfully. Header count: ${header.length}, Data rows: ${dataRows.length}`);

  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  // 1. Fetch existing schools from Supabase
  const { data: existingSchools } = await client.from("schools").select("id, name, city, country, slug");
  const schoolMapBySlug = new Map<string, string>(); // slug -> id (UUID)
  (existingSchools || []).forEach((s) => {
    schoolMapBySlug.set(s.slug, s.id);
  });

  // 2. Fetch existing salary records from Supabase
  const { data: existingSalaries } = await client
    .from("salary_records")
    .select("id, school, country, city, year, role, monthly_salary_usd, net_monthly_usd");

  // Create duplicate matching fingerprints
  const existingFingerprints = new Set<string>();
  (existingSalaries || []).forEach((r) => {
    const key1 = `${slugify(r.school)}|${slugify(r.country)}|${slugify(r.city)}|${r.year}|${slugify(r.role)}|${r.monthly_salary_usd}`;
    const key2 = `${slugify(r.school)}|${slugify(r.country)}|${r.year}|${r.monthly_salary_usd}`;
    existingFingerprints.add(key1);
    existingFingerprints.add(key2);
  });

  console.log(`Loaded ${schoolMapBySlug.size} existing schools and ${existingSalaries?.length || 0} existing salary records.`);

  let skippedDuplicateCount = 0;
  const recordsToInsert: any[] = [];
  const schoolsToCreate = new Map<string, any>(); // slug -> school object

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
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
    const role = (roleStr && roleStr.trim() !== "N/A" ? roleStr.trim() : (gradeLevel || "Teacher")).trim();
    const curriculum = normalizeCurriculum(curriculumStr);

    let monthlySalaryUsd = parseMoney(monthlySalaryStr) || parseMoney(salaryInDollars);
    if (!monthlySalaryUsd) continue;

    // Handle annual vs monthly salary heuristic
    if (monthlySalaryUsd > 12000) {
      monthlySalaryUsd = Math.round(monthlySalaryUsd / 12);
    }

    const taxRate = parseTax(taxRateStr);
    const netMonthlyUsd = taxRate != null ? Math.round(monthlySalaryUsd * (1 - taxRate)) : monthlySalaryUsd;
    const netAnnualUsd = netMonthlyUsd * 12;

    const housingType = normalizeHousing(housingAllowance, housingInDollars);
    const flights = Boolean(flightsAllowance && flightsAllowance.trim() !== "" && flightsAllowance.trim() !== "0");

    // Fingerprint for deduplication
    const fingerprint1 = `${slugify(schoolName)}|${slugify(country)}|${slugify(city)}|${year}|${slugify(role)}|${monthlySalaryUsd}`;
    const fingerprint2 = `${slugify(schoolName)}|${slugify(country)}|${year}|${monthlySalaryUsd}`;

    if (existingFingerprints.has(fingerprint1) || existingFingerprints.has(fingerprint2)) {
      skippedDuplicateCount++;
      continue;
    }

    // Add to existing fingerprints set so we don't insert internal CSV duplicates!
    existingFingerprints.add(fingerprint1);
    existingFingerprints.add(fingerprint2);

    // School slug and UUID creation
    const schoolSlug = slugify(`${schoolName} ${city} ${country}`);
    let schoolId = schoolMapBySlug.get(schoolSlug);

    if (!schoolId) {
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
      school_slug: schoolSlug, // temp field for linking
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

  console.log(`Ingestion Summary:`);
  console.log(`- Total valid new records to insert: ${recordsToInsert.length}`);
  console.log(`- Total duplicates skipped: ${skippedDuplicateCount}`);
  console.log(`- New schools to create: ${schoolsToCreate.size}`);

  if (dryRun) {
    console.log(`Dry run complete. Pass dryRun=false to perform real inserts.`);
    return;
  }

  // Real insertion phase
  // 1. Insert new schools first
  if (schoolsToCreate.size > 0) {
    const schoolList = Array.from(schoolsToCreate.values());
    const { error: schoolErr } = await client.from("schools").upsert(schoolList, { onConflict: "slug" });
    if (schoolErr) {
      console.error("Error creating new schools:", schoolErr.message);
    } else {
      console.log(`Successfully created ${schoolList.length} new schools.`);
    }
  }

  // 2. Update school_id for all newly created schools & existing schools
  const { data: updatedSchools } = await client.from("schools").select("id, slug");
  (updatedSchools || []).forEach((s) => {
    schoolMapBySlug.set(s.slug, s.id);
  });

  // 3. Link school_id and insert salary records
  const finalSalaryRows = recordsToInsert.map((r) => {
    const { school_slug, ...rest } = r;
    const schoolId = schoolMapBySlug.get(school_slug) || null;
    return {
      ...rest,
      school_id: schoolId,
    };
  });

  // Also update any existing salary_records in Supabase that have null school_id if school_slug matches!
  for (const sRow of finalSalaryRows) {
    if (sRow.school_id) {
      await client
        .from("salary_records")
        .update({ school_id: sRow.school_id })
        .is("school_id", null)
        .ilike("school", sRow.school)
        .eq("country", sRow.country);
    }
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < finalSalaryRows.length; i += BATCH_SIZE) {
    const batch = finalSalaryRows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await client.from("salary_records").insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch ${i}:`, insertErr.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Finished! Successfully linked and inserted ${inserted} salary records into Supabase.`);
}

const isDryRun = process.argv.includes("--execute") ? false : true;
processIngestion(isDryRun).catch(console.error);
