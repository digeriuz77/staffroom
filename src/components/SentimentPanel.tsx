"use client";

import { useEffect, useState } from "react";
import type { SentimentPost } from "@/lib/types";
import { SourceIcon } from "@/components/icons";
import { labelFromScore } from "@/lib/analysis/sentiment";

interface Props {
  schoolId: string;
  schoolName: string;
}

interface ThemeSummary {
  label: string;
  count: number;
  sentiment: number;
}

interface TurnoverSummary {
  strength: number;
  rationale: string | null;
}

interface ApiResponse {
  count: number;
  redditStatus: "stored" | "live" | "fallback" | "unavailable";
  redditReason?: string;
  posts: SentimentPost[];
  themes?: ThemeSummary[];
  turnover?: TurnoverSummary | null;
}

export function SentimentPanel({ schoolId, schoolName }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolName, schoolId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setData({ count: 0, redditStatus: "unavailable", posts: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId, schoolName]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Searching Reddit and aggregating sentiment...</p>
        </div>
      </div>
    );
  }

  const posts = data?.posts ?? [];
  const avg =
    posts.length > 0 ? posts.reduce((a, p) => a + p.score, 0) / posts.length : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Teacher sentiment</h2>
          <p className="text-sm text-slate-400">Aggregated from {data?.count ?? 0} posts</p>
        </div>
        <StatusBadge status={data?.redditStatus} reason={data?.redditReason} />
      </div>

      {data?.turnover && (
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Turnover watch · {Math.round(data.turnover.strength * 100)}% signal
          </p>
          {data.turnover.rationale && (
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70">{data.turnover.rationale}</p>
          )}
        </div>
      )}

      {(data?.themes?.length ?? 0) > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            What teachers talk about
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data!.themes!.slice(0, 6).map((t) => (
              <span
                key={t.label}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${
                  t.sentiment >= 0.12
                    ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
                    : t.sentiment <= -0.12
                      ? "border-rose-500/20 bg-rose-500/[0.06] text-rose-300"
                      : "border-white/10 bg-white/5 text-slate-300"
                }`}
                title={`${t.count} post${t.count !== 1 ? "s" : ""} · avg sentiment ${t.sentiment.toFixed(2)}`}
              >
                {t.label}
                <span className="text-slate-500">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
          No social sentiment found for this school yet. Be the first to share on r/InternationalTeachers.
        </p>
      ) : (
        <>
          <SentimentMeter avg={avg} />
          <div className="mt-5 space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status, reason }: { status?: string; reason?: string }) {
  if (status === "stored") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Tracked corpus
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live Reddit
      </span>
    );
  }
  if (status === "fallback") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Reddit: no live results
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400" title={reason}>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Reddit offline
    </span>
  );
}

function SentimentMeter({ avg }: { avg: number }) {
  const pct = ((avg + 0.7) / 1.4) * 100;
  const label = labelFromScore(avg);
  const color =
    avg >= 0.12 ? "from-emerald-500 to-emerald-400" : avg >= -0.12 ? "from-amber-500 to-amber-400" : "from-rose-500 to-rose-400";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">Overall tone</span>
        <span className="font-semibold text-white">{label}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
        <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function PostCard({ post }: { post: SentimentPost }) {
  const tone =
    post.score >= 0.12 ? "border-emerald-500/20 bg-emerald-500/[0.04]" : post.score >= -0.12 ? "border-white/10 bg-white/[0.02]" : "border-rose-500/20 bg-rose-500/[0.04]";
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SourceIcon source={post.source} className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-300">{post.author}</span>
          {post.subreddit && <span className="text-xs text-slate-500">{post.subreddit}</span>}
          <span className="text-xs text-slate-600">{post.date}</span>
        </div>
        {post.upvotes != null && (
          <span className="text-xs text-slate-500">▲ {post.upvotes}</span>
        )}
      </div>
      {post.title && <p className="mt-2 text-sm font-medium text-white">{post.title}</p>}
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{post.body}</p>
      {post.themes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.themes.map((t) => (
            <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
