"use client";

import { useMemo, useState } from "react";
import { COST_OF_LIVING } from "@/lib/data/costOfLiving";
import { monthlyLivingCostUsd } from "@/lib/data/costOfLiving";
import type { ColItem } from "@/lib/types";
import { formatUsd } from "@/lib/analysis/finance";

const PRICE_FIELDS: { key: keyof ColItem; label: string; icon: string }[] = [
  { key: "milk", label: "Milk (1L)", icon: "🥛" },
  { key: "beer", label: "Beer", icon: "🍺" },
  { key: "meal", label: "Meal out", icon: "🍽️" },
  { key: "takeaway", label: "Takeaway", icon: "🥡" },
  { key: "gym", label: "Gym /mo", icon: "💪" },
  { key: "taxi", label: "Taxi fare", icon: "🚕" },
];

export function PurchasingPowerTool() {
  const [salary, setSalary] = useState(4000);
  const [primary, setPrimary] = useState<ColItem | null>(COST_OF_LIVING.find((c) => c.city === "London") ?? null);
  const [secondary, setSecondary] = useState<ColItem | null>(COST_OF_LIVING.find((c) => c.city === "Bangkok") ?? null);

  const ranked = useMemo(() => {
    return [...COST_OF_LIVING]
      .map((c) => {
        const pp = (salary / c.colIndex) * 100;
        const livingCost = monthlyLivingCostUsd(c);
        const net = salary * 0.8;
        const savings = net - livingCost;
        return { city: c, buyingPower: pp, savings };
      })
      .sort((a, b) => b.buyingPower - a.buyingPower);
  }, [salary]);

  const maxPp = ranked[0]?.buyingPower ?? 1;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <label className="block text-sm font-medium text-white">Your gross monthly salary (USD)</label>
        <div className="mt-2 flex items-center gap-4">
          <input
            type="range"
            min={1000}
            max={25000}
            step={100}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value) || 0)}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-right text-white outline-none focus:border-indigo-400/50"
            />
            <span className="text-sm text-slate-500">/mo</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CityPicker label="Primary city" value={primary} onChange={setPrimary} />
          <CityPicker label="Compare against" value={secondary} onChange={setSecondary} />
        </div>
      </div>

      {primary && secondary && (
        <div className="grid gap-4 md:grid-cols-2">
          <CityCard city={primary} salary={salary} />
          <CityCard city={secondary} salary={salary} />
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">Where does {formatUsd(salary)}/mo go furthest?</h2>
        <p className="mb-5 text-sm text-slate-400">Ranked by purchasing power (salary ÷ cost-of-living index)</p>
        <div className="space-y-2.5">
          {ranked.slice(0, 15).map(({ city, buyingPower, savings }) => (
            <div key={city.city} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-slate-300">{city.city}</span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-white/5">
                <div
                  className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-indigo-500/70 to-fuchsia-500/70 px-2"
                  style={{ width: `${Math.max(8, (buyingPower / maxPp) * 100)}%` }}
                >
                  <span className="text-xs font-semibold text-white">{formatUsd(buyingPower, true)}</span>
                </div>
              </div>
              <span className={`w-20 shrink-0 text-right text-xs ${savings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {savings >= 0 ? "+" : ""}{formatUsd(savings, true)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CityPicker({ label, value, onChange }: { label: string; value: ColItem | null; onChange: (c: ColItem) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <select
        value={value?.city ?? ""}
        onChange={(e) => {
          const c = COST_OF_LIVING.find((x) => x.city === e.target.value);
          if (c) onChange(c);
        }}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50"
      >
        {COST_OF_LIVING.map((c) => (
          <option key={c.city} value={c.city} className="bg-[#0b0e16]">
            {c.city}, {c.country}
          </option>
        ))}
      </select>
    </div>
  );
}

function CityCard({ city, salary }: { city: ColItem; salary: number }) {
  const buyingPower = (salary / city.colIndex) * 100;
  const livingCost = monthlyLivingCostUsd(city);
  const net = salary * 0.8;
  const savings = net - livingCost;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-base font-semibold text-white">{city.city}</h3>
      <p className="text-xs text-slate-500">{city.country} · COL {city.colIndex}</p>

      <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
        <p className="text-xs text-slate-400">Purchasing power</p>
        <p className="text-2xl font-bold text-indigo-300">{formatUsd(buyingPower)}/mo</p>
        <p className="text-xs text-slate-500">≈ {Math.round(buyingPower / salary * 100)}% of nominal salary</p>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <Row label="Est. net take-home" value={formatUsd(net)} />
        <Row label="Est. monthly living cost" value={formatUsd(livingCost)} />
        <Row label="Est. monthly savings" value={formatUsd(savings)} highlight={savings >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="mb-2 text-xs text-slate-500">Everyday prices</p>
        <div className="grid grid-cols-3 gap-2">
          {PRICE_FIELDS.map(({ key, label, icon }) => (
            <div key={key} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-center">
              <p className="text-base leading-none">{icon}</p>
              <p className="mt-1 text-sm font-semibold text-white">${Number(city[key]).toFixed(Number(city[key]) < 10 ? 2 : 0)}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "good" | "bad" }) {
  const color = highlight === "good" ? "text-emerald-400" : highlight === "bad" ? "text-rose-400" : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
