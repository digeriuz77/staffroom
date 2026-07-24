import { supabaseServer } from "../src/lib/db/supabaseClients";

export async function fixResiduals() {
  const client = supabaseServer();
  if (!client) return;

  console.log("================ CLEANING RESIDUAL ANOMALIES ================");

  // 1. Fix low salary typos (< $50/mo)
  await client.from("salary_records").update({ monthly_salary_usd: 800, net_monthly_usd: 800, net_annual_usd: 9600 }).eq("id", "ecec0782-ec03-4f95-8e49-856de3747a78");
  await client.from("salary_records").update({ monthly_salary_usd: 1000, net_monthly_usd: 1000, net_annual_usd: 12000 }).eq("id", "3b584f28-981d-420c-af06-f8a0a0420e69");
  await client.from("salary_records").update({ monthly_salary_usd: 2300, net_monthly_usd: 2300, net_annual_usd: 27600 }).eq("id", "12d4d100-efcb-48e8-9971-88b7555eb6bb");

  // 2. Fix Clarence International School Japan housing JPY -> USD (188k JPY -> $1,250 USD)
  const { data: clarence } = await client.from("salary_records").select("*").eq("id", "a8ce82d2-9b93-4c60-82b1-549ee5114b05").single();
  if (clarence) {
    const pkg = (clarence.package as any) || {};
    pkg.housingAllowanceUsd = 1250;
    await client.from("salary_records").update({ package: pkg }).eq("id", clarence.id);
  }

  // 3. Normalize all remaining Thai records where bonus/flights are in THB (> 15,000 THB)
  const { data: thaiRecords } = await client.from("salary_records").select("*").eq("country", "Thailand");
  if (thaiRecords) {
    for (const r of thaiRecords) {
      const pkg = (r.package as any) || {};
      let mod = false;
      if (pkg.bonusUsd && pkg.bonusUsd > 10000) {
        pkg.bonusUsd = Math.round(pkg.bonusUsd / 36);
        mod = true;
      }
      if (pkg.flightsPerPersonUsd && pkg.flightsPerPersonUsd > 5000) {
        pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 36);
        mod = true;
      }
      if (mod) {
        await client.from("salary_records").update({ package: pkg }).eq("id", r.id);
      }
    }
  }

  // 4. Normalize Hong Kong records where bonus/flights are in HKD (> 25,000 HKD)
  const { data: hkRecords } = await client.from("salary_records").select("*").eq("country", "Hong Kong");
  if (hkRecords) {
    for (const r of hkRecords) {
      const pkg = (r.package as any) || {};
      let mod = false;
      if (pkg.bonusUsd && pkg.bonusUsd > 25000) {
        pkg.bonusUsd = Math.round(pkg.bonusUsd / 7.8);
        mod = true;
      }
      if (pkg.flightsPerPersonUsd && pkg.flightsPerPersonUsd > 10000) {
        pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 7.8);
        mod = true;
      }
      if (mod) {
        await client.from("salary_records").update({ package: pkg }).eq("id", r.id);
      }
    }
  }

  console.log("✓ Residual package anomalies successfully normalized!");
}

fixResiduals();
