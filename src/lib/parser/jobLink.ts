import type { JobSource, ParsedJob } from "@/lib/types";
import { deriveSchools } from "@/lib/data/schools";

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
  { match: /mumbai|india/i, country: "India" },
  { match: /london|united kingdom|\buk\b|england/i, country: "United Kingdom" },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchSchool(text: string): { id: string; name: string } | undefined {
  const norm = normalize(text);
  if (!norm) return undefined;
  let best: { id: string; name: string; score: number } | undefined;
  for (const { school } of deriveSchools()) {
    const schoolNorm = normalize(school.name);
    const cityNorm = normalize(school.city);
    const tokens = schoolNorm.split(" ").filter((t) => t.length > 3 && !["school", "college", "international", "academy", "institute"].includes(t));
    let hits = 0;
    for (const t of tokens) {
      if (norm.includes(t)) hits++;
    }
    let score = tokens.length ? hits / tokens.length : 0;
    if (cityNorm && norm.includes(cityNorm)) score += 0.2;
    if (score > 0.6 && (!best || score > best.score)) {
      best = { id: school.id, name: school.name, score };
    }
  }
  return best ? { id: best.id, name: best.name } : undefined;
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

function extractSalary(text: string): SalaryHit | undefined {
  const t = " " + text + " ";
  const curMap: { re: RegExp; code: string }[] = [
    { re: /gbp|£|pounds?/i, code: "GBP" },
    { re: /aed|dirhams?/i, code: "AED" },
    { re: /eur|€|euros?/i, code: "EUR" },
    { re: /sgd|s\$/i, code: "SGD" },
    { re: /(?:cny|rmb|yuan|¥)/i, code: "CNY" },
    { re: /thb|baht|฿/i, code: "THB" },
    { re: /qar|riyal/i, code: "QAR" },
    { re: /inr|rupees?|₹/i, code: "INR" },
    { re: /usd|\$|dollars?/i, code: "USD" },
  ];
  let currency = "USD";
  for (const c of curMap) {
    if (c.re.test(t)) {
      currency = c.code;
      break;
    }
  }
  const salaryRe = /(?:£|€|¥|\$|₹|฿)?\s*(\d[\d,.]{3,})\s*(?:k)?(?:\s*[-–to]+\s*(\d[\d,.]{3,}))?/i;
  const m = t.match(salaryRe);
  if (!m) return undefined;
  const raw = Number(m[1].replace(/,/g, ""));
  if (!raw || raw < 500) return undefined;

  const period: "month" | "year" = /per year|annual|p\.?a\.?|\/yr|yearly/i.test(t) || raw >= 30000 ? "year" : "month";
  return { amount: raw, currency, period };
}

const FX: Record<string, number> = {
  USD: 1, GBP: 1.27, AED: 0.272, EUR: 1.08, SGD: 0.74, CNY: 0.138, THB: 0.028, QAR: 0.275, INR: 0.012,
};

function toMonthlyUsd(hit: SalaryHit): number {
  const usd = hit.amount * (FX[hit.currency] ?? 1);
  return hit.period === "year" ? usd / 12 : usd;
}

export interface ParseOptions {
  html?: string;
}

export function parseJobLink(rawUrl: string, opts: ParseOptions = {}): ParsedJob {
  const source = detectSource(rawUrl);
  const text = [rawUrl, opts.html ?? ""].join("\n");

  const matched = matchSchool(text);
  const countryHint = COUNTRY_HINTS.find((h) => h.match.test(text));

  const result: ParsedJob = {
    ok: true,
    source,
    rawUrl,
    schoolName: matched?.name,
    role: extractRole(text),
    country: countryHint?.country,
    matchedSchoolId: matched?.id,
  };

  const sal = extractSalary(text);
  if (sal) {
    result.offeredMonthlyUsd = Math.round(toMonthlyUsd(sal));
  }

  if (!matched) {
    result.warning = "We couldn't auto-match this link to a school. Pick a school manually for the full report.";
  } else if (!sal) {
    result.warning = "No salary figure detected in the listing. Enter the salary manually for an accurate verdict.";
  }

  return result;
}
