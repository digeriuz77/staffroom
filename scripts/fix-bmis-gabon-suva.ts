import { supabaseServer } from "../src/lib/db/supabaseClients";

export async function fixRecords() {
  const client = supabaseServer();
  if (!client) {
    console.error("Supabase client unavailable.");
    return;
  }

  console.log("================ FIXING BMIS, GABON & INTERNATIONAL SCHOOL SUVA ================");

  // 1. Delete BMIS 687,500 anomaly record
  const { error: bmisErr } = await client
    .from("salary_records")
    .delete()
    .eq("id", "4d625a6a-3676-4a39-9585-2bfbd2301383");

  if (bmisErr) console.error("Error deleting BMIS anomaly:", bmisErr.message);
  else console.log("✓ Successfully deleted Bishop Mackenzie International School (BMIS) 687,500 anomaly record.");

  // 2. Delete Gabon (Ecole Ruban Vert) 116,667 anomaly record
  const { error: gabonErr } = await client
    .from("salary_records")
    .delete()
    .eq("id", "40ade975-3598-4623-9f31-b60a5b67f3ec");

  if (gabonErr) console.error("Error deleting Gabon anomaly:", gabonErr.message);
  else console.log("✓ Successfully deleted Gabon (Ecole Ruban Vert) 116,667 anomaly record.");

  // Update remaining Gabon record to 2,473 net USD/mo
  const { error: gabonUpdateErr } = await client
    .from("salary_records")
    .update({
      monthly_salary_usd: 2473,
      net_monthly_usd: 2473,
      net_annual_usd: 29676,
      tax_rate: 0,
    })
    .eq("id", "df200890-2112-4d1e-9353-55f84fa4f00e");

  if (gabonUpdateErr) console.error("Error updating Gabon record:", gabonUpdateErr.message);
  else console.log("✓ Successfully normalized Gabon (Ecole Ruban Vert) to net 2,473 - 3,000 USD/mo.");

  // 3. Fix International School Suva (Fiji) records
  // Update Teaching Record 1 (11,240 anomaly) -> 36k FJD/yr median = 1,886 USD gross, 1,320 USD net
  const { error: suva1Err } = await client
    .from("salary_records")
    .update({
      monthly_salary_usd: 1886,
      net_monthly_usd: 1320,
      net_annual_usd: 15840,
      tax_rate: 0.3,
      role: "Secondary Teacher",
      management_role: false,
    })
    .eq("id", "a2703940-a89a-4aaf-a670-d634afc71130");

  if (suva1Err) console.error("Error updating Suva record 1:", suva1Err.message);
  else console.log("✓ Successfully updated International School Suva teaching record 1 to 1,320 USD/mo net (36k FJD/yr).");

  // Update Teaching Record 2
  const { error: suva2Err } = await client
    .from("salary_records")
    .update({
      monthly_salary_usd: 1886,
      net_monthly_usd: 1320,
      net_annual_usd: 15840,
      tax_rate: 0.3,
      role: "Primary Teacher",
      management_role: false,
    })
    .eq("id", "2298f9b8-d44b-4a2e-aef8-800cfd0cafab");

  if (suva2Err) console.error("Error updating Suva record 2:", suva2Err.message);
  else console.log("✓ Successfully updated International School Suva teaching record 2 to 1,320 USD/mo net (36k FJD/yr).");

  // Fetch Suva school_id to insert Leadership record
  const { data: suvaSchool } = await client
    .from("schools")
    .select("id")
    .ilike("name", "%international school suva%")
    .maybeSingle();

  if (suvaSchool) {
    // Insert Leadership Role (Head of Primary/Secondary: 160.5k FJD/yr = 8,400 USD/mo gross, 5,880 USD/mo net)
    const { error: suvaLeadErr } = await client.from("salary_records").insert({
      school_id: suvaSchool.id,
      school: "International School Suva",
      country: "Fiji",
      city: "Suva",
      year: 2024,
      role: "Head of School / Principal",
      management_role: true,
      currency: "FJD",
      monthly_salary_usd: 8400,
      net_monthly_usd: 5880,
      net_annual_usd: 70560,
      tax_rate: 0.3,
      housing: "Provided",
      flights: true,
      source: "user_submit",
      trust_tier: "seed",
      status: "approved",
    });

    if (suvaLeadErr) console.error("Error inserting Suva Leadership record:", suvaLeadErr.message);
    else console.log("✓ Successfully added International School Suva Leadership record (5,880 USD/mo net / 160.5k FJD/yr).");
  }

  console.log("================ ALL DATABASE CORRECTIONS COMPLETE ================");
}

fixRecords();
