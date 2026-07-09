// Jobs queue: enqueue + claim using Postgres FOR UPDATE SKIP LOCKED.
// The app enqueues via the service-role client; the Railway worker claims.
import { supabaseEnabled, supabaseServer } from "@/lib/db/supabaseClients";
import type { JobRow, JobType } from "@/lib/db/types";

export interface EnqueueOptions {
  dedupeKey?: string; // if set, skip when a queued/running job of this type+payload exists
}

/**
 * Enqueue a job. Returns the job id, or null if Supabase isn't configured
 * (workers won't run in that mode) or on error.
 */
export async function enqueue(
  type: JobType,
  payload: Record<string, unknown> = {},
  options: EnqueueOptions = {},
): Promise<string | null> {
  const client = supabaseServer();
  if (!client) return null;

  if (options.dedupeKey) {
    const { data: existing } = await client
      .from("jobs")
      .select("id")
      .eq("type", type)
      .in("status", ["queued", "running"])
      .contains("payload", { dedupeKey: options.dedupeKey })
      .limit(1);
    if (existing && existing.length > 0) return existing[0].id as string;
    payload = { ...payload, dedupeKey: options.dedupeKey };
  }

  const { data, error } = await client
    .from("jobs")
    .insert({ type, payload, status: "queued" })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * Claim the next queued job atomically (SKIP LOCKED), mark it running.
 * Returns the job or null if the queue is empty.
 */
export async function claimNextJob(): Promise<JobRow | null> {
  const client = supabaseServer();
  if (!client) return null;
  // Supabase JS doesn't expose SKIP LOCKED directly; use an RPC.
  const { data, error } = await client.rpc("claim_next_job");
  if (error || !data) return null;
  return (data as unknown as JobRow[])?.[0] ?? null;
}

/**
 * Mark a job done.
 */
export async function completeJob(id: string): Promise<void> {
  const client = supabaseServer();
  if (!client) return;
  await client
    .from("jobs")
    .update({ status: "done", completed_at: new Date().toISOString(), locked_at: null })
    .eq("id", id);
}

/**
 * Mark a job failed; increment attempts, dead-letter if exceeded.
 */
export async function failJob(id: string, reason: string): Promise<void> {
  const client = supabaseServer();
  if (!client) return;
  const { data } = await client.from("jobs").select("attempts, max_attempts").eq("id", id).single();
  const row = data as { attempts: number; max_attempts: number } | null;
  const attempts = (row?.attempts ?? 0) + 1;
  const dead = attempts >= (row?.max_attempts ?? 5);
  await client
    .from("jobs")
    .update({
      status: dead ? "dead" : "queued",
      attempts,
      error: reason.slice(0, 500),
      locked_at: null,
    })
    .eq("id", id);
}

/**
 * Peek queue depth + recent failures (for the admin observability view).
 */
export async function queueStats(): Promise<{
  queued: number;
  running: number;
  failed: number;
  dead: number;
} | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data } = await client.from("jobs").select("status");
  if (!data) return null;
  const counts = { queued: 0, running: 0, failed: 0, dead: 0 };
  for (const r of data as { status: string }[]) {
    if (r.status in counts) (counts as Record<string, number>)[r.status]++;
  }
  return counts;
}

export const JOB_SOURCES = supabaseEnabled;
