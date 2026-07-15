import Link from "next/link";
import { buildSalaryReportAsync, formatUsd } from "@/lib/analysis/salary";
import { getTaxRateForCountry, getSchools } from "@/lib/db/repo";
import { verdictTone, TONE_CLASSES } from "@/lib/tone";
import { DataDisclaimer } from "@/components/ProvenanceBadge";
import type { Metadata } from "next";
import type { SalaryReport } from "@/lib/analysis/salary";

export const metadata: Metadata = {
  title: "Compare Schools — Staffroom Intel",
  description: "Side-by-side comparison of international school salary packages, tax regimes, and cost of living.",
};

export const dynamic = "force-dynamic";

interface CompareEntry {
  slug: string;
  report: SalaryReport | null;
  taxRate: { takeHomePct: number; taxRegime: string } | null;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ schools?: string }>;
}) {
  const { schools: schoolsParam } = await searchParams;
  const slugs = (schoolsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const entries: CompareEntry[] = [];
  for (const slug of slugs) {
    const report = await buildSalaryReportAsync(slug);
    const taxRate = report ? await getTaxRateForCountry(report.school.country) : null;
    entries.push({
      slug,
      report,
      taxRate: taxRate ? { takeHomePct: taxRate.takeHomePct, taxRegime: taxRate.taxRegime } : null,
    });
  }

  const hasData = entries.some((e) => e.report);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Compare schools</h1>
        <p className="mt-2 text-slate-400">
          Side-by-side salary packages, tax regimes, and cost of living — pick up to 3 schools.
        </p>
      </header>

      <SchoolPicker />

      {hasData && entries.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-40 py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Metric
                </th>
                {entries.map((e) => (
                  <th key={e.slug} className="py-3 px-3 text-left">
                    {e.report ? (
                      <Link href={`/school/${e.slug}`} className="block">
                        <span className="text-sm font-semibold text-white hover:text-indigo-300">
                          {e.report.school.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {e.report.school.city}, {e.report.school.country}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-600">Not found</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.some((e) => e.report?.schoolStats) && (
                <>
                  <CompareRow
                    label="Records"
                    entries={entries}
                    render={(r) => `${r.records.length}`}
                  />
                  <CompareRow
                    label="School median (net/mo)"
                    entries={entries}
                    render={(r) => formatUsd(r.schoolStats.median, true)}
                    highlight={(reports) => {
                      const vals = reports.filter((r) => r).map((r) => r!.schoolStats.median);
                      if (vals.length < 2) return -1;
                      return vals.indexOf(Math.max(...vals));
                    }}
                  />
                  <CompareRow
                    label="Country median (net/mo)"
                    entries={entries}
                    render={(r) => formatUsd(r.countryStats.median, true)}
                  />
                  <CompareRow
                    label="Region median (net/mo)"
                    entries={entries}
                    render={(r) => formatUsd(r.regionStats.median, true)}
                  />
                  <CompareRow
                    label="Country P25–P75"
                    entries={entries}
                    render={(r) => `${formatUsd(r.countryStats.p25, true)} – ${formatUsd(r.countryStats.p75, true)}`}
                  />
                </>
              )}
              {entries.some((e) => e.taxRate) && (
                <>
                  <CompareRow
                    label="Tax regime"
                    entries={entries}
                    render={(r, i) => entries[i].taxRate?.taxRegime ?? "—"}
                  />
                  <CompareRow
                    label="Take-home %"
                    entries={entries}
                    render={(r, i) => `${Math.round((entries[i].taxRate?.takeHomePct ?? 0) * 100)}%`}
                    highlight={(reports) => {
                      const vals = entries.map((e) => e.taxRate?.takeHomePct ?? 0);
                      if (vals.length < 2) return -1;
                      return vals.indexOf(Math.max(...vals));
                    }}
                  />
                </>
              )}
              {entries.some((e) => e.report?.col) && (
                <>
                  <CompareRow
                    label="COL index"
                    entries={entries}
                    render={(r) => (r.col ? `${r.col.colIndex} (London=100)` : "—")}
                  />
                  <CompareRow
                    label="Buying power (net/mo)"
                    entries={entries}
                    render={(r) => (r.col ? formatUsd(r.col.buyingPowerUsd, true) : "—")}
                    highlight={(reports) => {
                      const vals = reports.map((r) => r?.col?.buyingPowerUsd ?? 0).filter((v) => v > 0);
                      if (vals.length < 2) return -1;
                      const max = Math.max(...vals);
                      return reports.findIndex((r) => r?.col?.buyingPowerUsd === max);
                    }}
                  />
                  <CompareRow
                    label="Beer cost"
                    entries={entries}
                    render={(r) => (r.col ? `$${r.col.beer.toFixed(0)}` : "—")}
                  />
                  <CompareRow
                    label="Gym / mo"
                    entries={entries}
                    render={(r) => (r.col ? `$${r.col.gym.toFixed(0)}` : "—")}
                  />
                </>
              )}
              {entries.some((e) => e.report?.offer) && (
                <CompareRow
                  label="Offer verdict"
                  entries={entries}
                  render={(r) => {
                    if (!r.offer) return "—";
                    const tone = verdictTone(r.offer.verdict);
                    const cls = TONE_CLASSES[tone];
                    return r.offer.verdict;
                  }}
                  cellClass={(r) => {
                    if (!r?.offer) return "";
                    const tone = verdictTone(r.offer.verdict);
                    return TONE_CLASSES[tone].text;
                  }}
                />
              )}
            </tbody>
          </table>
        </div>
      )}

      {!hasData && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          Select schools above to compare. Add up to 3 from the browse page.
        </div>
      )}

      <div className="mt-8">
        <DataDisclaimer />
      </div>
    </main>
  );
}

function CompareRow({
  label,
  entries,
  render,
  highlight,
  cellClass,
}: {
  label: string;
  entries: CompareEntry[];
  render: (report: SalaryReport, index: number) => string;
  highlight?: (reports: (SalaryReport | null)[]) => number;
  cellClass?: (report: SalaryReport | null) => string;
}) {
  const reports = entries.map((e) => e.report);
  const highlightIdx = highlight ? highlight(reports) : -1;
  return (
    <tr>
      <td className="py-2.5 pr-4 text-xs font-medium text-slate-500">{label}</td>
      {entries.map((e, i) => {
        const r = e.report;
        if (!r) return <td key={i} className="py-2.5 px-3 text-slate-600">—</td>;
        const isBest = i === highlightIdx;
        const extra = cellClass?.(r) ?? "";
        return (
          <td key={i} className={`py-2.5 px-3 ${isBest ? "font-bold text-emerald-300" : "text-slate-300"} ${extra}`}>
            {render(r, i)}
            {isBest && <span className="ml-1 text-[10px] text-emerald-400/60">★</span>}
          </td>
        );
      })}
    </tr>
  );
}

async function SchoolPicker() {
  const allSchools = await getSchools();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        Add schools to compare
      </p>
      <SchoolPickerClient schools={allSchools.map((s) => ({ slug: s.school.slug, name: s.school.name, city: s.school.city, country: s.school.country }))} />
    </div>
  );
}

function SchoolPickerClient({ schools }: { schools: { slug: string; name: string; city: string; country: string }[] }) {
  // This is a server-rendered form that redirects with query params.
  // Kept simple — no client JS needed for low-usage.
  return (
    <form action="/compare" method="get" className="flex flex-wrap gap-2">
      <input type="hidden" name="action" value="compare" />
      {schools.slice(0, 0).map(() => null)}
      <select
        name="schools"
        multiple
        size={6}
        className="min-w-[280px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-400/40 focus:outline-none"
      >
        {schools.map((s) => (
          <option key={s.slug} value={s.slug} className="bg-[#0c0f17]">
            {s.name} — {s.city}, {s.country}
          </option>
        ))}
      </select>
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Compare selected →
        </button>
        <p className="text-[11px] text-slate-500">Hold Ctrl/Cmd to select up to 3</p>
      </div>
    </form>
  );
}
