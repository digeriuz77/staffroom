import Link from "next/link";
import { PasteLink } from "@/components/PasteLink";
import { CheckIcon, SparkIcon } from "@/components/icons";
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

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Salary verdict"
            desc="Compare the offer against real percentile data for the school, country and region."
          />
          <FeatureCard
            title="Purchasing power"
            desc="See real take-home, monthly living costs, savings and what a beer or gym costs locally."
          />
          <FeatureCard
            title="Social sentiment"
            desc="Stored Reddit corpus with theme clusters and turnover signals, not just live scraping."
          />
          <FeatureCard
            title="Jobs board"
            desc="A free, community-run board where signed-in members post real teaching vacancies."
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/board"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-indigo-400/30"
          >
            Browse the jobs board
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-indigo-400/30"
          >
            Compare schools
          </Link>
          <Link
            href="/purchasing-power"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-indigo-400/30"
          >
            <SparkIcon className="h-4 w-4 text-indigo-400" />
            Purchasing-power tool
          </Link>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
          >
            Contribute your data
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.05]">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}
