// Role inference engine: detects which management/leadership role a job posting
// or role string refers to, then produces a predictive preview of what the
// teacher should expect — admin vs teaching split, salary uplift, responsibilities,
// pain points, and experience match.
import type { RoleProfile, RoleTier } from "@/lib/data/roleProfiles";
import { ROLE_PROFILES } from "@/lib/data/roleProfiles";

export interface RoleMatch {
  profile: RoleProfile;
  confidence: number; // 0..1
  matchedTerms: string[];
}

export interface RolePrediction {
  matches: RoleMatch[];
  bestMatch: RoleMatch | null;
  // Predicted day-to-day split
  adminPct: number; // 1 - teachingPct
  teachingPct: number;
  // Is the role primarily administrative?
  isAdminHeavy: boolean;
  // Is it in addition to teaching?
  inAdditionToTeaching: boolean;
  // Predicted salary uplift (decimal)
  salaryUplift: number;
  // Experience assessment
  minExperienceYears: number;
  // Key responsibilities to expect
  responsibilities: string[];
  // Common pain points reported in this type of role
  painPoints: string[];
  // Tier label
  tier: RoleTier;
  // Human-readable summary
  summary: string;
}

/**
 * Infer role(s) from a job title, role string, or full job description text.
 * Returns ranked matches; bestMatch is the highest-confidence profile.
 */
export function inferRole(text: string): RolePrediction {
  const lower = text.toLowerCase();
  const matches: RoleMatch[] = [];

  for (const profile of ROLE_PROFILES) {
    const matchedTerms: string[] = [];
    let score = 0;
    for (const pattern of profile.matchPatterns) {
      const re = new RegExp(`\\b${pattern}`, "i");
      if (re.test(lower)) {
        matchedTerms.push(pattern);
        // Senior/head roles get higher weight to avoid being masked by "teacher"
        score += profile.tier === "head" ? 3 : profile.tier === "senior" ? 2.5 : profile.tier === "middle" ? 2 : 1;
      }
    }
    if (score > 0) {
      // Normalize confidence: 1 match = 0.6, 2 matches = 0.8, 3+ = 0.95
      const confidence = Math.min(0.95, 0.4 + score * 0.2);
      matches.push({ profile, confidence, matchedTerms });
    }
  }

  // Sort by confidence desc, then by tier weight (senior > middle > classroom)
  const tierWeight: Record<RoleTier, number> = { classroom: 0, middle: 1, senior: 2, head: 3 };
  matches.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.1) return b.confidence - a.confidence;
    return tierWeight[b.profile.tier] - tierWeight[a.profile.tier];
  });

  const best = matches[0] ?? null;
  const profile = best?.profile ?? ROLE_PROFILES[0];
  const teachingPct = profile.teachingPct;
  const adminPct = 1 - teachingPct;

  return {
    matches: matches.slice(0, 5),
    bestMatch: best,
    adminPct,
    teachingPct,
    isAdminHeavy: adminPct >= 0.5,
    inAdditionToTeaching: profile.inAdditionToTeaching,
    salaryUplift: profile.salaryUplift,
    minExperienceYears: profile.minExperienceYears,
    responsibilities: profile.responsibilities,
    painPoints: profile.painPoints,
    tier: profile.tier,
    summary: buildSummary(profile, best?.confidence ?? 0),
  };
}

function buildSummary(profile: RoleProfile, confidence: number): string {
  const confLabel =
    confidence >= 0.8 ? "Strong match" : confidence >= 0.6 ? "Likely match" : "Possible match";
  const teachingLabel =
    profile.teachingPct === 0
      ? "no regular teaching"
      : profile.teachingPct <= 0.3
        ? `minimal teaching (~${Math.round(profile.teachingPct * 100)}%)`
        : profile.teachingPct <= 0.6
          ? `reduced teaching (~${Math.round(profile.teachingPct * 100)}%)`
          : `mostly teaching (~${Math.round(profile.teachingPct * 100)}%)`;

  const adminLabel = profile.adminFocus
    ? "This role is administration-heavy"
    : profile.pastoralFocus
      ? "This role has a significant pastoral focus"
      : "This role balances leadership with teaching";

  return `${confLabel}: ${profile.label}. ${adminLabel}; ${teachingLabel}. Typical salary uplift ~${Math.round(profile.salaryUplift * 100)}% over a classroom teacher base. Minimum ${profile.minExperienceYears} years experience typically expected.`;
}

/**
 * Check whether a role text mentions teaching in addition to management duties.
 * Used to detect "in addition to teaching" patterns in job descriptions.
 */
export function detectDualRole(text: string): { dualRole: boolean; evidence: string[] } {
  const lower = text.toLowerCase();
  const evidence: string[] = [];
  const signals = [
    "teaching timetable",
    "teaching load",
    "reduced timetable",
    "in addition to teaching",
    "teaching commitment",
    "teaching duties",
    "classroom teacher",
    "will teach",
    "teach a reduced",
    "teaching assignment",
    "part-time teaching",
  ];
  for (const s of signals) {
    if (lower.includes(s)) evidence.push(s);
  }
  return { dualRole: evidence.length > 0, evidence };
}
