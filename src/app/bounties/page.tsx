import Link from "next/link";
import { listOpenBounties, leaderboard } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function BountiesPage() {
  const bounties = await listOpenBounties();
  const board = await leaderboard();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Open bounties</h1>
      <p className="mt-2 text-sm text-slate-400">
        Data gaps we&apos;d love help filling. Submit verified data for any of these and earn reputation
        points on approval.
      </p>

      <Link
        href="/submit"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        Contribute data
      </Link>

      <section className="mt-8">
        {bounties.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
            No open bounties right now. The background job surfaces data gaps (schools with too few
            or stale records) and suggests bounties for moderator confirmation.
          </div>
        ) : (
          <div className="space-y-2">
            {bounties.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {b.scope_kind === "school" ? "School data gap" : `${b.scope_kind}: ${b.scope_value}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {b.kind} · {b.scope_value}
                  </p>
                </div>
                <span className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200">
                  +{b.reward_points} rep
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Reputation leaderboard</h2>
        {board.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            No contributors yet. Reputation is awarded when your submissions are approved.
          </p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {board.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-slate-500">{i + 1}</span>
                  <span className="text-slate-200">{u.display_name ?? "Anonymous"}</span>
                </span>
                <span className="font-semibold text-indigo-300">{u.reputation_points} rep</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
