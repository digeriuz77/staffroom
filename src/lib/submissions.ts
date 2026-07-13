// Bounty / self-reporting: reputation model (Decision 8). No money.
// User writes go through the anon client + RLS (submitter_id = auth.uid()).
// Moderator actions (approval, reputation award, bounty fill) use the
// service-role client server-side.
import { supabaseServer } from "@/lib/db/supabaseClients";
import type {
  BountyRow,
  SalaryPackageFields,
  SalaryRecordRow,
  TrustTier,
} from "@/lib/db/types";
import type { DbClient } from "@/lib/db/supabaseClients";

const TIER_POINTS: Record<TrustTier, number> = {
  seed: 0,
  unverified: 5,
  email: 25,
  school: 100,
};

// ---------------------------------------------------------------------------
// Client-side submission (RLS-enforced; caller passes the authenticated client)
// ---------------------------------------------------------------------------

export interface SalarySubmissionInput {
  schoolName: string;
  city: string;
  country: string;
  role: string;
  year: number;
  currency: string;
  monthlySalaryUsd: number;
  taxRate: number | null;
  housing: "None" | "Allowance" | "Provided";
  flights: boolean;
  managementRole: boolean;
  tenureYears: number | null;
  package?: SalaryPackageFields;
}

export async function submitSalary(
  client: DbClient,
  userId: string,
  input: SalarySubmissionInput,
): Promise<{ error: string | null; id: string | null }> {
  const netMonthly = input.taxRate != null ? input.monthlySalaryUsd * (1 - input.taxRate) : input.monthlySalaryUsd;
  const { data, error } = await client.from("salary_records").insert({
    year: input.year,
    country: input.country,
    city: input.city,
    school: input.schoolName,
    role: input.role,
    management_role: input.managementRole,
    tenure_years: input.tenureYears,
    currency: input.currency,
    monthly_salary_usd: input.monthlySalaryUsd,
    net_monthly_usd: netMonthly,
    net_annual_usd: netMonthly * 12,
    tax_rate: input.taxRate,
    housing: input.housing,
    flights: input.flights,
    package: (input.package ?? {}) as Record<string, unknown>,
    source: "user_submit",
    trust_tier: "email",
    status: "pending",
    submitter_id: userId,
  }).select("id").single();
  if (error) return { error: error.message, id: null };
  return { error: null, id: (data as { id: string }).id };
}

// ---------------------------------------------------------------------------
// Server-side moderation + reputation (service-role)
// ---------------------------------------------------------------------------

/** Approve a pending submission, award reputation, and fill any matching bounty. */
export async function approveSalarySubmission(
  submissionId: string,
  reviewerId: string,
  trustTier: TrustTier = "school",
): Promise<{ error: string | null }> {
  const client = supabaseServer();
  if (!client) return { error: "Database not configured" };

  const { data: row } = await client
    .from("salary_records")
    .select("submitter_id, school_id, school, country, status")
    .eq("id", submissionId)
    .maybeSingle();
  const sub = row as Pick<SalaryRecordRow, "submitter_id" | "school_id" | "school" | "country" | "status"> | null;
  if (!sub) return { error: "Submission not found" };
  if (sub.status === "approved") return { error: null };

  const { error: updErr } = await client
    .from("salary_records")
    .update({
      status: "approved",
      trust_tier: trustTier,
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
    })
    .eq("id", submissionId);
  if (updErr) return { error: updErr.message };

  // Award reputation to the submitter. Log on failure — do NOT silently lose it.
  if (sub.submitter_id) {
    const repErr = await awardReputation(sub.submitter_id, TIER_POINTS[trustTier]);
    if (repErr) {
      console.error(`[approveSalary] reputation award failed for ${sub.submitter_id}: ${repErr}`);
    }
  }

  // Fill any matching open bounty for this school/country.
  const bountyErr = await fulfillMatchingBounty(sub.school_id, sub.country, sub.submitter_id);
  if (bountyErr) {
    console.error(`[approveSalary] bounty fulfillment failed for ${submissionId}: ${bountyErr}`);
  }
  return { error: null };
}

/** Reject a pending submission with a reason. */
export async function rejectSalarySubmission(
  submissionId: string,
  _reason: string,
): Promise<{ error: string | null }> {
  const client = supabaseServer();
  if (!client) return { error: "Database not configured" };
  const { error } = await client
    .from("salary_records")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", submissionId);
  return { error: error?.message ?? null };
}

export async function awardReputation(userId: string, points: number): Promise<string | null> {
  const client = supabaseServer();
  if (!client || points <= 0) return null;
  const { error } = await client.rpc("increment_reputation", { p_user: userId, p_points: points });
  return error?.message ?? null;
}

async function fulfillMatchingBounty(
  schoolId: string | null,
  country: string | null,
  fillerId: string | null,
): Promise<string | null> {
  const client = supabaseServer();
  if (!client || !fillerId) return null;
  const match = schoolId
    ? { school_id: schoolId }
    : country
      ? { scope_kind: "country", scope_value: country }
      : null;
  if (!match) return null;
  const { data, error: selErr } = await client
    .from("bounties")
    .select("id, reward_points")
    .match({ ...match, status: "open" })
    .limit(1);
  if (selErr) return selErr.message;
  const bounty = (data as BountyRow[] | null)?.[0];
  if (!bounty) return null;
  const { error: updErr } = await client
    .from("bounties")
    .update({
      status: "filled",
      filled_by: fillerId,
      filled_at: new Date().toISOString(),
    })
    .eq("id", bounty.id);
  if (updErr) return updErr.message;
  const repErr = await awardReputation(fillerId, bounty.reward_points);
  return repErr;
}

// ---------------------------------------------------------------------------
// Reads (public)
// ---------------------------------------------------------------------------

export async function listOpenBounties(): Promise<BountyRow[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data } = await client
    .from("bounties")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as BountyRow[]) ?? [];
}

export async function listPendingSalary(): Promise<SalaryRecordRow[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data } = await client
    .from("salary_records")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false })
    .limit(50);
  return (data as SalaryRecordRow[]) ?? [];
}

export async function leaderboard(limit = 20): Promise<{ id: string; display_name: string | null; reputation_points: number }[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data } = await client
    .from("profiles")
    .select("id, display_name, reputation_points")
    .order("reputation_points", { ascending: false })
    .limit(limit);
  return (data as { id: string; display_name: string | null; reputation_points: number }[]) ?? [];
}
