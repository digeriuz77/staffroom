"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function FlagPostButton({ postId }: { postId: string }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Please give a short reason (at least 3 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/board/flag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ postId, reason: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not report post");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not report post");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return <p className="text-xs text-slate-500">Sign in to report this post.</p>;
  }

  if (done) {
    return <p className="text-xs text-slate-400">Thanks — this post has been reported for review.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 transition hover:text-rose-300"
      >
        Report this post
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Why should this post be reviewed?"
          className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
        >
          {busy ? "Reporting…" : "Report"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
