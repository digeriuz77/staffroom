"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultHousehold } from "@/lib/analysis/household";
import type { Household } from "@/lib/db/types";

const STORAGE_KEY = "si.household";

/**
 * Persist the user's household composition to localStorage. No database
 * overhead — pragmatic for a low-usage MVP. When Supabase auth is live, the
 * profile.household column can be synced, but localStorage gives instant,
 * auth-free persistence.
 */
function readStoredHousehold(): Household {
  if (typeof window === "undefined") return defaultHousehold();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Household;
      if (parsed && typeof parsed.adults === "number") return parsed;
    }
  } catch {
    // Malformed JSON — use default.
  }
  return defaultHousehold();
}

export function useSavedHousehold() {
  // Lazy init reads from localStorage on the client; SSR uses default.
  // Hydration mismatch is hidden by the `loaded` gate in the component.
  const [household, setHouseholdState] = useState<Household>(readStoredHousehold);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Mark as loaded after mount — deferred to avoid synchronous setState.
    Promise.resolve().then(() => setLoaded(true));
  }, []);

  const setHousehold = useCallback((h: Household) => {
    setHouseholdState(h);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
    } catch {
      // Storage full or unavailable — non-critical.
    }
  }, []);

  return { household, setHousehold, loaded };
}
