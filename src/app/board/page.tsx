import Link from "next/link";
import { supabaseServer } from "@/lib/db/supabaseClients";
import type { BoardPostRow } from "@/lib/board";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatSalaryRange(post: BoardPostRow): string | null {
  const min = post.salary_min_usd != null ? Number(post.salary_min_usd) : null;
  const max = post.salary_max_usd != null ? Number(post.salary_max_usd) : null;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}/mo ${post.currency}`;
  if (min != null) return `from ${fmt(min)}/mo ${post.currency}`;
  if (max != null) return `up to ${fmt(max)}/mo ${post.currency}`;
  return null;
}

function daysUntilExpiry(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

async function fetchPosts(country: string, q: string): Promise<BoardPostRow[] | null> {
  const client = supabaseServer();
  if (!client) return null;

  let query = client
    .from("board_posts")
    .select("*")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (country) query = query.ilike("country", country);
  if (q) {
    const safe = q.replace(/[(),]/g, " ").trim();
    if (safe) {
      query = query.or(
        `title.ilike.%${safe}%,school_name.ilike.%${safe}%,body.ilike.%${safe}%`,
      );
    }
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(30);
  return (data ?? []) as BoardPostRow[];
}

export default async function BoardPage({ searchParams }: {
  searchParams: Promise<{ country?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const country = firstParam(params.country).trim();
  const q = firstParam(params.q).trim();
  const posts = await fetchPosts(country, q);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">The Staffroom Board</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            A free, community-run jobs board for international teachers. Posted by
            teachers and school staff, moderated by the community.
          </p>
        </div>
        <Link
          href="/board/new"
          className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Post a job
        </Link>
      </header>

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title, school or description..."
          className={`${inputCls} min-w-48 flex-1`}
        />
        <input
          type="text"
          name="country"
          defaultValue={country}
          placeholder="Country"
          className={`${inputCls} w-44 flex-none`}
        />
        <button
          type="submit"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Filter
        </button>
      </form>

      {posts === null ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Database not configured. Set the Supabase env vars to enable the board.
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm font-medium text-white">No open positions found</p>
          <p className="mt-1 text-sm text-slate-400">
            Try clearing the filters, or be the first to{" "}
            <Link href="/board/new" className="text-indigo-300 hover:text-indigo-200">
              post a job
            </Link>.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {posts.map((post) => {
            const salary = formatSalaryRange(post);
            const expiryDays = daysUntilExpiry(post.expires_at);
            return (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-indigo-400/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-white">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {post.school_name} · {post.city ? `${post.city}, ` : ""}{post.country}
                    </p>
                  </div>
                  <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                    {post.role_type}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {salary && <span className="font-medium text-emerald-300">{salary}</span>}
                  <span>
                    Posted {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <span>
                    {expiryDays === 0 ? "Expires today" : `Expires in ${expiryDays} day${expiryDays !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
