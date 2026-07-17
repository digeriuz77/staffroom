import type { JobSource, ParsedJob } from "@/lib/types";
import { deriveSchools } from "@/lib/data/schools";
import { FX_RATES_STATIC } from "@/lib/data/exchangeRates";

export interface SchoolCandidate {
  id: string;
  slug: string;
  name: string;
  city: string;
}

const SOURCE_PATTERNS: { source: JobSource; test: RegExp }[] = [
  { source: "tes", test: /tes(\.com|\.jobs)/i },
  { source: "grc", test: /globalrecruit|grc\.|searchassociates/i },
  { source: "teacherhorizons", test: /teacherhorizons/i },
  { source: "schrole", test: /schrole/i },
  { source: "eslcafe", test: /eslcafe/i },
];

function detectSource(url: string): JobSource {
  for (const { source, test } of SOURCE_PATTERNS) {
    if (test.test(url)) return source;
  }
  return "unknown";
}

const COUNTRY_HINTS: { match: RegExp; country: string }[] = [
  { match: /dubai|abu dhabi|uae|emirates|sharjah|ajman/i, country: "United Arab Emirates" },
  { match: /doha|qatar/i, country: "Qatar" },
  { match: /riyadh|jeddah|saudi/i, country: "Saudi Arabia" },
  { match: /muscat|oman/i, country: "Oman" },
  { match: /kuwait/i, country: "Kuwait" },
  { match: /bahrain/i, country: "Bahrain" },
  { match: /beijing|shanghai|shenzhen|guangzhou|chengdu|china/i, country: "China" },
  { match: /singapore/i, country: "Singapore" },
  { match: /bangkok|thailand/i, country: "Thailand" },
  { match: /tokyo|osaka|japan/i, country: "Japan" },
  { match: /seoul|busan|korea/i, country: "South Korea" },
  { match: /taipei|taiwan/i, country: "Taiwan" },
  { match: /hong kong/i, country: "Hong Kong" },
  { match: /kuala lumpur|malaysia/i, country: "Malaysia" },
  { match: /jakarta|indonesia/i, country: "Indonesia" },
  { match: /manila|philippines/i, country: "Philippines" },
  { match: /ho chi minh|hanoi|vietnam/i, country: "Vietnam" },
  { match: /mumbai|delhi|bangalore|india/i, country: "India" },
  { match: /london|manchester|united kingdom|\buk\b|england/i, country: "United Kingdom" },
  { match: /madrid|barcelona|spain/i, country: "Spain" },
  { match: /istanbul|turkey/i, country: "Turkey" },
  { match: /nairobi|kenya/i, country: "Kenya" },
  { match: /lagos|nigeria/i, country: "Nigeria" },
  { match: /accra|ghana/i, country: "Ghana" },
  { match: /sydney|melbourne|australia/i, country: "Australia" },
  { match: /auckland|new zealand/i, country: "New Zealand" },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function defaultCandidates(): SchoolCandidate[] {
  return deriveSchools().map(({ school }) => ({
    id: school.id,
    slug: school.slug,
    name: school.name,
    city: school.city,
  }));
}

const GENERIC_TOKENS = ["school", "college", "international", "academy", "institute"];

/**
 * Fuzzy-match free text against a school directory. Callers in Supabase mode
 * pass the live directory (so community-added schools are matchable); the TSV
 * seed is the fallback.
 */
export function matchSchool(
  text: string,
  candidates?: SchoolCandidate[],
): { id: string; slug: string; name: string } | undefined {
  const norm = normalize(text);
  if (!norm) return undefined;
  const pool = candidates && candidates.length > 0 ? candidates : defaultCandidates();
  let best: { id: string; slug: string; name: string; score: number } | undefined;
  for (const school of pool) {
    const schoolNorm = normalize(school.name);
    const cityNorm = normalize(school.city);
    const tokens = schoolNorm.split(" ").filter((t) => t.length > 3 && !GENERIC_TOKENS.includes(t));
    let hits = 0;
    for (const t of tokens) {
      if (norm.includes(t)) hits++;
    }
    let score = tokens.length ? hits / tokens.length : 0;
    if (cityNorm && norm.includes(cityNorm)) score += 0.2;
    if (score > 0.6 && (!best || score > best.score)) {
      best = { id: school.id, slug: school.slug, name: school.name, score };
    }
  }
  return best ? { id: best.id, slug: best.slug, name: best.name } : undefined;
}

// ---------------------------------------------------------------------------
// Structured data extraction (JSON-LD, og: tags, meta description)
// Much more reliable than regex on raw HTML.
// ---------------------------------------------------------------------------

interface StructuredData {
  title?: string;
  description?: string;
  hiringOrganization?: string;
  jobLocation?: string;
  baseSalary?: {
    currency?: string;
    value?: number;
    minValue?: number;
    maxValue?: number;
    unitText?: string; // "MONTH" | "YEAR"
  };
}

/** Strip HTML tags to plain text for regex extraction fallback. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&pound;/g, "£")
    .replace(/&euro;/g, "€")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract meta tag content by name or property. */
function getMetaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

/** Extract JSON-LD structured data (schema.org JobPosting). */
function extractJsonLd(html: string): StructuredData | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const graphs = Array.isArray(parsed) ? parsed : [parsed["@graph"] ?? parsed];
      for (const item of graphs.flat()) {
        if (!item || typeof item !== "object") continue;
        if (item["@type"] === "JobPosting" || (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting"))) {
          return {
            title: item.title,
            description: stripHtml(String(item.description ?? "")),
            hiringOrganization: typeof item.hiringOrganization === "object" ? item.hiringOrganization.name : item.hiringOrganization,
            jobLocation: typeof item.jobLocation === "object"
              ? item.jobLocation?.address?.addressLocality ?? item.jobLocation?.address?.addressCountry
              : item.jobLocation,
            baseSalary: item.baseSalary ? {
              currency: item.baseSalary?.currency,
              value: item.baseSalary?.value?.value,
              minValue: item.baseSalary?.value?.minValue,
              maxValue: item.baseSalary?.value?.maxValue,
              unitText: item.baseSalary?.value?.unitText,
            } : undefined,
          };
        }
      }
    } catch {
      // Malformed JSON-LD — skip.
    }
  }
  return null;
}

function extractRole(text: string): string | undefined {
  const patterns = [
    /(?:head of|coordinator|principal|deputy|assistant|vice|director)[^,\n]{0,30}/i,
    /(?:primary|secondary|elementary|middle|early years)[^,\n]{0,30}teacher/i,
    /\b(teacher|tutor|lecturer|counselor)\b[^,\n]{0,20}/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return undefined;
}

interface SalaryHit {
  amount: number;
  currency: string;
  period: "month" | "year";
}

const CURRENCY_MAP: { re: RegExp; code: string }[] = [
  { re: /gbp|£|pounds?/i, code: "GBP" },
  { re: /aed|dirhams?/i, code: "AED" },
  { re: /eur|€|euros?/i, code: "EUR" },
  { re: /sgd|s\$/i, code: "SGD" },
  { re: /(?:cny|rmb|yuan|¥)/i, code: "CNY" },
  { re: /thb|baht|฿/i, code: "THB" },
  { re: /qar|riyal/i, code: "QAR" },
  { re: /sar|riyal/i, code: "SAR" },
  { re: /inr|rupees?|₹/i, code: "INR" },
  { re: /aud|a\$/i, code: "AUD" },
  { re: /myr|rm\b/i, code: "MYR" },
  { re: /hkd|hk\$/i, code: "HKD" },
  { re: /jpy|yen|¥/i, code: "JPY" },
  { re: /usd|\$|dollars?/i, code: "USD" },
];

function detectCurrency(text: string): string {
  for (const c of CURRENCY_MAP) {
    if (c.re.test(text)) return c.code;
  }
  return "USD";
}

const SALARY_CONTEXT_RE =
  /salar(?:y|ies)|package|remuneration|compensation|pay\b|per month|per annum|monthly|annual|tax[- ]free|take[- ]home|p\.?a\.?|pcm|stipend/i;

interface NumberHit {
  amount: number;
  index: number;
  hasSymbol: boolean;
  hasK: boolean;
  rangeMax?: number;
}

function looksLikeYear(n: number, hasSymbol: boolean, hasK: boolean): boolean {
  return !hasSymbol && !hasK && Number.isInteger(n) && n >= 1900 && n <= 2100;
}

function collectNumberHits(text: string): NumberHit[] {
  const hits: NumberHit[] = [];
  const re = /(£|€|¥|\$|₹|฿)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k)?(?:\s*(?:-|–|to)\s*(£|€|¥|\$|₹|฿)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k)?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && hits.length < 40) {
    const hasSymbol = Boolean(m[1] ?? m[4]);
    const hasK = /k/i.test(m[3] ?? "");
    let amount = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    if (hasK) amount *= 1000;
    let rangeMax: number | undefined;
    if (m[5]) {
      let hi = Number(m[5].replace(/,/g, ""));
      if (/k/i.test(m[6] ?? "")) hi *= 1000;
      if (Number.isFinite(hi) && hi > amount) rangeMax = hi;
    }
    hits.push({ amount, index: m.index, hasSymbol, hasK, rangeMax });
  }
  return hits;
}

/**
 * Extract a salary figure. Strategy: collect numeric candidates, drop
 * year-like values, prefer numbers near salary vocabulary, then numbers with
 * an explicit currency symbol. Ranges resolve to their midpoint.
 */
function extractSalary(text: string): SalaryHit | undefined {
  const t = " " + text + " ";
  const currency = detectCurrency(t);

  const candidates = collectNumberHits(t)
    .filter((h) => !looksLikeYear(h.amount, h.hasSymbol, h.hasK))
    .filter((h) => h.amount >= 500 && h.amount < 5_000_000);
  if (candidates.length === 0) return undefined;

  const nearSalaryWord = (h: NumberHit) => {
    const from = Math.max(0, h.index - 80);
    const ctx = t.slice(from, h.index + 90);
    return SALARY_CONTEXT_RE.test(ctx);
  };

  const pick =
    candidates.find((h) => nearSalaryWord(h)) ??
    candidates.find((h) => h.hasSymbol || h.hasK) ??
    undefined;
  if (!pick) return undefined;

  const amount = pick.rangeMax ? (pick.amount + pick.rangeMax) / 2 : pick.amount;
  const period: "month" | "year" =
    /per year|annual|p\.?a\.?|\/yr|yearly/i.test(t) || amount >= 30000 ? "year" : "month";
  return { amount, currency, period };
}

function toMonthlyUsd(hit: SalaryHit, fx: Record<string, number>): number {
  const usd = hit.amount * (fx[hit.currency] ?? 1);
  return hit.period === "year" ? usd / 12 : usd;
}

export interface ParseOptions {
  html?: string;
  text?: string; // raw pasted text (when URL scraping fails)
  /** Live school directory (Supabase mode) — falls back to the TSV seed. */
  schools?: SchoolCandidate[];
  /** Live FX map (currency -> USD multiplier) — falls back to static rates. */
  fx?: Record<string, number>;
}

export function parseJobLink(rawUrl: string, opts: ParseOptions = {}): ParsedJob {
  const source = rawUrl ? detectSource(rawUrl) : "unknown";
  const html = opts.html ?? "";
  const pastedText = opts.text ?? "";
  const fx = opts.fx ?? FX_RATES_STATIC;
  const plainText = stripHtml(html);

  // Combine all text sources for matching/extraction.
  const combinedText = [rawUrl, plainText, pastedText, html].join("\n");

  // 1. Try structured JSON-LD first (most reliable for schema.org JobPosting).
  const jsonLd = extractJsonLd(html);

  // 2. Extract og:meta tags as fallback.
  const ogTitle = getMetaContent(html, ["og:title", "twitter:title"]);
  const ogDesc = getMetaContent(html, ["og:description", "twitter:description", "description"]);
  const metaText = [ogTitle, ogDesc].filter(Boolean).join(" ");

  // 3. Build the richest text for school/role/country matching.
  const matchText = [jsonLd?.title, jsonLd?.hiringOrganization, jsonLd?.jobLocation, metaText, combinedText]
    .filter(Boolean)
    .join("\n");

  const matched = matchSchool(matchText, opts.schools);
  const countryHint = COUNTRY_HINTS.find((h) => h.match.test(matchText));

  // 4. Extract salary: JSON-LD baseSalary > meta/text regex
  let offeredMonthlyUsd: number | undefined;
  if (jsonLd?.baseSalary) {
    const bs = jsonLd.baseSalary;
    const value = bs.value;
    const amount = value ?? (bs.minValue && bs.maxValue ? (bs.minValue + bs.maxValue) / 2 : bs.minValue ?? bs.maxValue ?? 0);
    if (amount > 0) {
      const currency = bs.currency || detectCurrency(combinedText);
      const period = /month/i.test(bs.unitText ?? "") ? "month" : (/year/i.test(bs.unitText ?? "") ? "year" : (amount >= 30000 ? "year" : "month"));
      offeredMonthlyUsd = Math.round(toMonthlyUsd({ amount, currency, period }, fx));
    }
  }
  if (!offeredMonthlyUsd) {
    const sal = extractSalary(pastedText) ?? extractSalary(metaText) ?? extractSalary(combinedText);
    if (sal) offeredMonthlyUsd = Math.round(toMonthlyUsd(sal, fx));
  }

  // 5. Extract role: JSON-LD title > regex
  const role = jsonLd?.title ?? extractRole(matchText);

  const result: ParsedJob = {
    ok: true,
    source,
    rawUrl,
    schoolName: matched?.name ?? jsonLd?.hiringOrganization,
    role,
    country: countryHint?.country ?? (jsonLd?.jobLocation ?? undefined),
    // Routing key: the school page slug (equal to the id in TSV mode).
    matchedSchoolId: matched?.slug,
  };

  if (offeredMonthlyUsd) {
    result.offeredMonthlyUsd = offeredMonthlyUsd;
  }

  // 6. Set appropriate warnings for the UI.
  if (!matched) {
    result.warning = "We couldn't auto-match this to a school in our database. Search for it manually, or enter the details below.";
  } else if (!offeredMonthlyUsd) {
    result.warning = "No salary figure detected. Enter the salary from the listing manually for an accurate verdict.";
  }

  return result;
}
