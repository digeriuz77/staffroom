"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { SalaryRecordRow, TrustTier } from "@/lib/db/types";

interface PendingData {
  salaries: SalaryRecordRow[];
  members: { id: string; school_id: string; user_id: string; member_role: string; verified: boolean; created_at: string }[];
  flags: { id: string; post_id: string; reporter_id: string; reason: string; created_at: string }[];
  role: string;
}

export default function AdminPage() {
  const { session, enabled, loading: authLoading } = useAuth();
  const [data, setData] = useState<PendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"salaries" | "members" | "flags">("salaries");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [trustTierMap, setTrustTierMap] = useState<Record<string, TrustTier>>({});

  const loadPending = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pending", {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to fetch pending items");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading admin data");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadPending();
    } else {
      setLoading(false);
    }
  }, [session, loadPending]);

  async function handleReview(
    type: "salary" | "member" | "flag",
    id: string,
    action: "approve" | "reject" | "verify" | "dismiss" | "remove",
    trustTier?: TrustTier,
  ) {
    if (!session) return;
    setActionBusy(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, id, action, trustTier }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Action failed");
      }
      setMessage(json.message ?? "Action completed successfully");
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute action");
    } finally {
      setActionBusy(null);
    }
  }

  if (!enabled) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Admin Moderation Dashboard</h1>
        <p className="mt-3 text-slate-400">Database is not configured.</p>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">
        Checking permissions…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Moderator Access</h1>
        <p className="mt-3 text-slate-400">Please sign in to access the moderation dashboard.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">
        Loading pending moderation items…
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-200">
          <h2 className="text-lg font-bold">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            If you recently set your role to moderator, sign out and sign back in to refresh your context.
          </p>
          <Link href="/account" className="mt-4 inline-block rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20">
            Go to Account
          </Link>
        </div>
      </main>
    );
  }

  const salaries = data?.salaries ?? [];
  const members = data?.members ?? [];
  const flags = data?.flags ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Moderation Dashboard</h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              {data?.role?.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Review pending salary contributions, verify school affiliations, and handle flags.
          </p>
        </div>
        <button
          onClick={loadPending}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white self-start sm:self-auto"
        >
          🔄 Refresh List
        </button>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => setActiveTab("salaries")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            activeTab === "salaries"
              ? "border-indigo-400/40 bg-indigo-500/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-xs font-medium text-slate-400">Pending Salary Records</p>
          <p className="mt-1 text-2xl font-bold text-white">{salaries.length}</p>
        </div>

        <div
          onClick={() => setActiveTab("members")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            activeTab === "members"
              ? "border-indigo-400/40 bg-indigo-500/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-xs font-medium text-slate-400">Unverified School Reps</p>
          <p className="mt-1 text-2xl font-bold text-white">{members.length}</p>
        </div>

        <div
          onClick={() => setActiveTab("flags")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            activeTab === "flags"
              ? "border-indigo-400/40 bg-indigo-500/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-xs font-medium text-slate-400">Flagged Community Posts</p>
          <p className="mt-1 text-2xl font-bold text-white">{flags.length}</p>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="mt-8">
        {activeTab === "salaries" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Pending Salary Submissions ({salaries.length})</h2>

            {salaries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-500">
                🎉 No pending salary submissions to review!
              </div>
            ) : (
              salaries.map((s) => {
                const currentTier = trustTierMap[s.id] ?? "email";
                const isBusy = actionBusy === s.id;

                return (
                  <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{s.school}</h3>
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                            {s.city ? `${s.city}, ` : ""}{s.country}
                          </span>
                          {s.management_role && (
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/20">
                              Management
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs text-slate-400">
                          <div>
                            <span className="text-slate-500">Role:</span>{" "}
                            <span className="text-slate-200 font-medium">{s.role || "Teacher"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Monthly Salary:</span>{" "}
                            <span className="text-emerald-400 font-bold">${s.monthly_salary_usd?.toLocaleString()} USD</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Housing:</span>{" "}
                            <span className="text-slate-200 font-medium">{s.housing}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Flights:</span>{" "}
                            <span className="text-slate-200 font-medium">{s.flights ? "Yes" : "No"}</span>
                          </div>
                          {s.tax_rate != null && (
                            <div>
                              <span className="text-slate-500">Tax Rate:</span>{" "}
                              <span className="text-slate-200 font-medium">{(s.tax_rate * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Submitted:</span>{" "}
                            <span className="text-slate-400">{new Date(s.submitted_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 lg:pt-0 border-t border-white/5 lg:border-none">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Tier:</span>
                          <select
                            value={currentTier}
                            onChange={(e) => setTrustTierMap((prev) => ({ ...prev, [s.id]: e.target.value as TrustTier }))}
                            className="rounded-lg border border-white/10 bg-[#0c0f17] px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400/50"
                          >
                            <option value="email">Email (+25 pts)</option>
                            <option value="school">School (+100 pts)</option>
                            <option value="unverified">Unverified (+5 pts)</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview("salary", s.id, "approve", currentTier)}
                            disabled={isBusy}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {isBusy ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReview("salary", s.id, "reject")}
                            disabled={isBusy}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Unverified School Representatives ({members.length})</h2>

            {members.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-500">
                No unverified school member requests.
              </div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-sm font-medium text-white">User ID: {m.user_id}</p>
                    <p className="text-xs text-slate-400">School ID: {m.school_id} · Role: {m.member_role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview("member", m.id, "verify")}
                      disabled={actionBusy === m.id}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Verify Representative
                    </button>
                    <button
                      onClick={() => handleReview("member", m.id, "remove")}
                      disabled={actionBusy === m.id}
                      className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "flags" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Flagged Community Posts ({flags.length})</h2>

            {flags.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-500">
                No flagged community posts.
              </div>
            ) : (
              flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-sm font-medium text-white">Reason: {f.reason}</p>
                    <p className="text-xs text-slate-400">Post ID: {f.post_id} · Reporter: {f.reporter_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview("flag", f.id, "remove")}
                      disabled={actionBusy === f.id}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Remove Post
                    </button>
                    <button
                      onClick={() => handleReview("flag", f.id, "dismiss")}
                      disabled={actionBusy === f.id}
                      className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/20"
                    >
                      Dismiss Flag
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
