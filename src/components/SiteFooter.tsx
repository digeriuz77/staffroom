import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-white">Staffroom Intel</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
              Honest intelligence for international school teachers. Built by teachers, for teachers.
              Salary data is self-reported and indicative. Always verify offer details directly with the school.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-600">Tools</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/schools" className="text-slate-400 transition hover:text-white">Browse schools</Link></li>
              <li><Link href="/compare" className="text-slate-400 transition hover:text-white">Compare</Link></li>
              <li><Link href="/purchasing-power" className="text-slate-400 transition hover:text-white">Purchasing power</Link></li>
              <li><Link href="/board" className="text-slate-400 transition hover:text-white">Jobs board</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-600">Community</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/submit" className="text-slate-400 transition hover:text-white">Contribute data</Link></li>
              <li><Link href="/bounties" className="text-slate-400 transition hover:text-white">Bounties</Link></li>
              <li><Link href="/account" className="text-slate-400 transition hover:text-white">Account</Link></li>
              <li><Link href="/about" className="text-slate-400 transition hover:text-white">About</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/[0.04] pt-6 text-xs text-slate-600">
          <p>Staffroom Intel is an independent project, not affiliated with any recruitment agency or school network.</p>
        </div>
      </div>
    </footer>
  );
}
