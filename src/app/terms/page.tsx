import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Staffroom Intel",
  description: "The rules for using Staffroom Intel: data accuracy, submissions, bounties, and the jobs board.",
};

const UPDATED = "24 July 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Terms of service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. What Staffroom Intel is</h2>
          <p className="mt-2">
            Staffroom Intel is an independent information tool for international school teachers. It
            aggregates self-reported salary data, public sentiment, cost-of-living estimates, and tax
            approximations to help teachers evaluate job offers. It is not a recruitment agency, not
            affiliated with any school or school network, and does not provide financial, legal, tax, or
            career advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Data accuracy — read this first</h2>
          <p className="mt-2">
            All salary figures are <strong className="text-white">self-reported and indicative</strong>.
            Tax rates are simplified national approximations. Cost-of-living figures are estimates.
            Sentiment summaries and AI-generated evidence briefs describe patterns in public posts, not
            verified facts, and may be wrong or out of date.
          </p>
          <p className="mt-2">
            <strong className="text-white">Always verify every detail of an offer directly with the
            school</strong> — contract terms, benefits, housing, flights, visa support, and the exact
            salary in the contract currency — before making any decision. You use the information on
            this site at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Accounts</h2>
          <p className="mt-2">
            You sign in with an email magic link or Google. You are responsible for activity under your
            account. You may delete your account at any time from the{" "}
            <Link href="/account" className="text-indigo-300 hover:text-indigo-200">account page</Link>;
            see the <Link href="/privacy" className="text-indigo-300 hover:text-indigo-200">privacy
            policy</Link> for exactly what is removed and what is anonymized.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Submissions (salary &amp; cost-of-living data)</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-400">
            <li>Only submit figures you genuinely know (your own package or one you have direct knowledge of). Do not fabricate, inflate, or defame.</li>
            <li>Submissions are reviewed before they appear in benchmarks. We may reject, edit formatting, or remove any submission.</li>
            <li>By submitting you grant us a perpetual, royalty-free license to use the <em>anonymized</em> figures in aggregate benchmarks. Approved submissions are kept if you later delete your account, with the link to your identity permanently removed.</li>
            <li>Never submit another person&apos;s personal data, contract documents, or confidential school information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Bounties &amp; reputation</h2>
          <p className="mt-2">
            Bounties highlight data gaps the community wants filled. Reputation points reflect
            contribution volume and trust tier — they have no monetary value, cannot be exchanged or
            withdrawn, and exist only to recognize contributors. We may adjust or remove points awarded
            for fraudulent or rejected submissions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Jobs board</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-400">
            <li>Posts must be genuine international-school teaching or leadership vacancies.</li>
            <li>No discriminatory requirements, scams, MLM, or non-teaching commercial spam.</li>
            <li>Posts expire automatically. The community can flag posts; posts reaching the flag threshold are removed automatically, and moderators may remove any post.</li>
            <li>We do not vet employers. A listing is not an endorsement — research the school independently.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Acceptable use</h2>
          <p className="mt-2">
            Do not scrape the service at abusive volumes, attempt to re-identify anonymized
            contributors, probe or bypass security controls (including row-level security), submit
            malware or illegal content, or misrepresent your identity or affiliation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Liability</h2>
          <p className="mt-2">
            The service is provided &quot;as is&quot; without warranties of any kind. To the maximum
            extent permitted by law, we are not liable for decisions made based on the site&apos;s data,
            for lost employment opportunities, or for indirect or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">9. Changes</h2>
          <p className="mt-2">
            We may update these terms; material changes will be noted by updating the date above.
            Continued use after an update constitutes acceptance.
          </p>
        </section>
      </div>
    </main>
  );
}
