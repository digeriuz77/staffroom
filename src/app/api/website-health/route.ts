import { NextResponse } from "next/server";
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
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "StaffroomIntel/1.0 (+https://staffroom-intel.app)" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok) {
        html = await res.text();
        lastModified = res.headers.get("last-modified");
      }
    } catch {
      html = "";
    }
  }

  const health = assessWebsiteHealth(html, url || null, schoolName, city, country, lastModified);
  return NextResponse.json(health);
}
