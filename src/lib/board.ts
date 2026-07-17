import { createHmac, timingSafeEqual } from "node:crypto";

export interface BoardPostRow {
  id: string;
  author_id: string;
  school_id: string | null;
  school_name: string;
  title: string;
  body: string;
  country: string;
  city: string | null;
  role_type: string;
  salary_min_usd: number | null;
  salary_max_usd: number | null;
  currency: string;
  apply_url: string | null;
  contact_email: string | null;
  status: "active" | "expired" | "removed";
  created_at: string;
  expires_at: string;
}

const MIN_DWELL_MS = 5_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret";
}

function sign(ts: string): string {
  return createHmac("sha256", secret()).update(ts).digest("hex");
}

export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function validateFormToken(token: string): { ok: boolean; reason?: string } {
  if (typeof token !== "string" || token.length > 200) {
    return { ok: false, reason: "malformed" };
  }
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts) || !/^[0-9a-f]+$/i.test(sig)) {
    return { ok: false, reason: "malformed" };
  }
  const given = Buffer.from(sig, "hex");
  const expected = Buffer.from(sign(ts), "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad-signature" };
  }
  const age = Date.now() - Number(ts);
  if (age < MIN_DWELL_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}

export function countUrls(text: string): number {
  return (text.match(/https?:\/\//gi) ?? []).length;
}
