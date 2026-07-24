import type { Metadata } from "next";
import { PurchasingPowerTool } from "@/components/PurchasingPowerTool";
import { SavingsCalculator } from "@/components/SavingsCalculator";
import { getColItems } from "@/lib/db/repo";

export const metadata: Metadata = {
  title: "Purchasing Power & Savings Calculator — Staffroom Intel",
  description: "Calculate household monthly savings potential and compare what your international teaching salary is worth across cities.",
};

export const dynamic = "force-dynamic";

export default async function PurchasingPowerPage() {
  const colItems = await getColItems();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Purchasing Power &amp; Savings Calculator</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          A high salary means little if the city is expensive. Calculate your household monthly savings potential,
          or compare real buying power across <span className="text-slate-300">60+ cities</span> worldwide.
        </p>
      </header>

      <SavingsCalculator colItems={colItems} />

      <PurchasingPowerTool />
    </main>
  );
}
