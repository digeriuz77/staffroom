import { NextResponse } from "next/server";
import { issueFormToken } from "@/lib/board";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ token: issueFormToken() });
}
