import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

  const userId = sessionData.user.id;

  // Check user role in profiles table.
  const { data: profile } = await serverClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const userRole = (profile as { role: string } | null)?.role ?? "member";
  if (userRole !== "moderator" && userRole !== "admin") {
    return NextResponse.json({ error: "Moderator or Admin access required", userRole }, { status: 403 });
  }

  // Fetch pending salary records.
  const { data: pendingSalaries, error: salErr } = await serverClient
    .from("salary_records")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  if (salErr) {
    return NextResponse.json({ error: salErr.message }, { status: 500 });
  }

  // Fetch unverified school members.
  const { data: unverifiedMembers } = await serverClient
    .from("school_members")
    .select("id, school_id, user_id, member_role, verified, created_at")
    .eq("verified", false)
    .order("created_at", { ascending: false });

  // Fetch flagged board posts.
  const { data: flaggedPosts } = await serverClient
    .from("board_post_flags")
    .select("id, post_id, reporter_id, reason, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    salaries: pendingSalaries ?? [],
    members: unverifiedMembers ?? [],
    flags: flaggedPosts ?? [],
    role: userRole,
  });
}
