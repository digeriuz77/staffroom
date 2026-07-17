"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

const STORAGE_KEY = "si.compare-tray";
const MAX_SCHOOLS = 3;

export interface TrayEntry {
  slug: string;
  name: string;
  city: string;
  country: string;
}

function readTray(): TrayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_SCHOOLS);
  } catch {
    // malformed
  }
  return [];
}

function writeTray(entries: TrayEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event("si-compare-tray-changed"));
  } catch {
    // storage unavailable
  }
}

export function addToTray(entry: TrayEntry): { added: boolean; full: boolean } {
  const tray = readTray();
  if (tray.some((t) => t.slug === entry.slug)) return { added: false, full: false };
  if (tray.length >= MAX_SCHOOLS) return { added: false, full: true };
  writeTray([...tray, entry]);
  return { added: true, full: false };
}

export function removeFromTray(slug: string) {
  writeTray(readTray().filter((t) => t.slug !== slug));
}

export function CompareTray() {
  const [tray, setTray] = useState<TrayEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
      setTray(readTray());
    });
    const handler = () => setTray(readTray());
    window.addEventListener("si-compare-tray-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("si-compare-tray-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const remove = useCallback((slug: string) => {
    removeFromTray(slug);
    setTray(readTray());
  }, []);

  if (!mounted || tray.length === 0) return null;

  const compareUrl = `/compare?schools=${tray.map((t) => t.slug).join(",")}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0d15]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Compare ({tray.length}/{MAX_SCHOOLS})
        </span>
        <div className="flex flex-1 flex-wrap gap-2">
          {tray.map((t) => (
            <div
              key={t.slug}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-white">{t.name}</span>
              <span className="text-slate-500">{t.city}</span>
              <button
                onClick={() => remove(t.slug)}
                className="text-slate-500 transition hover:text-rose-400"
                aria-label={`Remove ${t.name} from comparison`}
              >
                x
              </button>
            </div>
          ))}
        </div>
        <Link
          href={compareUrl}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Compare {tray.length > 1 ? `${tray.length} schools` : "this school"}
          <ArrowIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
