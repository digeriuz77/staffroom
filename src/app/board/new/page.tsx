"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none";

const ROLE_TYPES = ["Teacher", "Head of Department", "Leadership", "Counselor", "Librarian", "Other"];

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function NewBoardPostPage() {
  const router = useRouter();
  const { session, enabled } = useAuth();

  const [formToken, setFormToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [roleType, setRoleType] = useState("Teacher");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/board/token");
        const data = await res.json();
        if (!cancelled && typeof data.token === "string") setFormToken(data.token);
      } catch {
        if (!cancelled) setError("Could not initialise the form. Refresh and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!session) {
      setError("Please sign in to post a job.");
      return;
    }
    if (!formToken) {
      setError("The form is still loading. Try again in a moment.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          body,
          schoolName,
          city: city || undefined,
          country,
          roleType,
          salaryMinUsd: salaryMin ? Number(salaryMin) : undefined,
          salaryMaxUsd: salaryMax ? Number(salaryMax) : undefined,
          currency: "USD",
          applyUrl: applyUrl || undefined,
          contactEmail: contactEmail || undefined,
          website,
          formToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit post");
      router.push("/board");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Post a job</h1>
        <p className="mt-3 text-slate-400">
          Posting requires Supabase auth. Set the <code className="text-indigo-300">NEXT_PUBLIC_SUPABASE_*</code> env vars to enable.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Post a job</h1>
      <p className="mt-2 text-sm text-slate-400">
        Share an open position with the community. Posts stay live for 60 days.
      </p>

      {!session && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          Sign in (top right) before posting.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm font-semibold text-white">1. The position</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Job title" className="col-span-2">
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Primary Homeroom Teacher (Aug 2027 start)"
                maxLength={140}
              />
            </Field>
            <Field label="School name" className="col-span-2">
              <input
                className={inputCls}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. International School of Bangkok"
              />
            </Field>
            <Field label="Country">
              <input
                className={inputCls}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Thailand"
              />
            </Field>
            <Field label="City (optional)">
              <input
                className={inputCls}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangkok"
              />
            </Field>
            <Field label="Role type" className="col-span-2">
              <select className={inputCls} value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                {ROLE_TYPES.map((r) => (
                  <option key={r} value={r} className="bg-[#0c0f17]">{r}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm font-semibold text-white">2. Salary (optional)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Minimum (USD/month)">
              <input
                className={inputCls}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g. 2400"
                type="number"
                min={0}
              />
            </Field>
            <Field label="Maximum (USD/month)">
              <input
                className={inputCls}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="e.g. 3100"
                type="number"
                min={0}
              />
            </Field>
            <Field label="Currency">
              <input className={inputCls} value="USD" disabled readOnly />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm font-semibold text-white">3. How to apply</p>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Apply URL (optional)">
              <input
                className={inputCls}
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Contact email (optional)">
              <input
                className={inputCls}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="recruitment@school.org"
                type="email"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-1 text-sm font-semibold text-white">4. Description</p>
          <p className="mb-3 text-xs text-slate-500">
            At least 40 characters. Include start date, curriculum, package details. No more than 3 links.
          </p>
          <textarea
            className={inputCls}
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the role, the school and the package..."
            maxLength={8000}
          />
        </div>

        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !session || !formToken}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post to the board"}
        </button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </form>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-semibold text-white">Community rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Real, current vacancies only.</li>
          <li>Agencies and recruiters must disclose who they are.</li>
          <li>Limit of 5 posts per day.</li>
          <li>Flagged posts are reviewed and may be removed.</li>
        </ul>
      </div>
    </main>
  );
}
