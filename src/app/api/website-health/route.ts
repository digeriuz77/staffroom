import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/net/safeFetch";
import { assessWebsiteHealth } from "@/lib/analysis/websiteHealth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { url?: string; schoolName?: string; city?: string; country?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  const schoolName = (body.schoolName ?? "").trim();
  const city = (body.city ?? "").trim();
  const country = (body.country ?? "").trim();
  if (!url && !schoolName) {
    return NextResponse.json({ error: "url or schoolName is required" }, { status: 400 });
  }

  let html = "";
  let lastModified: string | null = null;

  if (url) {
    const result = await safeFetch(url);
    if (result.ok) {
      html = result.text;
      lastModified = result.lastModified;
    }
  }

  const health = assessWebsiteHealth(html, url || null, schoolName, city, country, lastModified);
  return NextResponse.json(health);
}
