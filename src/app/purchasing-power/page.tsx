import type { Metadata } from "next";
import { PurchasingPowerTool } from "@/components/PurchasingPowerTool";

export const metadata: Metadata = {
  title: "Purchasing Power Tool — Staffroom Intel",
  description: "Compare what your international teaching salary is really worth across cities. See buying power, savings and everyday prices.",
};

export default function PurchasingPowerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Purchasing power tool</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          A high salary means little if the city is expensive. Enter your salary and compare real buying power,
          estimated savings and everyday prices across {""}
          <span className="text-slate-300">60+ cities</span> worldwide.
        </p>
      </header>
      <PurchasingPowerTool />
    </main>
  );
}
