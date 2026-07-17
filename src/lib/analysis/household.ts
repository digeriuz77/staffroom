// Household archetypes: composable parameters + presets (Decision 3).
// Single teacher, Teaching couple, Trailing-spouse couple, Family — presets just
// fill parameters; downstream cost math scales from the raw counts.
import type { ChildEntry, Household } from "@/lib/db/types";

export const HOUSEHOLD_PRESETS: Record<string, { label: string; value: Household }> = {
  single: {
    label: "Single",
    value: { adults: 1, earningAdults: 1, children: [] },
  },
  teachingCouple: {
    label: "Teaching couple",
    value: { adults: 2, earningAdults: 2, children: [] },
  },
  trailingSpouse: {
    label: "Trailing spouse",
    value: { adults: 2, earningAdults: 1, children: [] },
  },
  family: {
    label: "Family",
    value: {
      adults: 2,
      earningAdults: 2,
      children: [
        { age: 8, schoolAge: true },
        { age: 5, schoolAge: true },
      ],
    },
  },
};

export function defaultHousehold(): Household {
  return HOUSEHOLD_PRESETS.single.value;
}

/** School-age children (used for dependent-education fees). */
export function feeChildren(h: Household): ChildEntry[] {
  return h.children.filter((c) => c.schoolAge);
}

/** Bedrooms needed: couple shares, children pair up. */
export function bedroomsNeeded(h: Household): number {
  const adultRooms = Math.ceil(h.adults / 2);
  const childRooms = Math.ceil(h.children.length / 2);
  return Math.max(1, adultRooms + childRooms);
}

/** People covered for flights. */
export function flightPersons(h: Household): number {
  return h.adults + h.children.length;
}

/** Earners (determines whether salary records stack for couples). */
export function earnerCount(h: Household): number {
  return Math.max(1, Math.min(h.earningAdults, h.adults));
}
