import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { FlagPostButton } from "@/components/FlagPostButton";
import type { BoardPostRow } from "@/lib/board";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSalaryRange(post: BoardPostRow): string | null {
  const min = post.salary_min_usd != null ? Number(post.salary_min_usd) : null;
  const max = post.salary_max_usd != null ? Number(post.salary_max_usd) : null;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}/mo ${post.currency}`;
  if (min != null) return `from ${fmt(min)}/mo ${post.currency}`;
  if (max != null) return `up to ${fmt(max)}/mo ${post.currency}`;
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BoardPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const client = supabaseServer();
  if (!client) notFound();

  const { data } = await client
    .from("board_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const post = data as BoardPostRow | null;
  if (!post || post.status !== "active") notFound();

  let schoolSlug: string | null = null;
  if (post.school_id) {
    const { data: school } = await client
      .from("schools")
      .select("slug")
      .eq("id", post.school_id)
      .maybeSingle();
    schoolSlug = (school as { slug: string } | null)?.slug ?? null;
  }

  const salary = formatSalaryRange(post);
  const paragraphs = post.body.split(/\n{2,}/);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/board" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white">
        ← All posts
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-md bg-white/5 px-2 py-0.5">{post.school_name}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">
            {post.city ? `${post.city}, ` : ""}{post.country}
          </span>
          <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-indigo-300">{post.role_type}</span>
          <span>Posted {formatDate(post.created_at)}</span>
          <span>Expires {formatDate(post.expires_at)}</span>
        </div>
        {salary && (
          <p className="mt-3 text-lg font-semibold text-emerald-300">{salary}</p>
        )}
      </header>

      {schoolSlug && (
        <Link
          href={`/school/${schoolSlug}`}
          className="mt-6 block rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 transition hover:bg-indigo-500/20"
        >
          <p className="text-sm font-semibold text-indigo-200">
            View salary intel for this school →
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Real salary records, cost of living and teacher sentiment for {post.school_name}.
          </p>
        </Link>
      )}

      <section className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-300">
            {paragraph}
          </p>
        ))}
      </section>

      {(post.apply_url || post.contact_email) && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {post.apply_url && (
            <a
              href={post.apply_url}
              rel="nofollow noopener noreferrer"
              target="_blank"
              className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Apply
            </a>
          )}
          {post.contact_email && (
            <a
              href={`mailto:${post.contact_email}`}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Contact {post.contact_email}
            </a>
          )}
        </div>
      )}

      <div className="mt-8 border-t border-white/10 pt-4">
        <FlagPostButton postId={post.id} />
      </div>
    </main>
  );
}
