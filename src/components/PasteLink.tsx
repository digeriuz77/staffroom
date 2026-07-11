"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, LinkIcon } from "@/components/icons";

const EXAMPLES = [
  "https://www.tes.com/jobs/vacancy/dubai-british-school-jumeirah-primary-teacher/",
  "https://www.teacherhorizons.com/schools/singapore-american-school",
  "https://www.searchassociates.com/jobs/shrewsbury-international-school-bangkok",
];

export function PasteLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ id: string; slug: string; name: string; city: string; country: string }[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [query, setQuery] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze");

      if (data.parsed.matchedSchoolId) {
        const params = new URLSearchParams();
        if (data.parsed.offeredMonthlyUsd) params.set("offer", String(data.parsed.offeredMonthlyUsd));
        if (data.parsed.role) params.set("role", data.parsed.role);
        const qs = params.toString() ? `?${params.toString()}` : "";
        router.push(`/school/${data.parsed.matchedSchoolId}${qs}`);
      } else {
        setQuery(data.parsed.schoolName ?? extractHost(url));
        setShowManual(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schools?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.schools ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleAnalyze} className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <LinkIcon className="h-5 w-5" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a job link from tes.com, Teacher Horizons, Search Associates..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-36 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
          {!loading && <ArrowIcon className="h-4 w-4" />}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setUrl(ex)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-300"
          >
            {extractHost(ex)}
          </button>
        ))}
      </div>

      {showManual && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 animate-rise">
          <p className="text-sm text-amber-200/90">
            We couldn&apos;t auto-match that link. Search for the school directly:
          </p>
          <div className="mt-3 flex gap-2">
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
              Search
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/school/${s.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.08]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.city}, {s.country}</p>
                  </div>
                  <ArrowIcon className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function extractHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
