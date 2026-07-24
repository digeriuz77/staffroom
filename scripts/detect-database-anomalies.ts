import { supabaseServer } from "../src/lib/db/supabaseClients";

export async function auditAnomalies() {
  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  const { data: records } = await client.from("salary_records").select("*");
  if (!records) {
    console.log("No records found.");
    return;
  }

  console.log(`================ DATABASE ANOMALY AUDIT (${records.length} TOTAL RECORDS) ================`);

  const highSalaryAnomalies: any[] = [];
  const lowSalaryAnomalies: any[] = [];
  const bonusPackageAnomalies: any[] = [];

  // Group by country to find outliers
  const countrySalaries = new Map<string, number[]>();
  records.forEach((r) => {
    const list = countrySalaries.get(r.country) || [];
    if (r.monthly_salary_usd > 0) list.push(r.monthly_salary_usd);
    countrySalaries.set(r.country, list);
  });

  records.forEach((r) => {
    const pkg = (r.package as any) || {};

    // 1. High Salary Check (> $12,000/mo unless explicitly management)
    if (r.monthly_salary_usd > 12000 && !r.management_role) {
      highSalaryAnomalies.push(r);
    } else if (r.monthly_salary_usd > 20000) {
      highSalaryAnomalies.push(r);
    }

    // 2. Low Salary Check (< $400/mo)
    if (r.monthly_salary_usd < 400 && r.monthly_salary_usd > 0) {
      lowSalaryAnomalies.push(r);
    }

    // 3. Package Anomaly Check
    const hAmt = pkg.housingAllowanceUsd || 0;
    const bAmt = pkg.bonusUsd || 0;
    const fAmt = pkg.flightsPerPersonUsd || 0;

    if (hAmt > 8000 || bAmt > 15000 || fAmt > 8000) {
      bonusPackageAnomalies.push({ ...r, anomalyType: `Housing: $${hAmt}, Bonus: $${bAmt}, Flight: $${fAmt}` });
    }
  });

  console.log(`\n1. HIGH SALARY ANOMALIES (> $12,000/mo non-lead or > $20,000/mo): ${highSalaryAnomalies.length}`);
  highSalaryAnomalies.forEach((r) => {
    console.log(` - [ID ${r.id}] ${r.school} (${r.country}): $${r.monthly_salary_usd}/mo | Role: ${r.role} | Currency: ${r.currency}`);
  });

  console.log(`\n2. LOW SALARY ANOMALIES (< $400/mo): ${lowSalaryAnomalies.length}`);
  lowSalaryAnomalies.forEach((r) => {
    console.log(` - [ID ${r.id}] ${r.school} (${r.country}): $${r.monthly_salary_usd}/mo | Role: ${r.role} | Currency: ${r.currency}`);
  });

  console.log(`\n3. OVERLY LARGE PACKAGE ANOMALIES (Housing > $8k, Bonus > $15k, Flight > $8k): ${bonusPackageAnomalies.length}`);
  bonusPackageAnomalies.forEach((r) => {
    console.log(` - [ID ${r.id}] ${r.school} (${r.country}): ${r.anomalyType}`);
  });
}

auditAnomalies();
