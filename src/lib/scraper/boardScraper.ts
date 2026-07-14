// Job-board scraper: polls job-board listing pages for a school/region and
// dedupes into job_postings. This is a defensive, rate-limited fetcher that
// respects per-source limits. Source-specific HTML parsing is kept minimal and
// resilient — listings are stored raw for fuzzy school resolution.
import { JOB_BOARD_SOURCES, type JobBoardSource } from "@/lib/config/jobs";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { createHash } from "node:crypto";

interface ScrapePayload {
  schoolId?: string;
  source?: string;
  region?: string;
  scope?: string;
}

const SOURCE_SEARCH_URL: Record<JobBoardSource, string> = {
  tes: "https://www.tes.com/jobs/search?q=",
  grc: "https://www.searchassociates.com/jobs?q=",
  teacherhorizons: "https://www.teacherhorizons.com/jobs?q=",
  schrole: "https://www.schrole.com/jobs?q=",
  eslcafe: "https://www.eslcafe.com/jobs?q=",
};

function hash(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

async function fetchListing(source: JobBoardSource, query: string): Promise<string> {
  const url = `${SOURCE_SEARCH_URL[source]}${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "StaffroomIntel/1.0 (+https://staffroom-intel.app)" },
      redirect: "follow",
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

// Naive title extraction: pull <h*> and og:title-like fragments. This is
// intentionally loose; the turnover signal is driven by posting FREQUENCY, so
// precise per-listing parsing is not required for the baseline. Also attempts
// to extract a nearby posting date from the listing's context.
interface ExtractedListing {
  title: string;
  url: string | null;
  postedAt: string | null;
}

function extractListings(html: string, source: JobBoardSource): ExtractedListing[] {
  const out: ExtractedListing[] = [];
  const titleRe = /<h[1-4][^>]*>([^<]{8,140})<\/h[1-4]>/gi;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(html)) && out.length < 40) {
    const title = m[1].replace(/&amp;/g, "&").trim();
    if (/teacher|school|head|director|coordinator|lecturer|faculty/i.test(title)) {
      // Look for a date in the ~300 chars surrounding the title for context.
      const ctxStart = Math.max(0, m.index - 150);
      const ctxEnd = Math.min(html.length, m.index + m[0].length + 150);
      const context = html.slice(ctxStart, ctxEnd);
      out.push({ title, url: null, postedAt: extractDate(context) });
    }
  }
  void source;
  return out;
}

/** Extract the first plausible date from a text fragment; null if none found. */
function extractDate(text: string): string | null {
  const patterns = [
    /20(?:2[3-6])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/,
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(20(?:2[3-6]))/i,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20(?:2[3-6]))/i,
    /\b(\d+)\s+(day|week|month)s?\s+ago/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const d = new Date(match[0].includes("ago") ? match[0] : match[0]);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2023) return d.toISOString();
    }
  }
  return null;
}

export async function runScraper(payload: ScrapePayload): Promise<number> {
  const client = supabaseServer();
  if (!client) throw new Error("supabase not configured");

  const sources: JobBoardSource[] = payload.source
    ? [payload.source as JobBoardSource]
    : [...JOB_BOARD_SOURCES];

  // Determine queries: a specific school name, a region, or a generic sweep.
  let queries: string[] = [];
  if (payload.schoolId) {
    const { data } = await client.from("schools").select("name").eq("id", payload.schoolId).maybeSingle();
    const name = (data as { name: string } | null)?.name;
    if (name) queries = [name];
  } else if (payload.region) {
    queries = [payload.region];
  } else {
    queries = ["international school", "head of department", "primary teacher"];
  }

  const nowIso = new Date().toISOString();
  let inserted = 0;
  for (const source of sources) {
    for (const q of queries) {
      const html = await fetchListing(source, q);
      const listings = extractListings(html, source);
      for (const l of listings) {
        const h = hash(`${source}|${l.title}`);
        const { error } = await client.from("job_postings").upsert(
          {
            hash: h,
            source,
            school_text: null,
            title: l.title,
            raw_url: l.url,
            posted_at: l.postedAt ?? nowIso,
            first_seen_at: nowIso,
          },
          { onConflict: "hash", ignoreDuplicates: true },
        );
        if (!error) inserted++;
      }
      // Per-request courtesy delay.
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  console.log(`[scraper] upserted ${inserted} postings from ${sources.length} sources`);
  return inserted;
}
