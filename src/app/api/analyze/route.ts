import { NextResponse } from "next/server";
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "StaffroomIntel/1.0 (+school intelligence tool)" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (res.ok) html = await res.text();
  } catch {
    html = "";
  }

  const parsed = parseJobLink(url, { html });
  return NextResponse.json({ parsed });
}
