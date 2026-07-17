import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";

export const runtime = "nodejs";

const REMOVAL_THRESHOLD = 3;

interface FlagBody {
  postId?: string;
  reason?: string;
}

export async function POST(request: Request) {
  let body: FlagBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const client = supabaseServer();
  if (!client) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const { data: session, error: sessionErr } = await client.auth.getUser(authHeader.slice(7));
  if (sessionErr || !session.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const postId = (body.postId ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }
  if (reason.length < 3 || reason.length > 500) {
    return NextResponse.json({ error: "Reason must be between 3 and 500 characters" }, { status: 422 });
  }

  const { error: insertErr } = await client.from("board_post_flags").insert({
    post_id: postId,
    reporter_id: session.user.id,
    reason,
  });
  // 23505 = unique violation: this reporter already flagged the post.
  if (insertErr && insertErr.code !== "23505") {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const { count } = await client
    .from("board_post_flags")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if ((count ?? 0) >= REMOVAL_THRESHOLD) {
    await client
      .from("board_posts")
      .update({ status: "removed" })
      .eq("id", postId);
  }

  return NextResponse.json({ ok: true });
}
