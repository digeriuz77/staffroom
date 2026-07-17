"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  convertUsd,
  currencySymbol,
  formatCurrency,
  popularCurrencies,
} from "@/lib/finance/currency";

interface CurrencyContextValue {
  currency: string;
  rates: Record<string, number>;
  ready: boolean;
  setCurrency: (c: string) => void;
  format: (usd: number, compact?: boolean) => string;
  convert: (usd: number) => number;
  symbol: string;
  currencies: string[];
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  rates: { USD: 1 },
  ready: false,
  setCurrency: () => {},
  format: (usd) => `$${Math.round(usd).toLocaleString("en-US")}`,
  convert: (usd) => usd,
  symbol: "$",
  currencies: popularCurrencies(),
});

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

const STORAGE_KEY = "si.displayCurrency";

function readStoredCurrency(): string {
  if (typeof window === "undefined") return "USD";
  return localStorage.getItem(STORAGE_KEY) ?? "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(readStoredCurrency);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates,
      ready,
      setCurrency,
      format: (usd, compact) => formatCurrency(usd, currency, rates, compact),
      convert: (usd) => convertUsd(usd, currency, rates),
      symbol: currencySymbol(currency),
      currencies: popularCurrencies(),
    }),
    [currency, rates, ready, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function CurrencyPicker() {
  const { currency, setCurrency, currencies, ready } = useCurrency();
  if (!ready) return null;
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      aria-label="Display currency"
      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-400/40 focus:outline-none"
    >
      {currencies.map((c) => (
        <option key={c} value={c} className="bg-[#0c0f17]">
          {c}
        </option>
      ))}
    </select>
  );
}
