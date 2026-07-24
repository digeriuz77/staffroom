import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";

export const runtime = "nodejs";

/**
 * DELETE /api/account/delete — permanently delete the caller's account.
 *
 * The caller proves identity with their Supabase access token (Bearer header).
 * Deleting the auth.users row cascades as designed in the schema:
 *   - profiles (on delete cascade)            → removed
 *   - school_members / board_posts / flags    → removed via profiles cascade
 *   - salary_records.submitter_id             → SET NULL (submission kept, anonymized)
 *   - col_items.submitter_id                  → SET NULL (submission kept, anonymized)
 * So identity data is erased while aggregate benchmark data survives unlinked.
 */
export async function DELETE(request: Request) {
  const client = supabaseServer();
  if (!client) {
    return NextResponse.json({ error: "Account deletion is not available in this deployment." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  // Verify the token belongs to a real user — this is the identity check.
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid or expired session. Sign in again and retry." }, { status: 401 });
  }

  const userId = userData.user.id;
  const { error: deleteError } = await client.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: "Deletion failed. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
