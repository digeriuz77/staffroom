// School resolution: ensure submissions attach to ONE school entry, not
// duplicates. Fuzzy-matches name + city + country to an existing school; if
// no match, creates a new school row (deduplicated by slug).
//
// This is the core dedup mechanism: "British School Dubai" submitted 5 times
// by 5 different users all resolve to the same school_id.

import { supabaseServer } from "@/lib/db/supabaseClients";
import type { SchoolRow } from "@/lib/db/types";
import { slugify } from "@/lib/data/schools";
import { codeOfCountry, regionOfCountry } from "@/lib/data/geo";
import type { CurriculumTag, Region } from "@/lib/types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Resolve a school by fuzzy-matching name + city + country against existing
 * schools in the database. Returns the school_id, or null if Supabase isn't
 * configured (TSV fallback — submissions aren't available in that mode).
 *
 * Matching strategy:
 * 1. Exact slug match (deterministic dedup)
 * 2. Fuzzy: normalize name tokens + city, score against existing schools
 * 3. If no match above threshold → create a new school row
 */
export async function resolveSchool(
  schoolName: string,
  city: string,
  country: string,
): Promise<{ schoolId: string | null; slug: string; isNew: boolean } | null> {
  const client = supabaseServer();
  if (!client) return null;

  const name = schoolName.trim();
  const cityName = city.trim();
  const countryName = country.trim();
  const slug = slugify(`${name} ${cityName} ${countryName}`);

  // 1. Try exact slug match first (the deterministic dedup path).
  const { data: exact } = await client
    .from("schools")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (exact) {
    return { schoolId: (exact as SchoolRow).id, slug, isNew: false };
  }

  // 2. Fuzzy match against all schools.
  const { data: allSchools } = await client.from("schools").select("id, name, city, country, slug");
  if (allSchools) {
    const normName = normalize(name);
    const normCity = normalize(cityName);
    const normCountry = normalize(countryName);

    let best: { id: string; slug: string; score: number } | null = null;

    for (const s of allSchools as SchoolRow[]) {
      const sName = normalize(s.name);
      const sCity = normalize(s.city);
      const sCountry = normalize(s.country);

      // Quick country gate — skip if different country.
      if (normCountry && sCountry && sCountry !== normCountry) continue;

      // Token overlap on name.
      const nameTokens = sName.split(" ").filter((t) => t.length > 3 && !["school", "college", "international", "academy", "institute"].includes(t));
      let hits = 0;
      for (const t of nameTokens) {
        if (normName.includes(t)) hits++;
      }
      const nameScore = nameTokens.length ? hits / nameTokens.length : 0;
      const cityScore = normCity && sCity === normCity ? 0.3 : 0;
      const score = nameScore + cityScore;

      if (score >= 0.7 && (!best || score > best.score)) {
        best = { id: s.id, slug: s.slug, score };
      }
    }

    if (best) {
      return { schoolId: best.id, slug: best.slug, isNew: false };
    }
  }

  // 3. No match — create a new school row.
  const newRow: Omit<SchoolRow, "id" | "created_at"> = {
    slug,
    name,
    city: cityName,
    country: countryName,
    country_code: codeOfCountry(countryName),
    region: regionOfCountry(countryName) as Region,
    curricula: [] as CurriculumTag[],
    lat: null,
    lng: null,
  };

  const { data: created, error } = await client
    .from("schools")
    .insert(newRow)
    .select("id, slug")
    .single();

  if (error || !created) {
    // Slug collision (race) — re-read the existing one.
    const { data: retry } = await client
      .from("schools")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (retry) {
      return { schoolId: (retry as SchoolRow).id, slug, isNew: false };
    }
    return null;
  }

  return { schoolId: (created as SchoolRow).id, slug, isNew: true };
}
