"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/analysis/salary";
import type { ColItem } from "@/lib/types";

export interface SavingsCalculatorProps {
  initialCity?: string;
  initialSalary?: number;
  initialHousingAllowance?: number;
  colItems: ColItem[];
}

export function SavingsCalculator({
  initialCity,
  initialSalary = 4500,
  initialHousingAllowance = 1200,
  colItems,
}: SavingsCalculatorProps) {
  const [monthlySalary, setMonthlySalary] = useState(initialSalary);
  const [housingAllowance, setHousingAllowance] = useState(initialHousingAllowance);
  const [housingProvided, setHousingProvided] = useState(false);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>(
    initialCity || (colItems[0]?.city ? `${colItems[0].city}-${colItems[0].country}` : "")
  );

  const [householdType, setHouseholdType] = useState<"single" | "couple_1" | "couple_2" | "family_1" | "family_2">("single");

  // Selected CoL Item
  const activeCol =
    colItems.find((c) => `${c.city}-${c.country}` === selectedCitySlug) || colItems[0];

  const colBaseExpense = activeCol ? activeCol.medianMonthlyUsd : 1800;

  // Household multipliers
  const householdMultipliers = {
    single: { expMult: 1.0, rentMult: 1.0, label: "Single Teacher" },
    couple_1: { expMult: 1.6, rentMult: 1.3, label: "Couple (1 Earner)" },
    couple_2: { expMult: 1.8, rentMult: 1.4, label: "Couple (2 Earners)" },
    family_1: { expMult: 2.1, rentMult: 1.6, label: "Family with 1 Child" },
    family_2: { expMult: 2.5, rentMult: 1.8, label: "Family with 2 Children" },
  };

  const currentHh = householdMultipliers[householdType];

  // Budget calculations
  const totalIncome = monthlySalary + (housingProvided ? 0 : housingAllowance);
  const estimatedRent = housingProvided ? 0 : Math.round(colBaseExpense * 0.55 * currentHh.rentMult);
  const estimatedLivingExpenses = Math.round(colBaseExpense * 0.45 * currentHh.expMult);
  const totalMonthlyExpenses = estimatedRent + estimatedLivingExpenses;

  const netMonthlySavings = Math.max(-2000, totalIncome - totalMonthlyExpenses);
  const savingsRatePct = totalIncome > 0 ? Math.round((netMonthlySavings / totalIncome) * 100) : 0;
  const annualSavings = netMonthlySavings * 12;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
            Interactive Budget &amp; Savings Calculator
          </span>
          <h3 className="mt-2 text-xl font-bold text-white">Monthly Savings Potential</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Est. Net Annual Savings</p>
          <p className={`text-2xl font-extrabold ${annualSavings >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
            {formatUsd(annualSavings)}/yr
          </p>
          <p className="text-xs text-slate-500">{savingsRatePct}% savings rate</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Input Controls */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Target Destination City</label>
            <select
              value={selectedCitySlug}
              onChange={(e) => setSelectedCitySlug(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0c0f17] px-3.5 py-2.5 text-sm text-white focus:border-indigo-400/50 focus:outline-none"
            >
              {colItems.map((c) => (
                <option key={`${c.city}-${c.country}`} value={`${c.city}-${c.country}`}>
                  {c.city}, {c.country} (COL Index: {c.colIndex})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Household Composition</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(householdMultipliers) as Array<keyof typeof householdMultipliers>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHouseholdType(key)}
                  className={`rounded-lg border px-3 py-2 text-left font-medium transition ${
                    householdType === key
                      ? "border-indigo-400 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {householdMultipliers[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Net Monthly Salary ($)</label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Housing Allowance ($/mo)</label>
              <input
                type="number"
                disabled={housingProvided}
                value={housingAllowance}
                onChange={(e) => setHousingAllowance(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-40 focus:border-indigo-400/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="housingProvided"
              checked={housingProvided}
              onChange={(e) => setHousingProvided(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-400"
            />
            <label htmlFor="housingProvided" className="text-xs text-slate-300">
              School provides free furnished apartment (Zero rent expense)
            </label>
          </div>
        </div>

        {/* Itemized Budget Results */}
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Budget Breakdown</p>

          <div className="space-y-2.5 text-sm">
            <BudgetItem label="Net Salary Income" value={`+${formatUsd(monthlySalary)}`} tone="emerald" />
            {!housingProvided && housingAllowance > 0 && (
              <BudgetItem label="Housing Stipend" value={`+${formatUsd(housingAllowance)}`} tone="indigo" />
            )}
            <BudgetItem
              label={housingProvided ? "Housing Rent (School Provided)" : "Estimated Apartment Rent"}
              value={housingProvided ? "$0 (Provided)" : `-${formatUsd(estimatedRent)}`}
              tone={housingProvided ? "emerald" : "amber"}
            />
            <BudgetItem
              label={`Living Expenses (${currentHh.label})`}
              value={`-${formatUsd(estimatedLivingExpenses)}`}
              tone="rose"
            />
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-base font-bold">
              <span className="text-white">Est. Monthly Net Savings</span>
              <span className={netMonthlySavings >= 0 ? "text-emerald-300" : "text-rose-400"}>
                {formatUsd(netMonthlySavings)}/mo
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Based on {activeCol ? `${activeCol.city}, ${activeCol.country}` : "city"} cost of living indexes (London = 100).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetItem({ label, value, tone }: { label: string; value: string; tone: "emerald" | "indigo" | "amber" | "rose" }) {
  const toneClasses = {
    emerald: "text-emerald-300",
    indigo: "text-indigo-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className={`font-semibold ${toneClasses[tone]}`}>{value}</span>
    </div>
  );
}
