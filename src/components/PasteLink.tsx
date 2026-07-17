"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, LinkIcon } from "@/components/icons";

type Mode = "link" | "text" | "manual";

const EXAMPLES = [
  "https://www.tes.com/jobs/vacancy/dubai-british-school-jumeirah-primary-teacher/",
  "https://www.teacherhorizons.com/schools/singapore-american-school",
  "https://www.searchassociates.com/jobs/shrewsbury-international-school-bangkok",
];

export function PasteLink({
  initialMode = "link",
  initialSchoolQuery = "",
}: {
  initialMode?: Mode;
  initialSchoolQuery?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [manualPrefill, setManualPrefill] = useState(initialSchoolQuery);

  function fallbackToManual(schoolName?: string) {
    if (schoolName) setManualPrefill(schoolName);
    setMode("manual");
  }

  return (
    <div className="w-full">
      {/* Mode tabs */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <ModeTab active={mode === "link"} onClick={() => setMode("link")} label="Paste a link" />
        <ModeTab active={mode === "text"} onClick={() => setMode("text")} label="Paste job text" />
        <ModeTab active={mode === "manual"} onClick={() => setMode("manual")} label="Enter manually" />
      </div>

      {mode === "link" && <LinkMode router={router} onFallback={fallbackToManual} />}
      {mode === "text" && <TextMode router={router} onFallback={fallbackToManual} />}
      {mode === "manual" && <ManualMode router={router} prefillQuery={manualPrefill} />}
    </div>
  );
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-lg px-2 py-2 text-xs font-medium leading-tight transition sm:px-4 sm:text-sm ${
        active
          ? "bg-indigo-500/20 text-indigo-200"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mode 1: Paste a URL (existing flow, improved)
// ---------------------------------------------------------------------------
function LinkMode({
  router,
  onFallback,
}: {
  router: ReturnType<typeof useRouter>;
  onFallback: (schoolName?: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze");

      if (data.parsed.matchedSchoolId) {
        routeToSchool(router, data.parsed.matchedSchoolId, data.parsed.offeredMonthlyUsd, data.parsed.role);
      } else {
        // No match — drop into manual mode with whatever we detected prefilled.
        onFallback(data.parsed.schoolName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAnalyze} className="relative flex flex-col gap-3 sm:block">
        <div className="pointer-events-none absolute left-4 top-[18px] text-slate-500">
          <LinkIcon className="h-5 w-5" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a job link from tes.com, Teacher Horizons, Search Associates..."
          className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20 sm:pr-36"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:absolute sm:right-2 sm:top-2 sm:min-h-0 sm:w-auto"
        >
          {loading ? "Analyzing..." : "Analyze"}
          {!loading && <ArrowIcon className="h-4 w-4" />}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <p className="mt-3 text-center text-xs text-slate-600">
        Many job sites block automated access. If it fails, use{" "}
        <strong className="text-slate-400">Paste job text</strong> instead.
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-slate-500">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setUrl(ex)}
            className="min-h-10 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-300"
          >
            {extractHost(ex)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 2: Paste job description text (when URL is blocked)
// ---------------------------------------------------------------------------
function TextMode({
  router,
  onFallback,
}: {
  router: ReturnType<typeof useRouter>;
  onFallback: (schoolName?: string) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ matchedSchoolId?: string; schoolName?: string; offeredMonthlyUsd?: number; role?: string; warning?: string } | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze");
      setParsed(data.parsed);

      if (data.parsed.matchedSchoolId) {
        routeToSchool(router, data.parsed.matchedSchoolId, data.parsed.offeredMonthlyUsd, data.parsed.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAnalyze}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full job description text here — including school name, role, salary, and location. We'll extract the key details."
          rows={7}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.07]"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract details"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {parsed && !parsed.matchedSchoolId && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200/90">
          {parsed.warning ?? "Couldn't match a school automatically."}
          {parsed.schoolName && <p className="mt-1 text-slate-400">Detected school: <strong>{parsed.schoolName}</strong></p>}
          {parsed.offeredMonthlyUsd && <p className="mt-1 text-slate-400">Detected salary: <strong>${parsed.offeredMonthlyUsd}/mo USD</strong></p>}
          <button
            onClick={() => onFallback(parsed.schoolName)}
            className="mt-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20"
          >
            Enter manually →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 3: Manual entry (school search + salary input → instant verdict)
// ---------------------------------------------------------------------------
const FX_FALLBACK: Record<string, number> = {
  USD: 1, GBP: 1.34, AED: 0.272, EUR: 1.14, SGD: 0.78, CNY: 0.147, THB: 0.028,
  QAR: 0.275, SAR: 0.267, INR: 0.012, AUD: 0.713, HKD: 0.128, JPY: 0.0062,
};

function ManualMode({ router, prefillQuery = "" }: { router: ReturnType<typeof useRouter>; prefillQuery?: string }) {
  const [query, setQuery] = useState(prefillQuery);
  const [salary, setSalary] = useState("");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [currency, setCurrency] = useState("USD");
  const [results, setResults] = useState<{ slug: string; name: string; city: string; country: string; medianNetUsd?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fxRates, setFxRates] = useState<Record<string, number>>(FX_FALLBACK);

  useEffect(() => {
    let active = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.rates && typeof d.rates === "object") {
          setFxRates((prev) => ({ ...prev, ...d.rates }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const searchFor = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schools?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.schools ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // A prefilled query (from a failed link parse) searches immediately.
  useEffect(() => {
    if (prefillQuery.trim()) void searchFor(prefillQuery);
  }, [prefillQuery, searchFor]);

  function handleSearch() {
    void searchFor(query);
  }

  function handleSelect(slug: string) {
    // Convert entered salary to monthly USD for the offer param.
    let offerUsd: number | undefined;
    const num = Number(salary.replace(/[^0-9.]/g, ""));
    if (num > 0) {
      const usd = num * (fxRates[currency] ?? 1);
      offerUsd = period === "year" ? Math.round(usd / 12) : Math.round(usd);
    }
    routeToSchool(router, slug, offerUsd);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Salary you&apos;re evaluating</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50"
          >
            {["USD", "GBP", "EUR", "AED", "SAR", "QAR", "SGD", "THB", "CNY", "HKD", "AUD", "INR"].map((c) => (
              <option key={c} value={c} className="bg-[#0c0f17]">{c}</option>
            ))}
          </select>
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="Salary amount"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
          />
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setPeriod("month")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${period === "month" ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400"}`}
            >
              / month
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${period === "year" ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400"}`}
            >
              / year
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Find the school</p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="School name, city or country..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
            {results.map((s) => (
              <button
                key={s.slug}
                onClick={() => handleSelect(s.slug)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.08]"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.city}, {s.country}{s.medianNetUsd ? ` · median ${formatUsd(s.medianNetUsd)}` : ""}</p>
                </div>
                <ArrowIcon className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function routeToSchool(
  router: ReturnType<typeof useRouter>,
  slug: string,
  offer?: number,
  role?: string,
) {
  const params = new URLSearchParams();
  if (offer) params.set("offer", String(offer));
  if (role) params.set("role", role);
  const qs = params.toString() ? `?${params.toString()}` : "";
  router.push(`/school/${slug}${qs}`);
}

function formatUsd(n: number): string {
  return `$${Math.round(n / 1000)}k`;
}

function extractHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
