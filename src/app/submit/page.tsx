"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/db/supabaseClients";
import { submitSalary, type SalarySubmissionInput } from "@/lib/submissions";
import { HOUSEHOLD_PRESETS } from "@/lib/analysis/household";

export default function SubmitPage() {
  const { session, userId, enabled } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SalarySubmissionInput>({
    schoolName: "",
    city: "",
    country: "",
    role: "",
    year: new Date().getFullYear(),
    currency: "USD",
    monthlySalaryUsd: 0,
    taxRate: null,
    housing: "Allowance",
    flights: true,
    managementRole: false,
    tenureYears: null,
    package: {},
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!enabled || !session || !userId) {
      setError("Please sign in to submit data.");
      return;
    }
    const client = supabaseBrowser();
    if (!client) {
      setError("Database not configured.");
      return;
    }
    setBusy(true);
    const res = await submitSalary(client, userId, form);
    setBusy(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  const set = <K extends keyof SalarySubmissionInput>(k: K, v: SalarySubmissionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (!enabled) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Contribute your data</h1>
        <p className="mt-3 text-slate-400">
          Self-reporting is powered by Supabase auth, which isn&apos;t configured in this environment.
          Set the <code className="text-indigo-300">NEXT_PUBLIC_SUPABASE_*</code> env vars to enable submissions.
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Thank you!</h1>
        <p className="mt-3 text-slate-400">
          Your submission is pending review. Once approved you&apos;ll earn reputation points.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Contribute a salary record</h1>
      <p className="mt-2 text-sm text-slate-400">
        Self-reported data grows the dataset for everyone. Submissions are reviewed before they
        affect public stats, and earn reputation on approval.
      </p>

      {!session && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          Sign in (top right) before submitting. We use your verified email as your trust tier.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="School" className="col-span-2">
            <input className={inputCls} value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} required />
          </Field>
          <Field label="City">
            <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} required />
          </Field>
          <Field label="Country">
            <input className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} required />
          </Field>
          <Field label="Role">
            <input className={inputCls} value={form.role} onChange={(e) => set("role", e.target.value)} required />
          </Field>
          <Field label="Year">
            <input type="number" className={inputCls} value={form.year} onChange={(e) => set("year", Number(e.target.value))} required />
          </Field>
          <Field label="Monthly salary (USD equiv.)">
            <input type="number" className={inputCls} value={form.monthlySalaryUsd} onChange={(e) => set("monthlySalaryUsd", Number(e.target.value))} required />
          </Field>
          <Field label="Tax rate (%)">
            <input type="number" className={inputCls} value={form.taxRate ?? ""} onChange={(e) => set("taxRate", e.target.value === "" ? null : Number(e.target.value) / 100)} />
          </Field>
          <Field label="Housing">
            <select className={inputCls} value={form.housing} onChange={(e) => set("housing", e.target.value as SalarySubmissionInput["housing"])}>
              <option>None</option>
              <option>Allowance</option>
              <option>Provided</option>
            </select>
          </Field>
          <Field label="Flights covered">
            <select className={inputCls} value={String(form.flights)} onChange={(e) => set("flights", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          <Field label="Tenure (years)">
            <input type="number" className={inputCls} value={form.tenureYears ?? ""} onChange={(e) => set("tenureYears", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Management role">
            <select className={inputCls} value={String(form.managementRole)} onChange={(e) => set("managementRole", e.target.value === "true")}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>
        </div>

        <button
          type="submit"
          disabled={busy || !session}
          className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </form>

      <div className="mt-8 text-xs text-slate-500">
        Household presets for reference: {Object.values(HOUSEHOLD_PRESETS).map((p) => p.label).join(", ")}.
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}
