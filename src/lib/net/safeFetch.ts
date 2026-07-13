// Safe-fetch utilities: protect server-side fetches against SSRF and
// unbounded response sizes. All user-supplied URLs that the server fetches
// must pass through `safeFetch`.

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB cap
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

// Private / loopback / link-local / metadata IP ranges that must never be
// reached from a server-side fetch driven by user input.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^169\.254\./, // link-local + cloud metadata (AWS/GCP/Azure)
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA
  /^fc[0-9a-f]{2}:/i, // IPv6 ULA
  /^metadata/i, // GCP metadata host
  /^\[?::ffff:127\./i, // IPv4-mapped loopback
];

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  text: string;
  lastModified: string | null;
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(h));
}

/**
 * Validate and fetch a user-supplied URL with SSRF protection and a response
 * size cap. Returns a structured result; never throws.
 */
export async function safeFetch(
  rawUrl: string,
  opts: { timeoutMs?: number; userAgent?: string } = {},
): Promise<SafeFetchResult> {
  const { timeoutMs = 8000, userAgent = "StaffroomIntel/1.0 (+https://staffroom-intel.app)" } = opts;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, status: 0, text: "", lastModified: null };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, status: 0, text: "", lastModified: null };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, status: 0, text: "", lastModified: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(parsed.href, {
      signal: controller.signal,
      headers: { "user-agent": userAgent },
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, status: res.status, text: "", lastModified: res.headers.get("last-modified") };
    }
    // Cap the response body to prevent memory exhaustion.
    const reader = res.body?.getReader();
    if (!reader) {
      const full = await res.text();
      return {
        ok: true,
        status: res.status,
        text: full.slice(0, MAX_RESPONSE_BYTES),
        lastModified: res.headers.get("last-modified"),
      };
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.byteLength;
    }
    return {
      ok: true,
      status: res.status,
      text: new TextDecoder().decode(buf),
      lastModified: res.headers.get("last-modified"),
    };
  } catch {
    return { ok: false, status: 0, text: "", lastModified: null };
  } finally {
    clearTimeout(timeout);
  }
}
