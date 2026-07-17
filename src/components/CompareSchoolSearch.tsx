"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { addToTray, type TrayEntry } from "@/components/CompareTray";

const MAX = 3;

export function CompareSchoolSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; name: string; city: string; country: string; salaryCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [tray, setTray] = useState<TrayEntry[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("si.compare-tray");
        if (raw) setTray(JSON.parse(raw));
      } catch {}
    };
    handler();
    window.addEventListener("si-compare-tray-changed", handler);
    return () => window.removeEventListener("si-compare-tray-changed", handler);
  }, []);

  const search = useCallback(async (q: string) => {
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

  function addSchool(s: { slug: string; name: string; city: string; country: string }) {
    const result = addToTray(s);
    if (result.added) {
      setFlash(null);
      // Navigate to compare with the updated tray.
      try {
        const raw = localStorage.getItem("si.compare-tray");
        const updated = raw ? (JSON.parse(raw) as TrayEntry[]) : [];
        setTray(updated);
        if (updated.length > 0) {
          router.push(`/compare?schools=${updated.map((t) => t.slug).join(",")}`);
        }
      } catch {}
    } else if (result.full) {
      setFlash("You can compare up to 3 schools. Remove one from the tray first.");
      setTimeout(() => setFlash(null), 3000);
    }
  }

  const trayFull = tray.length >= MAX;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        Search and add schools to compare
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search(query))}
          placeholder="School name, city or country..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
        />
        <button
          onClick={() => search(query)}
          disabled={loading}
          className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {flash && <p className="mt-2 text-xs text-amber-300">{flash}</p>}

      {results.length > 0 && (
        <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
          {results.map((s) => {
            const inTray = tray.some((t) => t.slug === s.slug);
            return (
              <button
                key={s.slug}
                onClick={() => addSchool(s)}
                disabled={inTray || (trayFull && !inTray)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {s.city}, {s.country} · {s.salaryCount} records
                  </p>
                </div>
                {inTray ? (
                  <span className="text-xs text-emerald-300">Added</span>
                ) : (
                  <ArrowIcon className="h-4 w-4 text-slate-500" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {tray.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <span className="text-[11px] text-slate-500">In tray ({tray.length}/{MAX}):</span>
          {tray.map((t) => (
            <span key={t.slug} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
