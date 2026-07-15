"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  currentOffer?: number;
}

const CURRENCIES = ["USD", "GBP", "EUR", "AED", "SAR", "QAR", "SGD", "THB", "CNY", "HKD", "AUD", "INR"];

const FX: Record<string, number> = {
  USD: 1, GBP: 1.27, AED: 0.272, EUR: 1.08, SGD: 0.74, CNY: 0.138, THB: 0.028,
  QAR: 0.275, SAR: 0.267, INR: 0.012, AUD: 0.713, HKD: 0.128, JPY: 0.0062,
};

export function OfferInput({ slug, currentOffer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentOffer ? String(Math.round(currentOffer)) : "");
  const [currency, setCurrency] = useState("USD");
  const [period, setPeriod] = useState<"month" | "year">("month");

  function submit() {
    const num = Number(amount.replace(/[^0-9.]/g, ""));
    if (!num || num < 100) return;
    const usd = num * (FX[currency] ?? 1);
    const monthlyUsd = period === "year" ? Math.round(usd / 12) : Math.round(usd);
    router.push(`/school/${slug}?offer=${monthlyUsd}`);
  }

  if (currentOffer) {
    // Offer already in URL — show a "change offer" toggle.
    if (!open) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-indigo-400 transition hover:text-indigo-300"
        >
          ← Evaluate a different offer
        </button>
      );
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-medium text-white">Enter an offer to evaluate</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white outline-none focus:border-indigo-400/50"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c} className="bg-[#0c0f17]">{c}</option>
          ))}
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Amount"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
        />
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          <button
            onClick={() => setPeriod("month")}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${period === "month" ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400"}`}
          >
            /mo
          </button>
          <button
            onClick={() => setPeriod("year")}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${period === "year" ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400"}`}
          >
            /yr
          </button>
        </div>
        <button
          onClick={submit}
          disabled={!amount || Number(amount.replace(/[^0-9.]/g, "")) < 100}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          Evaluate
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        We convert to monthly USD using recent exchange rates for comparison.
      </p>
    </div>
  );
}
