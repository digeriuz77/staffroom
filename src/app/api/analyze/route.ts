import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/net/safeFetch";
import { parseJobLink } from "@/lib/parser/jobLink";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "A job link URL is required" }, { status: 400 });

  let html = "";
  const result = await safeFetch(url, { timeoutMs: 6000 });
  if (result.ok) html = result.text;

  const parsed = parseJobLink(url, { html });
  return NextResponse.json({ parsed });
}
