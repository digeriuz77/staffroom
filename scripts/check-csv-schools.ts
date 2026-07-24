import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseServer } from "../src/lib/db/supabaseClients";
import { slugify } from "../src/lib/data/schools";
import { regionOfCountry, codeOfCountry } from "../src/lib/data/geo";

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

async function auditAndEnsureAllSchools() {
  const csvPath = path.join(process.cwd(), "supabase", "international_schools_salary_data.csv");
  const fileText = fs.readFileSync(csvPath, "utf8");
  const dataRows = parseCsv(fileText).slice(1);

  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  // Fetch all schools from DB
  const { data: dbSchools } = await client.from("schools").select("id, name, city, country, slug");
  const existingSchoolSlugs = new Map<string, string>(); // slug -> id
  (dbSchools || []).forEach((s) => {
    existingSchoolSlugs.set(s.slug, s.id);
  });

  console.log(`Currently in Supabase: ${dbSchools?.length} total schools.`);

  const csvSchoolsMap = new Map<string, { name: string; city: string; country: string; curriculum: string }>();

  dataRows.forEach((r) => {
    const [year, country, city, schoolName, curriculum] = r;
    if (!schoolName || !country) return;
    const trimmedName = schoolName.trim();
    // Skip anonymous entries for school directory creation
    if (
      trimmedName.toLowerCase().includes("don't want") ||
      trimmedName.toLowerCase().includes("cannot be disclosed") ||
      trimmedName === "--" ||
      trimmedName === "N/A"
    ) {
      return;
    }
    const slug = slugify(`${trimmedName} ${city || ""} ${country}`);
    if (!csvSchoolsMap.has(slug)) {
      csvSchoolsMap.set(slug, {
        name: trimmedName,
        city: (city || "").trim(),
        country: country.trim(),
        curriculum: (curriculum || "").trim(),
      });
    }
  });

  console.log(`Total unique named schools in CSV: ${csvSchoolsMap.size}`);

  let createdSchools = 0;
  let alreadyExisted = 0;

  for (const [slug, data] of csvSchoolsMap.entries()) {
    if (existingSchoolSlugs.has(slug)) {
      alreadyExisted++;
    } else {
      // Check fuzzy match (e.g. just school name in same country)
      const nameOnlySlug = slugify(`${data.name} ${data.country}`);
      let foundId: string | undefined;
      for (const [existingSlug, id] of existingSchoolSlugs.entries()) {
        if (existingSlug === slug || existingSlug === nameOnlySlug || existingSlug.includes(slugify(data.name))) {
          foundId = id;
          break;
        }
      }

      if (foundId) {
        alreadyExisted++;
        existingSchoolSlugs.set(slug, foundId);
      } else {
        // Create new school in Supabase
        const newUuid = crypto.randomUUID();
        const { error } = await client.from("schools").insert({
          id: newUuid,
          slug,
          name: data.name,
          city: data.city,
          country: data.country,
          country_code: codeOfCountry(data.country),
          region: regionOfCountry(data.country),
          curricula: [data.curriculum ? (data.curriculum.toLowerCase().includes("ib") ? "IB" : data.curriculum.toLowerCase().includes("british") ? "British" : data.curriculum.toLowerCase().includes("us") ? "US" : "Other") : "Other"],
        });

        if (!error) {
          createdSchools++;
          existingSchoolSlugs.set(slug, newUuid);
          console.log(`Created new school in Supabase: "${data.name}" (${data.city}, ${data.country})`);
        } else {
          console.error(`Error creating school ${data.name}:`, error.message);
        }
      }
    }
  }

  console.log(`\nSchool Audit Breakdown:`);
  console.log(`- Total Unique Named Schools in CSV: ${csvSchoolsMap.size}`);
  console.log(`- Already existed in DB (from seed dataset or prior imports): ${alreadyExisted}`);
  console.log(`- Newly created schools: ${createdSchools}`);

  // Now ensure ALL salary records are properly linked to these schools
  const { data: unlinkedSalaries } = await client.from("salary_records").select("id, school, city, country").is("school_id", null);
  console.log(`Checking unlinked salary records (${unlinkedSalaries?.length || 0} remaining)...`);

  let newlyLinked = 0;
  for (const s of unlinkedSalaries || []) {
    const slug = slugify(`${s.school} ${s.city || ""} ${s.country}`);
    const schoolId = existingSchoolSlugs.get(slug);
    if (schoolId) {
      await client.from("salary_records").update({ school_id: schoolId }).eq("id", s.id);
      newlyLinked++;
    }
  }

  console.log(`Linked ${newlyLinked} additional salary records to their schools.`);

  const { count: finalSchoolCount } = await client.from("schools").select("id", { count: "exact" });
  const { count: finalSalaryCount } = await client.from("salary_records").select("id", { count: "exact" });
  const { count: finalUnlinkedCount } = await client.from("salary_records").select("id", { count: "exact" }).is("school_id", null);

  console.log(`\nFinal Supabase Database Totals:`);
  console.log(`- Total Schools in Database: ${finalSchoolCount}`);
  console.log(`- Total Salary Records in Database: ${finalSalaryCount}`);
  console.log(`- Unlinked Salary Records: ${finalUnlinkedCount}`);
}

auditAndEnsureAllSchools().catch(console.error);
