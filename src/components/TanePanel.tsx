"use client";

import { useEffect, useState } from "react";
import { HOUSEHOLD_PRESETS, defaultHousehold } from "@/lib/analysis/household";
import type { Household, ValuationBasis } from "@/lib/db/types";
import type { TaneComponent, TaneResult } from "@/lib/analysis/tane";
import { useCurrency } from "@/components/CurrencyProvider";

interface Props {
  slug: string;
  offerMonthlyUsd?: number;
}

const BASIS_LABEL: Record<ValuationBasis, string> = {
  face: "Face value",
  market: "Market value",
};

const COMPONENT_LABEL: Record<string, string> = {
  base: "Base salary (net)",
  housing: "Housing",
  flights: "Flights",
  fees: "Dependent fees",
  gratuity: "Gratuity",
  relocation: "Relocation",
  healthcare: "Healthcare",
  bonus: "Bonus / PD",
};

export function TanePanel({ slug, offerMonthlyUsd }: Props) {
  const [household, setHousehold] = useState<Household>(defaultHousehold());
  const { currency } = useCurrency();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">Total package (TANE)</h2>
      <p className="mb-4 text-sm text-slate-400">
        Total Annual Net Equivalent — base + housing + flights + fees + benefits, scaled to your household.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(HOUSEHOLD_PRESETS).map(([key, preset]) => {
          const active = JSON.stringify(preset.value) === JSON.stringify(household);
          return (
            <button
              key={key}
              onClick={() => setHousehold(preset.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <HouseholdEditor household={household} onChange={setHousehold} />

      <TaneResults
        key={`${slug}|${offerMonthlyUsd ?? ""}|${currency}|${JSON.stringify(household)}`}
        slug={slug}
        household={household}
        offerMonthlyUsd={offerMonthlyUsd}
      />
    </section>
  );
}

function TaneResults({
  slug,
  household,
  offerMonthlyUsd,
}: {
  slug: string;
  household: Household;
  offerMonthlyUsd?: number;
}) {
  const [result, setResult] = useState<{ tane: TaneResult; offerTane: TaneResult | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { format, currency } = useCurrency();

  useEffect(() => {
    let active = true;
    fetch("/api/tane", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, household, offerMonthlyUsd }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("compute failed"))))
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, household, offerMonthlyUsd, currency]);

  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">Computing…</p>;
  }
  if (error) {
    return <p className="mt-4 text-sm text-rose-400">{error}</p>;
  }
  if (!result) return null;

  return (
    <>
      <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
        <p className="text-xs text-slate-400">TANE (representative package)</p>
        <p className="text-2xl font-bold text-indigo-300">{format(result.tane.totalMonthlyUsd)}/mo</p>
        <p className="text-xs text-slate-500">{format(result.tane.totalAnnualUsd)}/yr · {currency} (display)</p>
      </div>

      {result.offerTane && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-400">Your offer TANE</p>
          <p className="text-xl font-bold text-white">{format(result.offerTane.totalMonthlyUsd)}/mo</p>
          <p className="text-xs text-slate-500">{format(result.offerTane.totalAnnualUsd)}/yr</p>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        {result.tane.components.map((c) => (
          <ComponentRow key={c.key} c={c} format={format} />
        ))}
      </div>
    </>
  );
}

function ComponentRow({ c, format }: { c: TaneComponent; format: (usd: number, compact?: boolean) => string }) {
  const total = c.amountAnnualUsd;
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
      <div>
        <span className="text-slate-300">{COMPONENT_LABEL[c.key] ?? c.key}</span>
        <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">{BASIS_LABEL[c.valuationBasis]}</span>
      </div>
      <span className="font-semibold text-white">{format(total, true)}/yr</span>
    </div>
  );
}

function HouseholdEditor({
  household,
  onChange,
}: {
  household: Household;
  onChange: (h: Household) => void;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
      <div className="flex flex-wrap gap-4">
        <Stepper
          label="Adults"
          value={household.adults}
          min={1}
          max={4}
          onChange={(v) => onChange({ ...household, adults: v, earningAdults: Math.min(v, household.earningAdults) })}
        />
        <Stepper
          label="Earners"
          value={household.earningAdults}
          min={1}
          max={household.adults}
          onChange={(v) => onChange({ ...household, earningAdults: v })}
        />
        <Stepper
          label="Children"
          value={household.children.length}
          min={0}
          max={6}
          onChange={(v) => {
            const children = Array.from({ length: v }, (_, i) =>
              household.children[i] ?? { age: 6, schoolAge: true },
            );
            onChange({ ...household, children });
          }}
        />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-6 w-6 rounded border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      >
        −
      </button>
      <span className="w-4 text-center font-semibold text-white">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-6 w-6 rounded border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      >
        +
      </button>
    </div>
  );
}
