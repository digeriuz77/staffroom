import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
          School searches and report views tell the background pipeline where evidence is most useful. Public
          discussions are stored once, deduplicated, refreshed when stale, and grouped into themes such as Pay,
          Management, Housing, Workload, Turnover, and Culture. Lexicon analysis works without any paid AI service;
          optional semantic embeddings improve grouping when a provider is configured.
        </p>

        <h2 className="text-lg font-semibold text-white">A small, careful AI role</h2>
        <p>
          The AI is an evidence steward, not a chatbot. When enough fresh evidence exists, a low-cost background
          model creates a concise brief of repeated signals, watchouts, and questions to ask the school. It runs
          only when the underlying corpus changes. Briefs are clearly labelled, grounded in the displayed evidence,
          and never treated as verified fact.
        </p>

        <h2 className="text-lg font-semibold text-white">The Staffroom Board</h2>
        <p>
          A free, community-run jobs board where signed-in members can post real teaching vacancies. Posts are
          protected against bots with honeypot fields, dwell-time tokens, and per-user rate limits. Community
          flagging feeds moderation. Think of it as Dave&apos;s ESL Cafe, rebuilt for international schools.
        </p>

        {/* Creator & Support Section */}
        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-500/[0.05] p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                Project Founder
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">Created by Gary Stanyard</h2>
              <p className="mt-1 text-xs text-slate-300">
                Independent project dedicated to salary transparency for international educators.
              </p>
            </div>
            <a
              href="https://www.linkedin.com/in/garystanyard/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084e96]"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.77a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z" />
              </svg>
              Connect on LinkedIn
            </a>
          </div>

          <div className="mt-6 grid items-center gap-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <div>
              <h3 className="text-base font-bold text-white">Support the Project 🍺</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Staffroom Intel is 100% free and independent. If the salary data, purchasing power metrics, or Reddit insights helped you negotiate your teaching contract, consider buying me a beer!
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="https://www.buymeacoffee.com/garystanyard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFDD00] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#ffe533]"
                >
                  <span>🍺</span> Buy me a beer on BMC
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-3 text-center">
              <Image
                src="/bmc-qr.png"
                alt="Scan to support Gary on Buy Me a Coffee"
                width={150}
                height={150}
                className="h-auto w-36 rounded"
              />
              <p className="mt-1 text-[11px] font-semibold text-slate-900">Scan QR Code to Support</p>
            </div>
          </div>
        </section>

        <p className="pt-4 text-xs text-slate-600">
          Salary data is indicative and self-reported. Always review your offer letter and contract.
          Staffroom Intel is an independent project, not affiliated with any recruitment agency or school network.
        </p>
      </div>
    </main>
  );
}
