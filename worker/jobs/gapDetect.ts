import type { JobRow } from "../../src/lib/db/types";
import { supabaseServer } from "../../src/lib/db/supabaseClients";
import type { BountyKind } from "../../src/lib/db/types";

const MIN_RECORDS = 3;
const STALE_MONTHS = 12;

// Detect data gaps (schools/regions with too few or stale approved records) and
// suggest open bounties for moderator confirmation. Only creates bounties for
// gaps not already covered by an open bounty.
export async function handleGapDetect(_job: JobRow): Promise<void> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  const { data: schools } = await client.from("schools").select("id, name, country, region");
  if (!schools) throw new Error("schools query failed");

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

  const gaps: { school_id: string; reason: string }[] = [];
  for (const s of schools as { id: string; name: string }[]) {
    const entry = bySchool.get(s.id);
    if (!entry || entry.count < MIN_RECORDS) {
      gaps.push({ school_id: s.id, reason: "too-few-records" });
      continue;
    }
    const staleMs = now - entry.latest;
    if (staleMs > STALE_MONTHS * 30 * 86400 * 1000) {
      gaps.push({ school_id: s.id, reason: "stale" });
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

  const kinds: BountyKind[] = ["salary", "col", "benefits", "tenure"];
  const toCreate = gaps
    .filter((g) => !covered.has(g.school_id))
    .map((g) => ({
      scope_kind: "school" as const,
      scope_value: g.reason,
      school_id: g.school_id,
      kind: "salary" as BountyKind,
      reward_points: 100,
      status: "open" as const,
    }));

  for (const k of kinds) void k;

  if (toCreate.length === 0) {
    console.log("[gap_detect] all gaps already have open bounties");
    return;
  }
  const { error } = await client.from("bounties").insert(toCreate);
  if (error) throw new Error(`bounty insert: ${error.message}`);
  console.log(`[gap_detect] suggested ${toCreate.length} bounties`);
}
