import type { JobRow, SchoolInterestRow } from "../../src/lib/db/types";
import { supabaseServer } from "../../src/lib/db/supabaseClients";

const MIN_RECORDS = 3;
const STALE_MONTHS = 12;
const MAX_NEW_BOUNTIES = 25;

// Detect data gaps (schools/regions with too few or stale approved records) and
// suggest open bounties for moderator confirmation. Only creates bounties for
// gaps not already covered by an open bounty.
export async function handleGapDetect(_job: JobRow): Promise<void> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  const [schoolsRes, interestRes] = await Promise.all([
    client.from("schools").select("id, name, country, region"),
    client.from("school_interest").select("*"),
  ]);
  const schools = schoolsRes.data;
  if (!schools) throw new Error("schools query failed");
  const interestBySchool = new Map(
    ((interestRes.data as SchoolInterestRow[] | null) ?? []).map((row) => [
      row.school_id,
      row,
    ]),
  );

  const { data: counts } = await client
    .from("salary_records")
    .select("school_id, submitted_at")
    .eq("status", "approved");
  const bySchool = new Map<string, { count: number; latest: number }>();
  const now = Date.now();
  for (const r of (counts as { school_id: string | null; submitted_at: string }[]) ?? []) {
    if (!r.school_id) continue;
    const entry = bySchool.get(r.school_id) ?? { count: 0, latest: 0 };
    entry.count++;
    entry.latest = Math.max(entry.latest, new Date(r.submitted_at).getTime());
    bySchool.set(r.school_id, entry);
  }

  const gaps: {
    school_id: string;
    school_name: string;
    reason: string;
    priority: number;
  }[] = [];
  for (const s of schools as { id: string; name: string }[]) {
    const entry = bySchool.get(s.id);
    const interest = interestBySchool.get(s.id);
    const demand = (interest?.searches ?? 0) * 3 + (interest?.views ?? 0);
    if (!entry || entry.count < MIN_RECORDS) {
      gaps.push({
        school_id: s.id,
        school_name: s.name,
        reason: "needs recent salary records",
        priority: demand + (MIN_RECORDS - (entry?.count ?? 0)) * 20,
      });
      continue;
    }
    const staleMs = now - entry.latest;
    if (staleMs > STALE_MONTHS * 30 * 86400 * 1000) {
      gaps.push({
        school_id: s.id,
        school_name: s.name,
        reason: "salary data is over a year old",
        priority: demand + 10,
      });
    }
  }

  if (gaps.length === 0) {
    console.log("[gap_detect] no gaps found");
    return;
  }

  // Fetch existing open bounties to avoid duplicates.
  const { data: existing } = await client
    .from("bounties")
    .select("school_id")
    .eq("status", "open")
    .eq("scope_kind", "school");
  const covered = new Set(
    ((existing as { school_id: string | null }[]) ?? [])
      .map((b) => b.school_id)
      .filter((x): x is string => Boolean(x)),
  );

  const toCreate = gaps
    .filter((g) => !covered.has(g.school_id))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        a.school_name.localeCompare(b.school_name),
    )
    .slice(0, MAX_NEW_BOUNTIES)
    .map((g) => ({
      scope_kind: "school" as const,
      scope_value: `${g.school_name} · ${g.reason}`,
      school_id: g.school_id,
      kind: "salary" as const,
      reward_points: Math.min(250, 100 + Math.floor(g.priority / 10) * 10),
      status: "open" as const,
    }));

  if (toCreate.length === 0) {
    console.log("[gap_detect] all gaps already have open bounties");
    return;
  }
  const { error } = await client.from("bounties").insert(toCreate);
  if (error) throw new Error(`bounty insert: ${error.message}`);
  console.log(`[gap_detect] suggested ${toCreate.length} bounties`);
}
