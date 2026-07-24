import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Staffroom Intel",
  description: "What data Staffroom Intel collects, why, and how to exercise your rights.",
};

const UPDATED = "24 July 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white">The short version</h2>
          <p className="mt-2">
            Staffroom Intel collects the minimum data needed to run the service: an email address if you
            create an account, whatever you choose to submit (salary records, board posts, profile details),
            and a handful of preferences stored only on your own device. We do not sell data, run tracking
            analytics, or share your information with advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">What we collect and why</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Purpose</th>
                  <th className="px-4 py-2.5 font-medium">Legal basis (GDPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="px-4 py-2.5">Email address (account sign-in via magic link or Google OAuth)</td>
                  <td className="px-4 py-2.5">Authentication, account recovery</td>
                  <td className="px-4 py-2.5">Contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Display name, bio, profile kind, school affiliation</td>
                  <td className="px-4 py-2.5">Your public/profile features; optional leaderboard display (opt-in)</td>
                  <td className="px-4 py-2.5">Consent (Art. 6(1)(a))</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Salary records and cost-of-living items you submit</td>
                  <td className="px-4 py-2.5">Aggregate salary benchmarks shown to other teachers</td>
                  <td className="px-4 py-2.5">Legitimate interest (Art. 6(1)(f))</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Jobs-board posts, including an optional contact email</td>
                  <td className="px-4 py-2.5">Publishing your listing to the community board</td>
                  <td className="px-4 py-2.5">Contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Public Reddit posts mentioning schools</td>
                  <td className="px-4 py-2.5">Sentiment summaries (public source data, usernames not republished)</td>
                  <td className="px-4 py-2.5">Legitimate interest (Art. 6(1)(f))</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Stored on your device only</h2>
          <p className="mt-2">
            The following preferences live in your browser&apos;s <code className="text-indigo-300">localStorage</code> and
            are never transmitted to our servers. Clearing your browser data removes them:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
            <li><code className="text-indigo-300">staffroom_watchlist</code> — schools you are watching</li>
            <li><code className="text-indigo-300">si.compare-tray</code> — schools in your comparison tray</li>
            <li><code className="text-indigo-300">staffroom_theme</code> — light/dark theme preference</li>
            <li><code className="text-indigo-300">staffroom_currency</code> — display currency preference</li>
            <li><code className="text-indigo-300">si.cookie-consent</code> — your cookie/ad consent choice</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Advertising &amp; cookies</h2>
          <p className="mt-2">
            We do not use analytics cookies or tracking pixels. Advertising via Google AdSense is
            planned but <strong className="text-white">not currently active</strong>. Before any ads are enabled, we will
            ask for your consent via a banner, and ad code will only load after you accept. You can change
            your choice at any time by clearing the <code className="text-indigo-300">si.cookie-consent</code> entry in
            your browser storage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Who processes your data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
            <li><strong className="text-slate-200">Supabase</strong> — database and authentication (data hosted on Supabase infrastructure)</li>
            <li><strong className="text-slate-200">Vercel</strong> — web hosting and serverless functions</li>
            <li><strong className="text-slate-200">Railway</strong> — background data-processing worker</li>
            <li><strong className="text-slate-200">Google</strong> — OAuth sign-in (only if you choose Google sign-in)</li>
          </ul>
          <p className="mt-2">We do not sell or rent personal data to anyone.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Your rights</h2>
          <p className="mt-2">
            You can access and correct your profile data at any time from your{" "}
            <Link href="/account" className="text-indigo-300 hover:text-indigo-200">account page</Link>.
            You can delete your account from the same page. Deletion removes your identity data:
            email address, profile, school affiliations, and board posts (including any contact email
            they contain).
          </p>
          <p className="mt-2">
            Salary and cost-of-living records you submitted are <strong className="text-white">kept but
            fully anonymized</strong> — the link to your identity is permanently severed
            (<code className="text-indigo-300">submitter_id</code> is set to null) so aggregate school
            benchmarks stay meaningful for other teachers. These records never contained your name or
            email. If you need a specific record removed entirely, contact us and we will delete it
            manually.
          </p>
          <p className="mt-2">
            Depending on your location you may also have rights to data portability, to object to
            processing, and to lodge a complaint with your local supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Retention</h2>
          <p className="mt-2">
            Account data is kept until you delete your account. Board posts expire automatically and are
            pruned. Background job artifacts are retained for a bounded period and then deleted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="mt-2">
            For any privacy question, correction, or deletion request, open an issue on the project
            repository or contact the maintainer listed on the{" "}
            <Link href="/about" className="text-indigo-300 hover:text-indigo-200">about page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
