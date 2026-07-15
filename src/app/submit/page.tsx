"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function SubmitPage() {
  const { session, userId, enabled } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // School selection state.
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<{ slug: string; name: string; city: string; country: string; salaryCount: number }[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<{ schoolId?: string; name: string; city: string; country: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Salary form state.
  const [role, setRole] = useState("");
  const [isManagement, setIsManagement] = useState(false);
  const [salary, setSalary] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [housing, setHousing] = useState<"None" | "Allowance" | "Provided">("Allowance");
  const [flights, setFlights] = useState(true);
  const [taxRate, setTaxRate] = useState("");

  async function searchSchools() {
    if (!schoolQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/schools?q=${encodeURIComponent(schoolQuery)}`);
      const data = await res.json();
      setSchoolResults(data.schools ?? []);
    } finally {
      setSearchLoading(false);
    }
  }

  const fx: Record<string, number> = {
    USD: 1, GBP: 1.27, AED: 0.272, EUR: 1.08, SGD: 0.74, CNY: 0.138, THB: 0.028,
    QAR: 0.275, SAR: 0.267, INR: 0.012, AUD: 0.713, HKD: 0.128,
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!enabled || !session || !userId) {
      setError("Please sign in to submit data.");
      return;
    }

    const num = Number(salary.replace(/[^0-9.]/g, ""));
    if (!num || num < 100) {
      setError("Enter a valid salary amount.");
      return;
    }

    // Convert to monthly USD.
    const usd = num * (fx[currency] ?? 1);
    const monthlyUsd = period === "year" ? usd / 12 : usd;

    setBusy(true);
    try {
      const res = await fetch("/api/submit-salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          schoolId: selectedSchool?.schoolId,
          schoolName: selectedSchool?.name ?? schoolQuery,
          city: selectedSchool?.city ?? "",
          country: selectedSchool?.country ?? "",
          role: role || "Teacher",
          managementRole: isManagement,
          year: new Date().getFullYear(),
          currency: "USD",
          monthlySalaryUsd: Math.round(monthlyUsd),
          taxRate: taxRate ? Number(taxRate) / 100 : null,
          housing,
          flights,
          tenureYears: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Contribute your data</h1>
        <p className="mt-3 text-slate-400">
          Submissions require Supabase auth. Set the <code className="text-indigo-300">NEXT_PUBLIC_SUPABASE_*</code> env vars to enable.
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Thank you!</h1>
        <p className="mt-3 text-slate-400">
          Your submission is pending review. Once approved it appears on the school&apos;s report page
          and you&apos;ll earn reputation points.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Contribute a salary record</h1>
      <p className="mt-2 text-sm text-slate-400">
        Help build the dataset. Find your school, enter the offer details, and we&apos;ll attach it
        to that school&apos;s growing record.
      </p>

      {!session && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          Sign in (top right) before submitting.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        {/* Step 1: Find the school */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-1 text-sm font-semibold text-white">1. Find your school</p>
          <p className="mb-3 text-xs text-slate-500">
            Search so your data attaches to the right school — no duplicates.
          </p>

          {selectedSchool ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{selectedSchool.name}</p>
                <p className="text-xs text-slate-400">{selectedSchool.city}, {selectedSchool.country}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchool(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchSchools())}
                  placeholder="School name, city or country..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
                />
                <button
                  type="button"
                  onClick={searchSchools}
                  disabled={searchLoading}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
                >
                  {searchLoading ? "..." : "Search"}
                </button>
              </div>
              {schoolResults.length > 0 && (
                <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                  {schoolResults.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        setSelectedSchool({ name: s.name, city: s.city, country: s.country });
                        setSchoolResults([]);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-left transition hover:border-indigo-400/30"
                    >
                      <div>
                        <p className="text-sm text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.city}, {s.country} · {s.salaryCount} records</p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedSchool({ name: schoolQuery, city: "", country: "" })}
                    className="w-full rounded-lg border border-dashed border-white/10 px-4 py-2 text-center text-xs text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-300"
                  >
                    + My school isn&apos;t listed — add &ldquo;{schoolQuery}&rdquo;
                  </button>
                </div>
              )}
              {schoolResults.length === 0 && schoolQuery && !searchLoading && (
                <button
                  type="button"
                  onClick={() => setSelectedSchool({ name: schoolQuery, city: "", country: "" })}
                  className="mt-2 w-full rounded-lg border border-dashed border-white/10 px-4 py-2 text-center text-xs text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-300"
                >
                  + Add &ldquo;{schoolQuery}&rdquo; as a new school
                </button>
              )}
            </>
          )}
        </div>

        {/* Step 2: Salary details */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm font-semibold text-white">2. Offer details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" className="col-span-2">
              <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Primary Teacher, Head of Maths" />
            </Field>
            <Field label="Management role?">
              <select className={inputCls} value={String(isManagement)} onChange={(e) => setIsManagement(e.target.value === "true")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            <Field label="Tax rate (%)">
              <input className={inputCls} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g. 0 or 20" />
            </Field>
            <Field label="Currency">
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["USD", "GBP", "EUR", "AED", "SAR", "QAR", "SGD", "THB", "CNY", "HKD", "AUD", "INR"].map((c) => (
                  <option key={c} value={c} className="bg-[#0c0f17]">{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Period">
              <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value as "month" | "year")}>
                <option value="month" className="bg-[#0c0f17]">Per month</option>
                <option value="year" className="bg-[#0c0f17]">Per year</option>
              </select>
            </Field>
            <Field label="Salary amount" className="col-span-2">
              <input className={inputCls} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 4500" type="number" />
            </Field>
            <Field label="Housing">
              <select className={inputCls} value={housing} onChange={(e) => setHousing(e.target.value as "None" | "Allowance" | "Provided")}>
                <option value="None" className="bg-[#0c0f17]">None</option>
                <option value="Allowance" className="bg-[#0c0f17]">Allowance</option>
                <option value="Provided" className="bg-[#0c0f17]">Provided</option>
              </select>
            </Field>
            <Field label="Flights included?">
              <select className={inputCls} value={String(flights)} onChange={(e) => setFlights(e.target.value === "true")}>
                <option value="true" className="bg-[#0c0f17]">Yes</option>
                <option value="false" className="bg-[#0c0f17]">No</option>
              </select>
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !session || !selectedSchool}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </form>
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
