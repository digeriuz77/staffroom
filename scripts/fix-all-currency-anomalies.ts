import { supabaseServer } from "../src/lib/db/supabaseClients";

export async function fixAllAnomalies() {
  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  console.log("================ FULL DATABASE CURRENCY & ANOMALY NORMALIZATION ================");

  const { data: records } = await client.from("salary_records").select("*");
  if (!records) return;

  let fixedSalaryCount = 0;
  let fixedPackageCount = 0;

  for (const r of records) {
    let updatedMonthlyUsd = r.monthly_salary_usd;
    let updatedNetMonthlyUsd = r.net_monthly_usd;
    let updatedNetAnnualUsd = r.net_annual_usd;
    let pkg = { ...(r.package as any || {}) };

    let isModified = false;

    // 1. Japanese Yen (JPY) check: monthly_salary_usd between 25,000 and 100,000 (monthly JPY amount)
    if (r.currency === "Yen" || (r.country === "Japan" && updatedMonthlyUsd > 15000)) {
      if (updatedMonthlyUsd > 15000) {
        // Divide by 15 (converting monthly JPY to monthly USD: e.g. 45,000 JPY -> $3,000 USD)
        updatedMonthlyUsd = Math.round(updatedMonthlyUsd / 15);
        isModified = true;
      }
    }

    // 2. Colombian Peso (COP) check: monthly_salary_usd > 100,000
    if (r.currency === "Colombian Peso" || (r.country === "Colombia" && updatedMonthlyUsd > 100000)) {
      if (updatedMonthlyUsd > 100000) {
        // Divide by 400 (converting 4M COP to $1,000 USD)
        updatedMonthlyUsd = Math.round(updatedMonthlyUsd / 400);
        isModified = true;
      }
    }

    // 3. Kazakhstan Tenge (KZT) check
    if (r.currency === "Tenge" || (r.country === "Kazakhstan" && updatedMonthlyUsd > 50000)) {
      if (updatedMonthlyUsd > 50000) {
        updatedMonthlyUsd = Math.round(updatedMonthlyUsd / 48);
        isModified = true;
      }
    }

    // 4. Russian Ruble (RUB) check
    if (r.currency === "Russian Ruble" || (r.country === "Russia" && updatedMonthlyUsd > 20000)) {
      if (updatedMonthlyUsd > 20000) {
        updatedMonthlyUsd = Math.round(updatedMonthlyUsd / 9);
        isModified = true;
      }
    }

    // Sanity check: Cap maximum non-management teacher salary at $12,000/mo net
    if (updatedMonthlyUsd > 12000 && !r.management_role) {
      updatedMonthlyUsd = 12000;
      isModified = true;
    }

    if (isModified) {
      const taxRate = r.tax_rate ?? 0;
      updatedNetMonthlyUsd = Math.round(updatedMonthlyUsd * (1 - taxRate));
      updatedNetAnnualUsd = updatedNetMonthlyUsd * 12;
      fixedSalaryCount++;
    }

    // 5. Package Field Anomalies (Bonuses & Flights entered in local currency)
    let isPkgModified = false;
    if (pkg.bonusUsd && pkg.bonusUsd > 15000) {
      if (r.country === "Colombia") pkg.bonusUsd = Math.round(pkg.bonusUsd / 4000);
      else if (r.country === "Thailand") pkg.bonusUsd = Math.round(pkg.bonusUsd / 36);
      else if (r.country === "Hong Kong") pkg.bonusUsd = Math.round(pkg.bonusUsd / 7.8);
      else if (r.country === "Taiwan") pkg.bonusUsd = Math.round(pkg.bonusUsd / 32);
      else if (r.country === "China") pkg.bonusUsd = Math.round(pkg.bonusUsd / 7.2);
      else if (r.country === "Japan") pkg.bonusUsd = Math.round(pkg.bonusUsd / 150);
      else if (r.country === "Russia") pkg.bonusUsd = Math.round(pkg.bonusUsd / 90);
      else pkg.bonusUsd = 10000;
      isPkgModified = true;
    }

    if (pkg.flightsPerPersonUsd && pkg.flightsPerPersonUsd > 8000) {
      if (r.country === "Colombia") pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 4000);
      else if (r.country === "Thailand") pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 36);
      else if (r.country === "Taiwan") pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 32);
      else if (r.country === "China") pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 7.2);
      else if (r.country === "Japan") pkg.flightsPerPersonUsd = Math.round(pkg.flightsPerPersonUsd / 150);
      else pkg.flightsPerPersonUsd = 2000;
      isPkgModified = true;
    }

    if (isPkgModified) fixedPackageCount++;

    if (isModified || isPkgModified) {
      await client
        .from("salary_records")
        .update({
          monthly_salary_usd: updatedMonthlyUsd,
          net_monthly_usd: updatedNetMonthlyUsd,
          net_annual_usd: updatedNetAnnualUsd,
          package: pkg,
        })
        .eq("id", r.id);
    }
  }

  console.log(`================ NORMALIZATION COMPLETE ================`);
  console.log(`- Fixed Monthly Salary Anomalies: ${fixedSalaryCount} records`);
  console.log(`- Fixed Package Bonus/Flight Anomalies: ${fixedPackageCount} records`);
}

fixAllAnomalies();
