"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function AuthButton() {
  const { session, loading, enabled, signInWithGoogle, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  if (loading) {
    return (
      <span className="text-xs text-slate-500">…</span>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20"
        >
          Admin
        </Link>
        <Link
          href="/account"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
        >
          Account
        </Link>
        <button
          onClick={() => signOut()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0c0f17] p-3 shadow-xl">
          <button
            onClick={() => signInWithGoogle()}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Continue with Google
          </button>
          <div className="my-2 text-center text-[10px] uppercase tracking-wider text-slate-600">or</div>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
          />
          <button
            onClick={async () => {
              setError(null);
              const { error } = await signInWithEmail(email);
              if (error) setError(error);
              else setSent(true);
            }}
            className="mt-2 w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            Send magic link
          </button>
          {sent && <p className="mt-2 text-xs text-emerald-400">Check your inbox for the link.</p>}
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
