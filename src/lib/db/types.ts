// Database type definitions mirroring supabase/migrations/0001_init.sql
// All monetary values are canonical USD. FX is applied only at render time.

export type HousingType = "None" | "Allowance" | "Provided";
export type CurriculumTag = "IB" | "British" | "US" | "Other";
export type TrustTier = "seed" | "unverified" | "email" | "school";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SalarySource = "tsv_seed" | "user_submit";
export type ValuationBasis = "face" | "market";
export type JobStatus = "queued" | "running" | "done" | "failed" | "dead";
export type JobType =
  | "reddit_fetch"
  | "embed"
  | "cluster"
  | "scrape"
  | "baseline"
  | "turnover"
  | "fx"
  | "gap_detect";
export type BountyStatus = "open" | "filled" | "closed";
export type BountyKind = "salary" | "col" | "management" | "benefits" | "tenure";
export type UserRole = "member" | "moderator" | "admin";

export interface ChildEntry {
  age: number;
  schoolAge: boolean;
}

export interface Household {
  adults: number;
  earningAdults: number;
  children: ChildEntry[];
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  display_currency: string;
  household: Household;
  reputation_points: number;
  role: UserRole;
  created_at: string;
}

export interface SchoolRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  region: string;
  curricula: CurriculumTag[];
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface SalaryPackageFields {
  baseAnnualUsd?: number;
  housingAllowanceUsd?: number;
  housingProvided?: boolean;
  flightsPerPersonUsd?: number;
  flightFrequencyYears?: number;
  feesCoveragePct?: number;
  gratuityMonthsPerYear?: number;
  relocationUsd?: number;
  healthcareUsd?: number;
  bonusUsd?: number;
}

export interface SalaryRecordRow {
  id: string;
  school_id: string | null;
  year: number;
  country: string;
  city: string;
  school: string;
  curriculum: CurriculumTag;
  role: string;
  management_role: boolean;
  tenure_years: number | null;
  currency: string;
  monthly_salary_usd: number;
  net_annual_usd: number;
  net_monthly_usd: number;
  tax_rate: number | null;
  tax_regime: string | null;
  housing: HousingType;
  flights: boolean;
  package: SalaryPackageFields;
  source: SalarySource;
  trust_tier: TrustTier;
  status: SubmissionStatus;
  submitter_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
}

export interface TaneComponentRow {
  id: string;
  salary_record_id: string;
  component: string;
  amount_usd: number;
  valuation_basis: ValuationBasis;
  provenance: string | null;
  created_at: string;
}

export interface ColItemRow {
  id: string;
  city: string;
  country: string;
  region: string;
  col_index: number;
  median_monthly_usd: number;
  buying_power_usd: number;
  milk: number | null;
  beer: number | null;
  meal: number | null;
  takeaway: number | null;
  gym: number | null;
  taxi: number | null;
  source: string;
  trust_tier: TrustTier;
  submitter_id: string | null;
  submitted_at: string;
}

export interface MarketRentRow {
  id: string;
  city: string;
  country: string;
  bedrooms: number;
  monthly_usd: number;
  source: string;
}

export interface SchoolFeeTierRow {
  id: string;
  school_id: string | null;
  grade_tier: string;
  annual_usd: number;
  source: string;
}

export interface RedditPostRow {
  id: string;
  school_id: string | null;
  subreddit: string;
  title: string | null;
  body: string | null;
  author: string | null;
  score: number | null;
  created_at: string;
  fetched_at: string;
  sentiment_score: number | null;
  themes: string[];
  embedding: number[] | null;
}

export interface ThemeClusterRow {
  id: string;
  school_id: string | null;
  theme_label: string;
  summary: string | null;
  post_count: number;
  sentiment_score: number;
  window_start: string;
  window_end: string;
  computed_at: string;
}

export interface JobPostingRow {
  id: string;
  hash: string;
  source: string;
  school_id: string | null;
  school_text: string | null;
  title: string | null;
  raw_url: string | null;
  posted_at: string | null;
  first_seen_at: string;
}

export interface PostingBaselineRow {
  id: string;
  school_id: string;
  window: string;
  avg_posts: number;
  computed_at: string;
}

export interface TurnoverSignalRow {
  id: string;
  school_id: string;
  signal_strength: number;
  posting_delta: number;
  sentiment_shift: number;
  rationale: string | null;
  computed_at: string;
}

export interface BountyRow {
  id: string;
  scope_kind: "school" | "country" | "role";
  scope_value: string;
  school_id: string | null;
  kind: BountyKind;
  reward_points: number;
  status: BountyStatus;
  created_by: string | null;
  filled_by: string | null;
  created_at: string;
  filled_at: string | null;
}

export interface JobRow {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface FxRateRow {
  currency: string;
  rate_to_usd: number;
  fetched_at: string;
}

// Canonical Supabase typed-client table shape. Insert/Update are derived as
// Partial<Row> since Postgres defaults enforce the real constraints.
export interface Table<R> {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
}

// Supabase typed-client schema. Matches the shape @supabase/supabase-js v2
// expects from createClient<Database>().
export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      schools: Table<SchoolRow>;
      salary_records: Table<SalaryRecordRow>;
      tane_components: Table<TaneComponentRow>;
      col_items: Table<ColItemRow>;
      market_rents: Table<MarketRentRow>;
      school_fee_tiers: Table<SchoolFeeTierRow>;
      reddit_posts: Table<RedditPostRow>;
      theme_clusters: Table<ThemeClusterRow>;
      job_postings: Table<JobPostingRow>;
      posting_baselines: Table<PostingBaselineRow>;
      turnover_signals: Table<TurnoverSignalRow>;
      bounties: Table<BountyRow>;
      jobs: Table<JobRow>;
      fx_rates: Table<FxRateRow>;
    };
    Views: Record<string, never>;
    Functions: {
      claim_next_job: {
        Args: Record<string, never>;
        Returns: JobRow[];
      };
      set_post_embedding: {
        Args: { p_id: string; p_vec: number[] };
        Returns: void;
      };
    };
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}
