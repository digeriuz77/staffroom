import { NextResponse } from "next/server";
import { listOpenBounties } from "@/lib/submissions";

export const runtime = "nodejs";

export async function GET() {
  const bounties = await listOpenBounties();
  return NextResponse.json({ bounties });
}
