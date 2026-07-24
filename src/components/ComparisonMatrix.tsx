"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUsd } from "@/lib/analysis/salary";
import type { SalaryReport } from "@/lib/analysis/salary";
import type { SalaryRecord } from "@/lib/types";

export interface CompareEntryData {
  slug: string;
  report: SalaryReport | null;
  taxRate: { takeHomePct: number; taxRegime: string; effectiveRate: number } | null;
}

type ValidEntry = {
  slug: string;
  report: SalaryReport;
  taxRate: CompareEntryData["taxRate"];
};

function filterValid(entries: CompareEntryData[]): ValidEntry[] {
  return entries.filter((e) => e.report !== null) as ValidEntry[];
}

/** Estimated monthly net savings (median net salary − estimated living expenses). */
function computeSavings(valid: ValidEntry[]): number[] {
  return valid.map((e) => {
    const net = e.report.schoolStats.median;
    const colExp = e.report.col ? e.report.col.medianMonthlyUsd : 1800;
    return Math.max(0, net - colExp);
  });
}

export function ComparisonBanner({ entries }: { entries: CompareEntryData[] }) {
  const [copied, setCopied] = useState(false);
  const valid = filterValid(entries);
  if (valid.length === 0) return null;

  const bestSalaryIdx = bestIndex(valid, (e) => e.report.schoolStats.median);
  const bestHousingIdx = bestIndex(valid, (e) => {
    const hList = e.report.records.map((r: SalaryRecord) => (r as any).package?.housingAllowanceUsd || (r.housing === "Allowance" ? r.monthlySalaryUsd * 0.25 : 0));
    return hList.length > 0 ? Math.max(...hList) : 0;
  });
  const bestTakeHomeIdx = bestIndex(valid, (e) => e.taxRate?.takeHomePct);

  const savingsList = computeSavings(valid);
  const bestSavingsIdx = bestIndex(valid, (_, i) => savingsList[i]);
  const topOverallWinner = valid[bestSavingsIdx >= 0 ? bestSavingsIdx : 0];

  function copyShareLink() {
    const slugs = valid.map((e) => e.slug).join(",");
    const url = `${window.location.origin}/compare?schools=${encodeURIComponent(slugs)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl">
            🏆
          </span>
          <div>
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              Overall Package Leader
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">
              {topOverallWinner.report.school.name}
            </h2>
            <p className="text-xs text-slate-300">
              Highest estimated monthly net savings ({formatUsd(savingsList[bestSavingsIdx >= 0 ? bestSavingsIdx : 0])}/mo post-expenses).
            </p>
          </div>
        </div>

        <button
          onClick={copyShareLink}
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
        >
          <span>🔗</span>
          <span>{copied ? "Link Copied to Clipboard!" : "Share Side-by-Side Link"}</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-2 text-xs">
        {bestSalaryIdx >= 0 && (
          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
            🥇 Base Salary: {valid[bestSalaryIdx].report.school.name} ({formatUsd(valid[bestSalaryIdx].report.schoolStats.median)}/mo)
          </span>
        )}
        {bestHousingIdx >= 0 && (
          <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-semibold text-indigo-300">
            🏡 Housing Benefit: {valid[bestHousingIdx].report.school.name}
          </span>
        )}
        {bestTakeHomeIdx >= 0 && (
          <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1 font-semibold text-purple-300">
            🛡️ Low Tax Rate: {valid[bestTakeHomeIdx].report.school.name} ({Math.round((valid[bestTakeHomeIdx].taxRate?.takeHomePct || 1) * 100)}% Net)
          </span>
        )}
      </div>
    </div>
  );
}

export function ComparisonMatrix({ entries }: { entries: CompareEntryData[] }) {
  const valid = filterValid(entries);
  if (valid.length === 0) return null;

  const bestSalaryIdx = bestIndex(valid, (e) => e.report.schoolStats.median);
  const bestTakeHomeIdx = bestIndex(valid, (e) => e.taxRate?.takeHomePct);
  const bestBuyingPowerIdx = bestIndex(valid, (e) => e.report.col?.buyingPowerUsd);

  const savingsList = computeSavings(valid);
  const bestSavingsIdx = bestIndex(valid, (_, i) => savingsList[i]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      <h3 className="mb-5 text-lg font-bold text-white">Detailed comparison</h3>

      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
            <th className="w-1/4 px-4 py-3">Metric</th>
            {valid.map((e) => (
              <th key={e.slug} className="w-1/4 px-4 py-3">
                <Link href={`/school/${e.slug}`} className="text-base font-bold text-white transition hover:text-indigo-300">
                  {e.report.school.name}
                </Link>
                <p className="text-xs font-normal text-slate-500">{e.report.school.city}, {e.report.school.country}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {/* Section 1: Base Compensation */}
          <SectionHeader title="Base Compensation" colSpan={valid.length + 1} />
          <MatrixRow
            label="Median Net Salary"
            values={valid.map((e, i) => ({
              text: `${formatUsd(e.report.schoolStats.median)}/mo`,
              isWinner: i === bestSalaryIdx,
            }))}
          />
          <MatrixRow
            label="Country Median"
            values={valid.map((e) => ({ text: `${formatUsd(e.report.countryStats.median)}/mo` }))}
          />
          <MatrixRow
            label="Region Median"
            values={valid.map((e) => ({ text: `${formatUsd(e.report.regionStats.median)}/mo` }))}
          />
          <MatrixRow
            label="Middle 50% Range"
            values={valid.map((e) => ({
              text: `${formatUsd(e.report.countryStats.p25, true)} – ${formatUsd(e.report.countryStats.p75, true)}`,
            }))}
          />
          <MatrixRow
            label="Verified Records"
            values={valid.map((e) => ({ text: `${e.report.records.length}` }))}
          />

          {/* Section 2: Tax & Take-Home */}
          <SectionHeader title="Tax & Take-Home" colSpan={valid.length + 1} />
          <MatrixRow
            label="Tax Regime"
            values={valid.map((e) => ({ text: e.taxRate ? e.taxRate.taxRegime : "Local Tax Regulations" }))}
          />
          <MatrixRow
            label="Take-Home Pay"
            values={valid.map((e, i) => ({
              text: e.taxRate ? `${Math.round(e.taxRate.takeHomePct * 100)}%` : "100%",
              isWinner: i === bestTakeHomeIdx,
            }))}
          />

          {/* Section 3: Cost of Living & Savings */}
          <SectionHeader title="Cost of Living & Savings" colSpan={valid.length + 1} />
          <MatrixRow
            label="COL Index"
            values={valid.map((e) => ({ text: e.report.col ? `${e.report.col.colIndex} (London=100)` : "N/A" }))}
          />
          <MatrixRow
            label="Est. Monthly Expenses"
            values={valid.map((e) => ({ text: e.report.col ? `${formatUsd(e.report.col.medianMonthlyUsd)}/mo` : "~$1,800/mo" }))}
          />
          <MatrixRow
            label="Net Savings Potential"
            values={valid.map((e, i) => ({
              text: `${formatUsd(savingsList[i])}/mo`,
              isWinner: i === bestSavingsIdx,
            }))}
          />
          <MatrixRow
            label="Buying Power"
            values={valid.map((e, i) => ({
              text: e.report.col ? `${formatUsd(e.report.col.buyingPowerUsd)}/mo` : "N/A",
              isWinner: i === bestBuyingPowerIdx,
            }))}
          />
          <MatrixRow
            label="Sample Prices"
            values={valid.map((e) => ({
              text: e.report.col
                ? `Beer $${e.report.col.beer.toFixed(0)} · Gym $${e.report.col.gym.toFixed(0)} · Meal $${e.report.col.meal.toFixed(0)}`
                : "N/A",
            }))}
          />
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, colSpan }: { title: string; colSpan: number }) {
  return (
    <tr className="bg-white/[0.02]">
      <td colSpan={colSpan} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
        {title}
      </td>
    </tr>
  );
}

function MatrixRow({
  label,
  values,
}: {
  label: string;
  values: Array<{ text: string; isWinner?: boolean }>;
}) {
  return (
    <tr className="transition hover:bg-white/[0.02]">
      <td className="px-4 py-3 text-xs font-medium text-slate-400">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-3 font-semibold">
          <span className={`inline-flex items-center gap-1 ${v.isWinner ? "font-bold text-emerald-300" : "text-slate-200"}`}>
            {v.text}
            {v.isWinner && <span className="text-xs text-emerald-400">🥇</span>}
          </span>
        </td>
      ))}
    </tr>
  );
}

function bestIndex(
  entries: any[],
  getter: (e: any, index: number) => number | undefined | null
): number {
  const vals = entries.map((e, i) => getter(e, i) ?? -Infinity);
  if (vals.length < 2) return -1;
  const max = Math.max(...vals);
  if (max === -Infinity || max === 0) return -1;
  return vals.indexOf(max);
}
