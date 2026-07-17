import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { resolveSchool } from "@/lib/db/schoolResolver";
import type { SalarySubmissionInput } from "@/lib/submissions";

export const runtime = "nodejs";

interface SubmitBody extends SalarySubmissionInput {
  /** Optional: user selected a known school from search results. */
  schoolId?: string;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Require auth — validate the session token and extract the user ID.
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const serverClient = supabaseServer();
  if (!serverClient) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const token = authHeader.slice(7);
  const { data: session, error: sessionErr } = await serverClient.auth.getUser(token);
  if (sessionErr || !session.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
  const userId = session.user.id;

  // Validate required fields.
  if (!body.schoolName?.trim() || !body.country?.trim() || !body.monthlySalaryUsd) {
    return NextResponse.json({ error: "School name, country, and salary are required" }, { status: 400 });
  }

  // 1. Resolve the school: attach to existing school_id or create new.
  // This is the dedup step — ensures one school entry per real-world school.
  let schoolId = body.schoolId ?? null;
  let slug: string | null = null;

  if (!schoolId) {
    const resolved = await resolveSchool(body.schoolName, body.city ?? "", body.country);
    if (resolved) {
      schoolId = resolved.schoolId;
      slug = resolved.slug;
    }
  } else {
    // Verify the user-provided schoolId exists.
    const { data: exists } = await serverClient
      .from("schools")
      .select("slug")
      .eq("id", schoolId)
      .maybeSingle();
    slug = (exists as { slug: string } | null)?.slug ?? null;
  }

  if (!schoolId) {
    return NextResponse.json({ error: "Could not resolve or create school entry" }, { status: 500 });
  }

  // 2. Insert the salary record WITH the resolved school_id.
  const netMonthly = body.taxRate != null
    ? body.monthlySalaryUsd * (1 - body.taxRate)
    : body.monthlySalaryUsd;

  const { data, error } = await serverClient.from("salary_records").insert({
    school_id: schoolId,
    year: body.year,
    country: body.country,
    city: body.city ?? "",
    school: body.schoolName,
    role: body.role ?? "Teacher",
    management_role: body.managementRole ?? false,
    tenure_years: body.tenureYears ?? null,
    currency: body.currency ?? "USD",
    monthly_salary_usd: body.monthlySalaryUsd,
    net_monthly_usd: netMonthly,
    net_annual_usd: netMonthly * 12,
    tax_rate: body.taxRate ?? null,
    housing: body.housing ?? "None",
    flights: body.flights ?? false,
    package: (body.package ?? {}) as Record<string, unknown>,
    source: "user_submit",
    trust_tier: "email",
    status: "pending",
    submitter_id: userId,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: (data as { id: string }).id,
    schoolId,
    slug,
    message: "Submission received — pending moderator review.",
  });
}
