"use client";

import { useEffect, useState } from "react";

export interface WatchedSchool {
  slug: string;
  name: string;
  city: string;
  country: string;
}

export function WatchlistButton({
  slug,
  name,
  city,
  country,
}: {
  slug: string;
  name: string;
  city: string;
  country: string;
}) {
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("staffroom_watchlist");
      if (stored) {
        const list: WatchedSchool[] = JSON.parse(stored);
        setIsWatched(list.some((s) => s.slug === slug));
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, [slug]);

  function toggleWatchlist() {
    try {
      const stored = localStorage.getItem("staffroom_watchlist");
      let list: WatchedSchool[] = stored ? JSON.parse(stored) : [];

      if (isWatched) {
        list = list.filter((s) => s.slug !== slug);
        setIsWatched(false);
      } else {
        list.push({ slug, name, city, country });
        setIsWatched(true);
      }
      localStorage.setItem("staffroom_watchlist", JSON.stringify(list));
    } catch {
      // Fallback
    }
  }

  return (
    <button
      onClick={toggleWatchlist}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
        isWatched
          ? "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
      }`}
    >
      <span>{isWatched ? "⭐" : "☆"}</span>
      <span>{isWatched ? "Watching" : "Watch School"}</span>
    </button>
  );
}
