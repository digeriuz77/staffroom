import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { approveSalarySubmission, rejectSalarySubmission } from "@/lib/submissions";
import type { TrustTier } from "@/lib/db/types";

export const runtime = "nodejs";

interface ReviewBody {
  type: "salary" | "member" | "flag";
  id: string;
  action: "approve" | "reject" | "verify" | "dismiss" | "remove";
  trustTier?: TrustTier;
  reason?: string;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const serverClient = supabaseServer();
  if (!serverClient) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const token = authHeader.slice(7);
  const { data: sessionData, error: sessionErr } = await serverClient.auth.getUser(token);
  if (sessionErr || !sessionData.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const reviewerId = sessionData.user.id;

  // Verify moderator or admin role.
  const { data: profile } = await serverClient
    .from("profiles")
    .select("role")
    .eq("id", reviewerId)
    .maybeSingle();

  const userRole = (profile as { role: string } | null)?.role ?? "member";
  if (userRole !== "moderator" && userRole !== "admin") {
    return NextResponse.json({ error: "Moderator or Admin access required" }, { status: 403 });
  }

  let body: ReviewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, id, action, trustTier = "school", reason = "" } = body;

  if (type === "salary") {
    if (action === "approve") {
      const { error } = await approveSalarySubmission(id, reviewerId, trustTier);
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Salary submission approved." });
    } else if (action === "reject") {
      const { error } = await rejectSalarySubmission(id, reason);
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Salary submission rejected." });
    }
  }

  if (type === "member") {
    if (action === "verify" || action === "approve") {
      const { error } = await serverClient
        .from("school_members")
        .update({ verified: true })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "School representative verified." });
    } else if (action === "reject" || action === "remove") {
      const { error } = await serverClient
        .from("school_members")
        .delete()
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Member request removed." });
    }
  }

  if (type === "flag") {
    if (action === "remove") {
      // Get post_id from flag
      const { data: flag } = await serverClient
        .from("board_post_flags")
        .select("post_id")
        .eq("id", id)
        .maybeSingle();

      if (flag) {
        await serverClient.from("board_posts").update({ status: "removed" }).eq("id", flag.post_id);
      }
      await serverClient.from("board_post_flags").delete().eq("id", id);
      return NextResponse.json({ ok: true, message: "Post removed and flag cleared." });
    } else if (action === "dismiss") {
      await serverClient.from("board_post_flags").delete().eq("id", id);
      return NextResponse.json({ ok: true, message: "Flag dismissed." });
    }
  }

  return NextResponse.json({ error: "Unsupported review action" }, { status: 400 });
}
