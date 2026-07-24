"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/analysis/salary";
import type { SalaryRecord } from "@/lib/types";

export function NegotiationCopilot({
  schoolName,
  city,
  country,
  records,
}: {
  schoolName: string;
  city: string;
  country: string;
  records: SalaryRecord[];
}) {
  const [offeredSalary, setOfferedSalary] = useState<string>("4000");
  const [userRole, setUserRole] = useState<string>("Secondary Teacher");
  const [yearsExp, setYearsExp] = useState<string>("6");
  const [copied, setCopied] = useState(false);

  const netSalaries = records
    .map((r) => r.monthlySalaryUsd)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  const schoolMedian =
    netSalaries.length > 0 ? netSalaries[Math.floor(netSalaries.length / 2)] : 4500;
  const schoolP75 =
    netSalaries.length > 0 ? netSalaries[Math.floor(netSalaries.length * 0.75)] : 5200;

  const userSalaryNum = Number(offeredSalary.replace(/[^0-9.]/g, "")) || 0;
  const salaryGap = userSalaryNum > 0 ? schoolMedian - userSalaryNum : 0;
  const p75Gap = userSalaryNum > 0 ? schoolP75 - userSalaryNum : 0;

  // Counter Offer Email Generator
  const emailSubject = `Salary Package Review — ${userRole} Offer (${schoolName})`;
  const emailBody = `Dear Recruitment Team,

Thank you very much for offering me the role of ${userRole} at ${schoolName}. I am thrilled about the opportunity to join the faculty in ${city}, ${country}.

Having reviewed the offer details, I would like to discuss the base monthly compensation package. Based on empirical international school compensation benchmarks for ${country} and verified faculty package data for ${schoolName}:

1. The offered base compensation of ${userSalaryNum > 0 ? formatUsd(userSalaryNum) : "$X"}/month sits below the verified median faculty benchmark of ${formatUsd(schoolMedian)}/month for educators with similar experience (${yearsExp} years).
2. Teachers at similar Tier 1/2 institutions in ${country} typically receive housing allowances or housing support averaging $1,200–$1,800/month along with annual flight stipends.

Given my ${yearsExp} years of teaching expertise, would the school be open to adjusting the base monthly compensation to ${p75Gap > 0 ? formatUsd(schoolP75) : formatUsd(schoolMedian + 500)}/month, or providing a dedicated monthly housing stipend?

I remain very excited about contributing to ${schoolName} and look forward to your thoughts.

Warm regards,
[Your Name]`;

  function copyTemplate() {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
            Copilot Feature
          </span>
          <h3 className="mt-2 text-xl font-bold text-white">Contract Negotiation Assistant</h3>
          <p className="mt-1 text-xs text-slate-400">
            Leverage empirical data to draft a professional, data-backed counter-offer.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">School Faculty Median</p>
          <p className="text-2xl font-bold text-emerald-300">{formatUsd(schoolMedian)}/mo</p>
          <p className="text-xs text-slate-500">P75: {formatUsd(schoolP75)}/mo</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Your Offered Monthly Salary ($ USD)</label>
            <input
              type="number"
              value={offeredSalary}
              onChange={(e) => setOfferedSalary(e.target.value)}
              placeholder="e.g. 4000"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:border-indigo-400/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Offered Role</label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder="e.g. Primary Teacher"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:border-indigo-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Years of Experience</label>
              <input
                type="number"
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:border-indigo-400/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Benchmark Verdict Card */}
          {userSalaryNum > 0 && (
            <div className={`rounded-xl border p-4 text-xs ${
              salaryGap > 0 ? "border-amber-500/20 bg-amber-500/[0.06] text-amber-200" : "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200"
            }`}>
              <p className="font-bold text-sm mb-1">
                {salaryGap > 0 ? `⚠️ Offer is ${formatUsd(salaryGap)}/mo below school median` : "✅ Offer is competitive at or above school median"}
              </p>
              <p className="text-slate-300">
                {salaryGap > 0
                  ? `Teachers at ${schoolName} median at ${formatUsd(schoolMedian)}/mo. You have leverage to request a bump toward ${formatUsd(schoolP75)}/mo.`
                  : `Your offer of ${formatUsd(userSalaryNum)}/mo places you at or above the 50th percentile for this school.`}
              </p>
            </div>
          )}
        </div>

        {/* Counter Offer Generator */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Generated Email Script</span>
            <button
              onClick={copyTemplate}
              className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
            >
              {copied ? "✓ Copied to Clipboard!" : "Copy Counter Email"}
            </button>
          </div>
          <textarea
            readOnly
            value={emailBody}
            className="w-full min-h-[220px] rounded-lg border border-white/5 bg-[#0c0f17] p-3 text-xs text-slate-300 leading-relaxed font-mono focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}
