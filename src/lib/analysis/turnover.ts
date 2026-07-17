// Turnover estimation: posting-frequency baselines + correlation with
// sentiment-cluster shifts in Management/Workload/Pay/Turnover themes.
import { supabaseServer } from "@/lib/db/supabaseClients";
import { TURNOVER_THEMES } from "@/lib/config/jobs";
import type { JobPostingRow, ThemeClusterRow } from "@/lib/db/types";

interface TurnoverPayload {
  schoolId?: string;
}

const BASELINE_WINDOW_DAYS = 365;
const RECENT_WINDOW_DAYS = 60;

/** Recompute per-school rolling posting-frequency baselines. */
export async function computeBaselines(payload: TurnoverPayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  let schoolIds: string[] = [];
  if (payload.schoolId) {
    schoolIds = [payload.schoolId];
  } else {
    const { data } = await client.from("schools").select("id");
    schoolIds = ((data as { id: string }[]) ?? []).map((s) => s.id);
  }

  const since = new Date(Date.now() - BASELINE_WINDOW_DAYS * 86400 * 1000).toISOString();
  let written = 0;
  for (const schoolId of schoolIds) {
    const { data } = await client
      .from("job_postings")
      .select("first_seen_at")
      .eq("school_id", schoolId)
      .gte("first_seen_at", since);
    const rows = (data as { first_seen_at: string }[]) ?? [];
    // posts per 30-day window, averaged
    const months = Math.max(1, Math.round(BASELINE_WINDOW_DAYS / 30));
    const avg = rows.length / months;
    const { error } = await client.from("posting_baselines").upsert(
      {
        school_id: schoolId,
        window_key: "30d",
        avg_posts: Math.round(avg * 100) / 100,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "school_id,window_key" },
    );
    if (!error) written++;
  }
  console.log(`[baseline] updated ${written} baselines`);
  return written;
}

async function recentPostingsFor(client: NonNullable<ReturnType<typeof supabaseServer>>, schoolId: string) {
  const recentSince = new Date(Date.now() - RECENT_WINDOW_DAYS * 86400 * 1000).toISOString();
  const { data } = await client
    .from("job_postings")
    .select("first_seen_at")
    .eq("school_id", schoolId)
    .gte("first_seen_at", recentSince);
  return ((data as JobPostingRow[]) ?? []).length;
}

async function sentimentShiftFor(
  client: NonNullable<ReturnType<typeof supabaseServer>>,
  schoolId: string,
): Promise<number> {
  const recentSince = new Date(Date.now() - RECENT_WINDOW_DAYS * 86400 * 1000).toISOString();
  const priorSince = new Date(Date.now() - 2 * RECENT_WINDOW_DAYS * 86400 * 1000).toISOString();
  const themes = TURNOVER_THEMES;

  const { data: recent } = await client
    .from("theme_clusters")
    .select("theme_label, sentiment_score, computed_at")
    .eq("school_id", schoolId)
    .in("theme_label", [...themes])
    .gte("computed_at", recentSince);
  const { data: prior } = await client
    .from("theme_clusters")
    .select("theme_label, sentiment_score, computed_at")
    .eq("school_id", schoolId)
    .in("theme_label", [...themes])
    .gte("computed_at", priorSince)
    .lt("computed_at", recentSince);

  const avg = (rows: ThemeClusterRow[] | null) =>
    rows && rows.length ? rows.reduce((s, r) => s + r.sentiment_score, 0) / rows.length : 0;
  return avg(recent as ThemeClusterRow[] | null) - avg(prior as ThemeClusterRow[] | null);
}

/** Correlate posting deltas with sentiment shifts → turnover_signals. */
export async function computeTurnoverSignals(payload: TurnoverPayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  let schoolIds: string[] = [];
  if (payload.schoolId) {
    schoolIds = [payload.schoolId];
  } else {
    const { data } = await client.from("schools").select("id");
    schoolIds = ((data as { id: string }[]) ?? []).map((s) => s.id);
  }

  let written = 0;
  for (const schoolId of schoolIds) {
    // Baseline (posts per month).
    const { data: bl } = await client
      .from("posting_baselines")
      .select("avg_posts")
      .eq("school_id", schoolId)
      .maybeSingle();
    const avgPosts = (bl as { avg_posts: number } | null)?.avg_posts ?? 0;

    const recentCount = await recentPostingsFor(client, schoolId);
    const recentPerMonth = recentCount / (RECENT_WINDOW_DAYS / 30);
    const postingDelta = avgPosts > 0 ? (recentPerMonth - avgPosts) / avgPosts : 0;

    const sentimentShift = await sentimentShiftFor(client, schoolId);

    // Signal strength: combine a posting spike with a negative sentiment shift.
    const postingSignal = Math.max(0, Math.min(1, postingDelta));
    const sentimentSignal = Math.max(0, Math.min(1, -sentimentShift * 2));
    const strength = Math.round(Math.min(1, postingSignal * 0.6 + sentimentSignal * 0.6) * 100) / 100;

    const factors: string[] = [];
    if (postingDelta > 0.5) factors.push(`postings up ${Math.round(postingDelta * 100)}% vs baseline`);
    if (sentimentShift < -0.05) factors.push(`sentiment down ${Math.abs(Math.round(sentimentShift * 100))}pts in turnover themes`);
    const rationale = factors.join("; ") || "no notable shift";

    const { error } = await client.from("turnover_signals").insert({
      school_id: schoolId,
      signal_strength: strength,
      posting_delta: Math.round(postingDelta * 100) / 100,
      sentiment_shift: Math.round(sentimentShift * 100) / 100,
      rationale,
      computed_at: new Date().toISOString(),
    });
    if (!error) written++;
  }
  console.log(`[turnover] wrote ${written} signals`);
  return written;
}

/** Latest turnover signal for a school (for the school report UI). */
export async function latestTurnoverSignal(schoolId: string): Promise<{
  signal_strength: number;
  posting_delta: number;
  sentiment_shift: number;
  rationale: string | null;
} | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data } = await client
    .from("turnover_signals")
    .select("signal_strength, posting_delta, sentiment_shift, rationale")
    .eq("school_id", schoolId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as
    | { signal_strength: number; posting_delta: number; sentiment_shift: number; rationale: string | null }
    | null) ?? null;
}
