import fs from "fs";
import path from "path";
import { slugify } from "../src/lib/data/schools";
import { supabaseServer } from "../src/lib/db/supabaseClients";

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

async function detailedAudit() {
  const csv1Path = path.join(process.cwd(), "supabase", "international_schools_salary_data.csv");
  const csv2Path = path.join(process.cwd(), "supabase", "international_school_salaries.csv");

  const rows1 = fs.existsSync(csv1Path) ? parseCsv(fs.readFileSync(csv1Path, "utf8")).slice(1) : [];
  const rows2 = fs.existsSync(csv2Path) ? parseCsv(fs.readFileSync(csv2Path, "utf8")).slice(1) : [];

  const totalSubmissionRows = rows1.length + rows2.length;

  const schoolSubmissions = new Map<string, { name: string; city: string; country: string; count: number }>();

  [...rows1, ...rows2].forEach((r) => {
    const [year, country, city, schoolName] = r;
    if (!schoolName || !country) return;
    const name = schoolName.trim();
    if (
      name.toLowerCase() === "school name" ||
      name.toLowerCase().includes("don't want") ||
      name.toLowerCase().includes("cannot be disclosed") ||
      name === "--" ||
      name === "N/A"
    ) {
      return;
    }
    const slug = slugify(`${name} ${city || ""} ${country}`);
    const existing = schoolSubmissions.get(slug);
    if (existing) {
      existing.count++;
    } else {
      schoolSubmissions.set(slug, {
        name,
        city: (city || "").trim(),
        country: country.trim(),
        count: 1,
      });
    }
  });

  const client = supabaseServer();
  if (!client) return;
  const { count: totalDbSchools } = await client.from("schools").select("id", { count: "exact" });
  const { count: totalDbSalaries } = await client.from("salary_records").select("id", { count: "exact" });

  console.log(`================ DETAILED DATASET AUDIT ================`);
  console.log(`1. Total Raw Salary Submission Rows Provided in CSVs: ${totalSubmissionRows}`);
  console.log(`2. Total Distinct School Profiles Represented in CSVs: ${schoolSubmissions.size}`);
  console.log(`--------------------------------------------------------`);
  console.log(`Why are there ${totalSubmissionRows} salary submissions but ${schoolSubmissions.size} distinct schools?`);
  console.log(`Answer: Many schools in your dataset have MULTIPLE salary submissions from different teachers!\n`);

  let multiCount = 0;
  console.log(`Top Schools with Multiple Teacher Submissions in your CSVs:`);
  for (const [slug, item] of schoolSubmissions.entries()) {
    if (item.count > 1) {
      multiCount++;
      if (multiCount <= 15) {
        console.log(` - ${item.name} (${item.country}): ${item.count} teacher submissions`);
      }
    }
  }

  console.log(`\n================ DATABASE GROWTH COMPARISON ================`);
  console.log(`- Base Seed Dataset Schools (Before Imports): 553 schools`);
  console.log(`- Current Total Schools in Database (After Imports): ${totalDbSchools} schools`);
  console.log(`- NET NEW Schools Added to Database: +${(totalDbSchools || 0) - 553} schools!`);
  console.log(`- Current Total Salary Records in Database: ${totalDbSalaries} records!`);
  console.log(`============================================================`);
}

detailedAudit().catch(console.error);
