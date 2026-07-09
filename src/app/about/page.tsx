import type { Metadata } from "next";
import { totalRecordCount } from "@/lib/data/schools";
import { deriveSchools } from "@/lib/data/schools";
import { COST_OF_LIVING } from "@/lib/data/costOfLiving";

export const metadata: Metadata = {
  title: "About — Staffroom Intel",
  description: "How Staffroom Intel works: real salary data, cost of living and Reddit sentiment for international teachers.",
};

export default function AboutPage() {
  const salaries = totalRecordCount();
  const schools = deriveSchools().length;
  const cities = COST_OF_LIVING.length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">About Staffroom Intel</h1>
      <div className="prose prose-invert mt-6 max-w-none space-y-4 text-slate-400">
        <p>
          Staffroom Intel helps international school teachers evaluate job offers with real data, not marketing language.
          Paste a job link and see how the salary compares to {salaries.toLocaleString()} verified records across {schools} schools,
          what your purchasing power looks like in {cities} cities, and what teachers actually say about the school.
        </p>
        <h2 className="text-lg font-semibold text-white">How the data works</h2>
        <p>
          Salary figures are normalized to a monthly USD value so packages across currencies and tax regimes can be
          compared fairly. Cost-of-living is indexed against London (100), and purchasing power is salary divided by
          the local index. Estimated savings account for typical rent, groceries, transport and utilities.
        </p>
        <h2 className="text-lg font-semibold text-white">Reddit sentiment</h2>
        <p>
          Social sentiment is pulled live from the Reddit API (OAuth, read-only). If Reddit returns no recent posts for
          a school — or the API credentials aren&apos;t configured — we fall back to a curated static set so the report
          still tells you something useful. Set <code className="rounded bg-white/10 px-1 text-indigo-300">REDDIT_CLIENT_ID</code> and
          <code className="rounded bg-white/10 px-1 text-indigo-300">REDDIT_CLIENT_SECRET</code> to enable live fetching.
          Reddit&apos;s free tier (~100 requests / 10 min) is more than enough for per-school lookups.
        </p>
        <h2 className="text-lg font-semibold text-white">Roadmap</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Background scraper to cache sentiment into a SQL database (live Reddit as a confirmation layer)</li>
          <li>Glassdoor / Facebook signals via cached, community-submitted content</li>
          <li>Anonymous salary submission to grow the dataset</li>
        </ul>
        <p className="text-sm text-slate-500">
          Salary data is indicative and self-reported. Always review your offer letter and contract.
        </p>
      </div>
    </main>
  );
}
