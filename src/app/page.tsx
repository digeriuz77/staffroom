import Link from "next/link";
import { PasteLink } from "@/components/PasteLink";
import { CheckIcon } from "@/components/icons";
import { getSchools, getColItems } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const initialMode = (sp.mode === "text" || sp.mode === "manual" ? sp.mode : "link") as
    | "link"
    | "text"
    | "manual";
  const initialSchoolQuery = sp.school ?? "";

  const [allSchools, colItems] = await Promise.all([getSchools(), getColItems()]);
  const salaries = allSchools.reduce((sum, s) => sum + s.records.length, 0);
  const schools = allSchools.length;
  const cities = colItems.length;

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="glow absolute inset-x-0 top-0 h-[480px]" />
        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:pt-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {salaries.toLocaleString()} real salary records · {schools} schools · {cities} cities
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Know what an international teaching job is{" "}
            <span className="text-gradient">really worth</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">
            Paste a job link. Instantly see how the salary compares to real verified packages,
            what your purchasing power and savings will be, and what teachers actually say about the school.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <PasteLink initialMode={initialMode} initialSchoolQuery={initialSchoolQuery} />
          </div>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {["tes.com", "Teacher Horizons", "Search Associates", "Schrole", "ESL Cafe"].map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400/70" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Explore Staffroom Intel</h2>
            <p className="mt-1 text-sm text-slate-400">Start with the route that matches your next decision.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SupportingLink href="/compare" title="Compare schools" detail="Packages side by side" />
            <SupportingLink href="/board" title="Browse jobs" detail="Community vacancies" />
            <SupportingLink href="/submit" title="Contribute data" detail="Improve the evidence" />
          </div>
        </div>
      </section>
    </main>
  );
}

function SupportingLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.06]"
    >
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
      </span>
      <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
