import { supabaseServer } from "@/lib/db/supabaseClients";
import type { SchoolBriefRow } from "@/lib/db/types";

export async function recordSchoolInterest(
  schoolIds: string[],
  kind: "search" | "view",
): Promise<void> {
  const client = supabaseServer();
  const ids = Array.from(new Set(schoolIds.filter(Boolean)));
  if (!client || ids.length === 0) return;

  const { error } =
    ids.length === 1
      ? await client.rpc("record_school_interest", {
          p_school_id: ids[0],
          p_kind: kind,
        })
      : await client.rpc("record_school_interest_batch", {
          p_school_ids: ids,
          p_kind: kind,
        });
  if (error) {
    console.warn(`[interest] ${kind}: ${error.message}`);
  }
}

export async function recordDiscoveryRequest(query: string): Promise<void> {
  const client = supabaseServer();
  const cleaned = query.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!client || cleaned.length < 2) return;
  const { error } = await client.rpc("record_discovery_request", {
    p_query: cleaned,
  });
  if (error) {
    console.warn(`[discovery] ${error.message}`);
  }
}

export async function getSchoolBrief(
  schoolId: string,
): Promise<SchoolBriefRow | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await client
    .from("school_briefs")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) return null;
  return data as SchoolBriefRow | null;
}
