import type { Metadata } from "next";
import Link from "next/link";
import { getSchools, getColItems } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "About — Staffroom Intel",
  description: "How Staffroom Intel works: real salary data, cost of living, social sentiment, and a community jobs board for international teachers.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [allSchools, colItems] = await Promise.all([getSchools(), getColItems()]);
  const salaries = allSchools.reduce((sum, s) => sum + s.records.length, 0);
  const schools = allSchools.length;
  const cities = colItems.length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">About Staffroom Intel</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-400">
        <p>
          Staffroom Intel helps international school teachers evaluate job offers with real data, not marketing language.
          Paste a job link and see how the salary compares to {salaries.toLocaleString()} records across {schools} schools,
          what your purchasing power looks like in {cities} cities, and what teachers actually say about the school on Reddit.
        </p>

        <h2 className="text-lg font-semibold text-white">How the verdict works</h2>
        <p>
          Salary figures are normalized to a monthly USD value so packages across currencies and tax regimes can be
          compared fairly. Each offer is placed on a percentile histogram against the school, country, and region.
          The verdict (Strong offer, Competitive, Fair, Below market) combines percentile placement with estimated
          savings rate. Cost-of-living is indexed against London (100), and purchasing power is salary divided by
          the local index.
        </p>

        <h2 className="text-lg font-semibold text-white">Trust tiers and provenance</h2>
        <p>
          Every salary record carries a trust tier: <span className="text-slate-300">seed data</span> (static baseline),
          <span className="text-amber-300"> self-reported</span> (user-submitted, unverified),
          <span className="text-indigo-300"> verified</span> (email-confirmed submitter), or
          <span className="text-emerald-300"> school-verified</span> (moderator-confirmed).
          Submissions enter a moderation queue before going live. Provenance badges appear on every record so you
          know what you are looking at.
        </p>

        <h2 className="text-lg font-semibold text-white">Social sentiment</h2>
        <p>
          A background worker fetches Reddit posts from international teaching subreddits, stores them with semantic
          embeddings (pgvector), and clusters them into themes per school: Pay, Management, Housing, Workload,
          Turnover, Culture. The school report shows the stored corpus with theme summaries and a turnover signal
          that correlates posting frequency with sentiment shifts. Live Reddit fills gaps when the stored corpus
          is thin. The more teachers who contribute and discuss, the richer this becomes.
        </p>

        <h2 className="text-lg font-semibold text-white">The Staffroom Board</h2>
        <p>
          A free, community-run jobs board where signed-in members can post real teaching vacancies. Posts are
          protected against bots with honeypot fields, dwell-time tokens, and per-user rate limits. Community
          flagging feeds moderation. Think of it as Dave&apos;s ESL Cafe, rebuilt for international schools.
        </p>

        <h2 className="text-lg font-semibold text-white">Contributing</h2>
        <p>
          The dataset grows more valuable as more teachers contribute. <Link href="/submit" className="text-indigo-300 hover:text-indigo-200">Submit a salary record</Link>
          {" "}to earn reputation points, or claim a <Link href="/bounties" className="text-indigo-300 hover:text-indigo-200">bounty</Link> for
          schools with thin or stale data. Your submissions are moderated and your identity is never revealed.
        </p>

        <h2 className="text-lg font-semibold text-white">Comparison</h2>
        <p>
          Add schools to the comparison tray from any school report or the compare page. Compare up to 3 schools
          side-by-side: median salaries, tax regimes, cost of living, buying power, and sentiment. The tray
          persists in your browser so you can build your shortlist across visits.
        </p>

        <p className="pt-4 text-xs text-slate-600">
          Salary data is indicative and self-reported. Always review your offer letter and contract.
          Staffroom Intel is an independent project, not affiliated with any recruitment agency or school network.
        </p>
      </div>
    </main>
  );
}
