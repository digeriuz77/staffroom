"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const CONSENT_KEY = "si.cookie-consent";
export type ConsentChoice = "accepted" | "declined";

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

/**
 * One-time consent banner. Currently covers only device-storage preferences
 * (watchlist, compare tray, theme, currency); when Google AdSense is enabled
 * it will also gate the ad script — ads load only after "Accept".
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      Promise.resolve().then(() => setVisible(true));
    }
  }, []);

  function choose(choice: ConsentChoice) {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Storage unavailable — just dismiss for this session
    }
    setVisible(false);
    window.dispatchEvent(new CustomEvent("si-consent-changed", { detail: choice }));
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-4">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-[#0c0f17]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-300">
          Staffroom Intel stores a few preferences (watchlist, compare tray, theme, currency) in your
          browser&apos;s local storage — nothing is tracked and no analytics cookies are used. If ads are
          enabled in future, they will only load with your consent.{" "}
          <Link href="/privacy" className="font-medium text-indigo-300 hover:text-indigo-200">
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => choose("declined")}
            className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Decline
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-lg bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
