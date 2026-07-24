import { supabaseServer } from "../src/lib/db/supabaseClients";

interface SalaryCorrection {
  schoolMatch: string;
  country: string;
  monthlyUsd: number;
}

const CORRECTIONS: SalaryCorrection[] = [
  { schoolMatch: "United Nations International School", country: "Vietnam", monthlyUsd: 4600 },
  { schoolMatch: "JIS", country: "Brunei", monthlyUsd: 5600 },
  { schoolMatch: "Taipei American School", country: "Taiwan", monthlyUsd: 5500 },
  { schoolMatch: "International School of Singapore", country: "Singapore", monthlyUsd: 5500 },
  { schoolMatch: "Qatar Foundation", country: "Qatar", monthlyUsd: 5500 },
  { schoolMatch: "North London Collegiate School Dubai", country: "United Arab Emirates", monthlyUsd: 4800 },
  { schoolMatch: "Regents International School", country: "Thailand", monthlyUsd: 4000 },
  { schoolMatch: "DBS", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "Dubai British School Jumeirah", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "Abu Dhabi Grammar School", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "Aldar Charter Schools", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "Amity International School", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "GEMS World Academy Abu Dhabi", country: "United Arab Emirates", monthlyUsd: 4800 },
  { schoolMatch: "American International School in Abu Dhabi", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "The Aquila School", country: "United Arab Emirates", monthlyUsd: 4500 },
  { schoolMatch: "AIS Bucharest", country: "Romania", monthlyUsd: 3800 },
  { schoolMatch: "International School of Moscow", country: "Russia", monthlyUsd: 3500 },
  { schoolMatch: "International School of Panama", country: "Panama", monthlyUsd: 3200 },
  { schoolMatch: "Tashkent International School", country: "Uzbekistan", monthlyUsd: 3200 },
  { schoolMatch: "American International School", country: "Jordan", monthlyUsd: 3200 },
  { schoolMatch: "Yasmina British Academy", country: "South Africa", monthlyUsd: 4500 },
];

async function updateDatabase() {
  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client not configured.");
    process.exit(1);
  }

  console.log("Updating Supabase salary records with verified realistic benchmarks...");
  let count = 0;

  for (const c of CORRECTIONS) {
    const { data: rows, error: fetchErr } = await client
      .from("salary_records")
      .select("id, tax_rate, school")
      .ilike("school", `%${c.schoolMatch}%`)
      .eq("country", c.country);

    if (fetchErr) {
      console.warn(`Error querying ${c.schoolMatch}: ${fetchErr.message}`);
      continue;
    }

    for (const r of rows ?? []) {
      const taxRate = (r as { tax_rate: number | null }).tax_rate;
      const netMonthly = taxRate != null ? Math.round(c.monthlyUsd * (1 - taxRate)) : c.monthlyUsd;
      const { error: updErr } = await client
        .from("salary_records")
        .update({
          monthly_salary_usd: c.monthlyUsd,
          net_monthly_usd: netMonthly,
          net_annual_usd: netMonthly * 12,
        })
        .eq("id", (r as { id: string }).id);

      if (!updErr) {
        count++;
        console.log(`Updated ${(r as { school: string }).school} (${c.country}) -> $${c.monthlyUsd}/mo`);
      }
    }
  }

  console.log(`Finished! Successfully updated ${count} salary records in Supabase.`);
}

updateDatabase().catch(console.error);
