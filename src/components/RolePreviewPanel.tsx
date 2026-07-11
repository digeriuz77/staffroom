"use client";

import { useState } from "react";
import type { RolePrediction } from "@/lib/analysis/roleInference";

interface Props {
  roleText: string;
}

export function RolePreviewPanel({ roleText }: Props) {
  const [prediction, setPrediction] = useState<RolePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!roleText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/role-inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleText }),
      });
      if (!res.ok) throw new Error("Failed to analyze role");
      const data = (await res.json()) as RolePrediction;
      setPrediction(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!roleText.trim()) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Role preview</h4>
        {!prediction && (
          <button
            onClick={analyze}
            disabled={loading}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "What to expect →"}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

      {prediction && prediction.bestMatch && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-300">{prediction.summary}</p>

          {/* Admin vs teaching split */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Teaching load</span>
              <span>Admin / leadership</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full border border-white/10">
              <div
                className="bg-gradient-to-r from-emerald-500/60 to-emerald-400/60"
                style={{ width: `${prediction.teachingPct * 100}%` }}
              />
              <div
                className="bg-gradient-to-r from-indigo-500/60 to-fuchsia-500/60"
                style={{ width: `${prediction.adminPct * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>{Math.round(prediction.teachingPct * 100)}% teaching</span>
              <span>{Math.round(prediction.adminPct * 100)}% admin</span>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Salary uplift" value={`+${Math.round(prediction.salaryUplift * 100)}%`} />
            <Stat label="Min. experience" value={`${prediction.minExperienceYears} yrs`} />
          </div>

          {/* Responsibilities */}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-400">Typical responsibilities</p>
            <ul className="space-y-0.5">
              {prediction.responsibilities.slice(0, 5).map((r, i) => (
                <li key={i} className="text-xs text-slate-500">
                  • {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Pain points */}
          {prediction.painPoints.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-amber-400/80">Reported challenges in this type of role</p>
              <ul className="space-y-0.5">
                {prediction.painPoints.slice(0, 3).map((p, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    • {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prediction.inAdditionToTeaching && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              This role is typically <strong>in addition to a teaching timetable</strong> — confirm the actual non-contact time allocation in the interview.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
