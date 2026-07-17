"use client";

import { useState, useEffect } from "react";
import { addToTray } from "@/components/CompareTray";

interface Props {
  slug: string;
  name: string;
  city: string;
  country: string;
}

export function CompareButton({ slug, name, city, country }: Props) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "full">("idle");

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 opacity-50">
        Add to comparison
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const result = addToTray({ slug, name, city, country });
        setStatus(result.added ? "added" : result.full ? "full" : "added");
        if (result.added) {
          setTimeout(() => setStatus("idle"), 2000);
        }
      }}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        status === "added"
          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
          : status === "full"
            ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
            : "border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
      }`}
    >
      {status === "added"
        ? "Added to tray"
        : status === "full"
          ? "Tray full (3 max)"
          : "+ Add to comparison"}
    </button>
  );
}
