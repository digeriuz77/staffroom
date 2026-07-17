export type Region =
  | "Middle East"
  | "East Asia"
  | "Southeast Asia"
  | "South Asia"
  | "Europe"
  | "Africa"
  | "Oceania"
  | "Americas";

export type HousingType = "None" | "Allowance" | "Provided";

export type CurriculumTag = "IB" | "British" | "US" | "Other";

export type JobSource =
  | "tes"
  | "grc"
  | "teacherhorizons"
  | "schrole"
  | "eslcafe"
  | "unknown";

export type SentimentSource = "reddit" | "glassdoor" | "facebook" | "instagram";

export type SentimentProvenance = "live" | "static" | "stored";

export type RecordTrustTier = "seed" | "unverified" | "email" | "school";

export interface SalaryRecord {
  id: string;
  year: number;
  country: string;
  city: string;
  school: string;
  curriculum: CurriculumTag;
  role: string;
  monthlySalaryUsd: number;
  housing: HousingType;
  flights: boolean;
  taxRate: number | null;
  netMonthlyUsd: number;
  trustTier: RecordTrustTier;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  countryCode: string;
  region: Region;
  curricula: CurriculumTag[];
  salaryCount: number;
  years: number[];
}

export interface ColItem {
  city: string;
  country: string;
  region: Region;
  countryCode: string;
  colIndex: number;
  medianMonthlyUsd: number;
  buyingPowerUsd: number;
  milk: number;
  beer: number;
  meal: number;
  takeaway: number;
  gym: number;
  taxi: number;
}

export interface SentimentPost {
  id: string;
  school: string;
  source: SentimentSource;
  provenance: SentimentProvenance;
  author: string;
  date: string;
  title?: string;
  body: string;
  score: number;
  upvotes?: number;
  subreddit?: string;
  url?: string;
  themes: string[];
}

export interface ParsedJob {
  ok: boolean;
  source: JobSource;
  rawUrl: string;
  schoolName?: string;
  role?: string;
  country?: string;
  city?: string;
  offeredMonthlyUsd?: number;
  matchedSchoolId?: string;
  warning?: string;
}

export const SOURCE_LABEL: Record<SentimentSource, string> = {
  reddit: "Reddit",
  glassdoor: "Glassdoor",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const REGION_ORDER: Region[] = [
  "Middle East",
  "East Asia",
  "Southeast Asia",
  "South Asia",
  "Europe",
  "Americas",
  "Africa",
  "Oceania",
];
