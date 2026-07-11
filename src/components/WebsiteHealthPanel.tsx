"use client";

import { useState } from "react";
import type { WebsiteHealthSignals } from "@/lib/analysis/websiteHealth";
import {
  buildDeepLinks,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SourceCategory,
} from "@/lib/data/platformRegistry";

interface Props {
  schoolName: string;
  city: string;
  country: string;
  websiteUrl?: string;
}

export function WebsiteHealthPanel({ schoolName, city, country, websiteUrl }: Props) {
  const [health, setHealth] = useState<WebsiteHealthSignals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/website-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, schoolName, city, country }),
      });
      if (!res.ok) throw new Error("Failed to check website");
      const data = (await res.json()) as WebsiteHealthSignals;
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">School website health</h2>
          <p className="text-sm text-slate-400">
            Inspector-style digital presence check — news freshness, staff transparency, policy availability.
          </p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-50"
        >
          {loading ? "Checking…" : health ? "Re-check" : "Check website →"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {health && (
        <div className="mt-4">
          {/* Score gauge */}
          <div className="mb-4 flex items-center gap-4">
            <ScoreRing score={health.healthScore} />
            <div>
              <p className="text-sm font-medium text-white">
                {health.healthScore >= 70
                  ? "Healthy digital presence"
                  : health.healthScore >= 40
                    ? "Moderate digital presence"
                    : "Limited digital presence"}
              </p>
              <p className="text-xs text-slate-500">
                {health.url ?? "URL not provided — using name-based heuristics"}
              </p>
              {!health.reachable && (
                <p className="text-xs text-rose-400">Website could not be reached</p>
              )}
            </div>
          </div>

          {/* Signal list */}
          <div className="space-y-1.5">
            {health.signals.map((sig, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <SignalDot status={sig.status} />
                <div>
                  <span className="text-sm text-slate-300">{sig.label}</span>
                  <p className="text-xs text-slate-500">{sig.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* External community links (registry-driven) */}
          <div className="mt-4">
            <p className="mb-3 text-xs font-medium text-slate-400">
              Research {schoolName} across {PLATFORM_COUNT} platforms
            </p>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <DeepLinkGroup
                  key={cat}
                  schoolName={schoolName}
                  category={cat}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold text-white">{score}</span>
    </div>
  );
}

function SignalDot({ status }: { status: "good" | "warn" | "bad" | "unknown" }) {
  const colors = {
    good: "bg-emerald-400",
    warn: "bg-amber-400",
    bad: "bg-rose-400",
    unknown: "bg-slate-500",
  };
  return <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${colors[status]}`} />;
}

const CATEGORIES: SourceCategory[] = CATEGORY_ORDER;
import { PLATFORM_REGISTRY } from "@/lib/data/platformRegistry";
const PLATFORM_COUNT = PLATFORM_REGISTRY.length;

function DeepLinkGroup({
  schoolName,
  category,
}: {
  schoolName: string;
  category: SourceCategory;
}) {
  const links = buildDeepLinks(schoolName, { category, minPriority: 2 });
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-600">
        {CATEGORY_LABELS[category]}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:border-indigo-400/30 hover:text-indigo-200"
          >
            {link.label}
            {link.access !== "free" && (
              <span className="text-[9px] text-amber-400/70" title={`${link.access} access`}>
                {link.access === "paid" ? "$" : link.access === "membership" ? "●" : "▲"}
              </span>
            )}
            <span className="text-slate-600">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
