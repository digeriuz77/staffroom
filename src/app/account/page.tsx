"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/db/supabaseClients";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none";

const CURRENCIES = ["USD", "GBP", "EUR", "AED", "SGD", "THB", "CNY", "HKD", "AUD"];

const PROFILE_KINDS: { value: string; label: string }[] = [
  { value: "teacher", label: "Teacher" },
  { value: "school_staff", label: "School staff" },
  { value: "recruiter", label: "Recruiter" },
];

interface ProfileRow {
  id: string;
  display_name: string | null;
  display_currency: string | null;
  reputation_points: number | null;
  role: string | null;
  profile_kind: string | null;
  bio: string | null;
  public_profile: boolean | null;
  created_at: string | null;
}

interface MembershipRow {
  id: string;
  school_id: string;
  member_role: string;
  verified: boolean;
}

interface MembershipView extends MembershipRow {
  schoolName: string;
}

interface SchoolResult {
  id?: string;
  slug: string;
  name: string;
  city: string;
  country: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function AccountPage() {
  const { session, userId, enabled, signOut } = useAuth();
  const client = useMemo(() => supabaseBrowser(), []);

  const [displayName, setDisplayName] = useState("");
  const [profileKind, setProfileKind] = useState("teacher");
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(false);
  const [stats, setStats] = useState<{ reputation: number; role: string; memberSince: string | null } | null>(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [memberships, setMemberships] = useState<MembershipView[]>([]);
  const [membershipMsg, setMembershipMsg] = useState<string | null>(null);

  const loadMemberships = useCallback(async () => {
    if (!client || !userId) return;
    const { data: memberRows } = await client
      .from("school_members")
      .select("id,school_id,member_role,verified")
      .eq("user_id", userId);
    const rows = (memberRows ?? []) as MembershipRow[];
    if (rows.length === 0) {
      setMemberships([]);
      return;
    }
    const { data: schoolRows } = await client
      .from("schools")
      .select("id,name")
      .in("id", rows.map((r) => r.school_id));
    const nameById = new Map(
      ((schoolRows ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]),
    );
    setMemberships(rows.map((r) => ({ ...r, schoolName: nameById.get(r.school_id) ?? "Unknown school" })));
  }, [client, userId]);

  useEffect(() => {
    if (!client || !userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const profile = data as ProfileRow | null;
      if (cancelled || !profile) return;
      setDisplayName(profile.display_name ?? "");
      setProfileKind(profile.profile_kind ?? "teacher");
      setDisplayCurrency(profile.display_currency ?? "USD");
      setBio(profile.bio ?? "");
      setPublicProfile(Boolean(profile.public_profile));
      setStats({
        reputation: profile.reputation_points ?? 0,
        role: profile.role ?? "member",
        memberSince: profile.created_at,
      });
    })();
    loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [client, userId, loadMemberships]);

  async function saveProfile() {
    if (!client || !userId) return;
    setSaveBusy(true);
    setSaveMsg(null);
    const { error } = await client
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        profile_kind: profileKind,
        display_currency: displayCurrency,
        bio: bio.trim() || null,
        public_profile: publicProfile,
      })
      .eq("id", userId);
    setSaveBusy(false);
    setSaveMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Profile saved." });
  }

  async function searchSchools() {
    if (!schoolQuery.trim()) return;
    setSearchLoading(true);
    setMembershipMsg(null);
    try {
      const res = await fetch(`/api/schools?q=${encodeURIComponent(schoolQuery)}`);
      const data = await res.json();
      const results = ((data.schools ?? []) as SchoolResult[]).filter((s) => Boolean(s.id));
      setSchoolResults(results);
      if (results.length === 0) setMembershipMsg("No matching schools found.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function addMembership(school: SchoolResult) {
    if (!client || !userId || !school.id) return;
    setMembershipMsg(null);
    const { error } = await client
      .from("school_members")
      .insert({ school_id: school.id, user_id: userId });
    if (error) {
      setMembershipMsg(
        error.code === "23505" ? "You already added this school." : error.message,
      );
    } else {
      setSchoolResults([]);
      setSchoolQuery("");
      await loadMemberships();
    }
  }

  async function removeMembership(membershipId: string) {
    if (!client || !userId) return;
    await client.from("school_members").delete().eq("id", membershipId).eq("user_id", userId);
    await loadMemberships();
  }

  if (!enabled) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Your account</h1>
        <p className="mt-3 text-slate-400">
          Accounts require Supabase auth. Set the <code className="text-indigo-300">NEXT_PUBLIC_SUPABASE_*</code> env vars to enable.
        </p>
      </main>
    );
  }

  if (!session || !userId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold text-white">Your account</h1>
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          Sign in (top right) to manage your profile and school affiliation.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Your account</h1>
      <p className="mt-2 text-sm text-slate-400">
        Manage how you appear to the community and which school you&apos;re affiliated with.
      </p>

      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-slate-500">Reputation</p>
            <p className="mt-1 text-lg font-bold text-white">{stats.reputation}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-slate-500">Role</p>
            <p className="mt-1 text-lg font-bold capitalize text-white">{stats.role}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-slate-500">Member since</p>
            <p className="mt-1 text-lg font-bold text-white">
              {stats.memberSince
                ? new Date(stats.memberSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Watched Schools Section */}
      <WatchedSchoolsList />

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-sm font-semibold text-white">Profile</p>
        <div className="space-y-3">
          <Field label="Display name">
            <input
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear on the site"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="I am a...">
              <select className={inputCls} value={profileKind} onChange={(e) => setProfileKind(e.target.value)}>
                {PROFILE_KINDS.map((k) => (
                  <option key={k.value} value={k.value} className="bg-[#0c0f17]">{k.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Display currency">
              <select className={inputCls} value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0c0f17]">{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Bio">
            <textarea
              className={inputCls}
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short intro (max 500 characters)"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={publicProfile}
              onChange={(e) => setPublicProfile(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-indigo-500"
            />
            Show my display name on the public leaderboard
          </label>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saveBusy}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {saveBusy ? "Saving…" : "Save profile"}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.ok ? "text-emerald-300" : "text-rose-400"}`}>{saveMsg.text}</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-1 text-sm font-semibold text-white">School affiliation</p>
        <p className="mb-3 text-xs text-slate-500">
          Link your school to post as staff. New affiliations are marked pending until verified by a moderator.
        </p>

        {memberships.length > 0 && (
          <div className="mb-4 space-y-2">
            {memberships.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white">{m.schoolName}</p>
                  {!m.verified && (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                      verification pending
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMembership(m.id)}
                  className="text-xs text-slate-400 transition hover:text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            className={inputCls}
            value={schoolQuery}
            onChange={(e) => setSchoolQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchSchools())}
            placeholder="Search for your school..."
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
                onClick={() => addMembership(s)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-left transition hover:border-indigo-400/30"
              >
                <div>
                  <p className="text-sm text-white">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.city}, {s.country}</p>
                </div>
                <span className="text-xs text-indigo-300">Add</span>
              </button>
            ))}
          </div>
        )}
        {membershipMsg && <p className="mt-2 text-xs text-rose-400">{membershipMsg}</p>}
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mt-8 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </main>
  );
}

function WatchedSchoolsList() {
  const [list, setList] = useState<{ slug: string; name: string; city: string; country: string }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("staffroom_watchlist");
      if (stored) setList(JSON.parse(stored));
    } catch {
      // Ignore errors
    }
  }, []);

  function removeWatch(slug: string) {
    const updated = list.filter((s) => s.slug !== slug);
    setList(updated);
    localStorage.setItem("staffroom_watchlist", JSON.stringify(updated));
  }

  if (list.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">⭐ My Watched Schools ({list.length})</p>
        <span className="text-xs text-amber-300">Saved to Watchlist</span>
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.slug} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm">
            <div>
              <Link href={`/school/${s.slug}`} className="font-semibold text-white hover:text-indigo-300 transition">
                {s.name}
              </Link>
              <p className="text-xs text-slate-400">{s.city}, {s.country}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/school/${s.slug}`} className="text-xs text-indigo-400 hover:text-indigo-200">
                View Report →
              </Link>
              <button
                type="button"
                onClick={() => removeWatch(s.slug)}
                className="text-xs text-slate-500 hover:text-rose-400"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
