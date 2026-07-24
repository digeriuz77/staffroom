// Comprehensive static registry of all known platforms relevant to international
// school teachers — salary databases, review sites, forums, job boards,
// accreditation directories, social media groups, and general search.
//
// Researched July 2026. Each entry carries rich metadata so the system can:
//  - Build deep-link search URLs for a given school (what the UI uses now)
//  - Know which sources the worker can scrape automatically (feasibility tags)
//  - Understand what KIND of data each source holds (salary vs review vs job)
//  - Flag paid/membership walls so users know what to expect
//
// Feasibility legend:
//   high   = has RSS/public API; worker can extract data automatically
//   medium = public HTML pages; worker can fetch but parsing is brittle
//   low    = auth wall or paywall; deep-link only, no automated extraction
//   none   = membership/app/ closed group; deep-link for users only

export type SourceCategory =
  | "salary_db" // peer-reported salary data
  | "review" // teacher reviews/experiences
  | "forum" // discussion forums
  | "job_board" // recruitment/job listings
  | "accreditation" // official school accreditation directories
  | "social" // social media (Reddit, Facebook, LinkedIn)
  | "general"; // Google etc.

export type ScrapeFeasibility = "high" | "medium" | "low" | "none";

export type AccessModel =
  | "free" // fully open
  | "freemium" // basic free, data behind paywall
  | "paid" // subscription required for data
  | "membership" // join a group/app (closed community)
  | "free_with_auth"; // free but requires login

export type RegionScope = "global" | string;

export interface PlatformEntry {
  key: string;
  label: string;
  url: string;
  category: SourceCategory;
  /** What kind of data this source primarily holds. */
  dataType: string[];
  /** Build a search URL for a given school name. */
  searchUrl: (schoolName: string) => string;
  /** Can the worker extract data automatically? */
  scrapeFeasibility: ScrapeFeasibility;
  /** How access works. */
  access: AccessModel;
  /** Regional scope (global or a country name). */
  region: RegionScope;
  /** Signal value weight for cross-source correlation (1-5). */
  priority: number;
  /** Approximate dataset size if known (for display). */
  scaleNote?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// SALARY DATABASES (peer-reported salary data)
// ---------------------------------------------------------------------------
const SALARY_DATABASES: PlatformEntry[] = [
  {
    key: "isc_salary",
    label: "International School Community",
    url: "https://app.internationalschoolcommunity.com/",
    category: "salary_db",
    dataType: ["salary", "review", "benefits"],
    searchUrl: (n) => `https://app.internationalschoolcommunity.com/?s=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "freemium",
    region: "global",
    priority: 5,
    scaleNote: "55,000+ reviews across 2,387 schools in 185 countries",
    notes: "Largest dedicated salary + review DB. Premium membership needed for salary detail; school-level data on free tier.",
  },
  {
    key: "wondering_staffroom",
    label: "Wondering Staffroom",
    url: "https://wonderingstaffroom.org/",
    category: "salary_db",
    dataType: ["salary", "benefits", "package"],
    searchUrl: (n) => `https://wonderingstaffroom.org/?s=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 4,
    notes: "Community-built anonymous salary tracker. Free, no account required. School names anonymized in public view.",
  },
  {
    key: "reviews_for_teachers",
    label: "Reviews for Teachers",
    url: "https://reviewsforteachers.com/",
    category: "salary_db",
    dataType: ["salary", "review"],
    searchUrl: (n) => `https://reviewsforteachers.com/?s=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 4,
    scaleNote: "800+ salary reports across 650+ schools in 132+ countries",
    notes: "Free, no paywall. Moderated submissions. Focus on Asia + Middle East.",
  },
  {
    key: "mystool",
    label: "mystool.org",
    url: "https://mystool.org/",
    category: "salary_db",
    dataType: ["salary", "benefits"],
    searchUrl: (n) => `https://mystool.org/search?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "freemium",
    region: "global",
    priority: 3,
    scaleNote: "~700 verified salaries",
    notes: "Salary intelligence tool (original inspiration for Staffroom Intel).",
  },
];

// ---------------------------------------------------------------------------
// REVIEW SITES (teacher reviews & experiences)
// ---------------------------------------------------------------------------
const REVIEW_SITES: PlatformEntry[] = [
  {
    key: "glassdoor",
    label: "Glassdoor",
    url: "https://www.glassdoor.com/",
    category: "review",
    dataType: ["review", "salary", "interview"],
    searchUrl: (n) => `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "free_with_auth",
    region: "global",
    priority: 3,
    notes: "Requires login. Coverage thin for many international schools but strong for some.",
  },
  {
    key: "google_reviews",
    label: "Google Reviews",
    url: "https://www.google.com/maps",
    category: "review",
    dataType: ["review", "rating"],
    searchUrl: (n) => `https://www.google.com/search?q=${encodeURIComponent(`${n} reviews`)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 3,
    notes: "Google Maps business reviews — parent/staff mixed. Useful for general reputation signal.",
  },
  {
    key: "niche",
    label: "Niche",
    url: "https://www.niche.com/",
    category: "review",
    dataType: ["review", "rating"],
    searchUrl: (n) => `https://www.niche.com/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "free",
    region: "United States",
    priority: 2,
    notes: "US-focused; limited international school coverage.",
  },
];

// ---------------------------------------------------------------------------
// FORUMS (discussion communities)
// ---------------------------------------------------------------------------
const FORUMS: PlatformEntry[] = [
  {
    key: "isr_forum",
    label: "International Schools Review",
    url: "https://internationalschoolsreview.com/",
    category: "forum",
    dataType: ["review", "forum", "salary"],
    searchUrl: (n) =>
      `https://internationalschoolsreview.com/v-web/bulletin/bb/search.php?keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "paid",
    region: "global",
    priority: 5,
    scaleNote: "8,500+ forum members; detailed school reviews behind paywall",
    notes: "Paywalled. Most candid school reviews exist here. Forum rules prohibit discussing schools in the general forum; reviews are in paid section.",
  },
  {
    key: "internationaleducators",
    label: "International Educators Forum",
    url: "https://www.internationaleducators.com/",
    category: "forum",
    dataType: ["review", "forum"],
    searchUrl: (n) =>
      `https://www.internationaleducators.com/forum/search.php?keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "membership",
    region: "global",
    priority: 3,
    scaleNote: "6,800+ members",
    notes: "Reviews require proof of employment before publication. Vetted for authenticity.",
  },
  {
    key: "ajarn",
    label: "Ajarn.com (Thailand)",
    url: "https://www.ajarn.com/",
    category: "forum",
    dataType: ["forum", "salary", "review"],
    searchUrl: (n) => `https://www.ajarn.com/jobs?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "Thailand",
    priority: 3,
    notes: "The definitive Thailand TEFL/international teaching resource. Active blog + salary discussions.",
  },
  {
    key: "thailand_teaching",
    label: "ThailandTeaching.info",
    url: "https://thailandteaching.thai-forum.net/",
    category: "forum",
    dataType: ["forum"],
    searchUrl: (n) =>
      `https://thailandteaching.thai-forum.net/search.php?keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "Thailand",
    priority: 2,
    notes: "Thai licensing, visa/work permit, and school info for foreign teachers.",
  },
  {
    key: "eslcafe_forum",
    label: "Dave's ESL Cafe Forum",
    url: "https://forums.eslcafe.com/",
    category: "forum",
    dataType: ["forum", "job"],
    searchUrl: (n) => `https://forums.eslcafe.com/search.php?keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 2,
    notes: "Long-running ESL community. Regional job boards + discussion forums.",
  },
];

// ---------------------------------------------------------------------------
// JOB BOARDS & RECRUITMENT AGENCIES
// ---------------------------------------------------------------------------
const JOB_BOARDS: PlatformEntry[] = [
  {
    key: "tes",
    label: "Tes Jobs",
    url: "https://www.tes.com/jobs",
    category: "job_board",
    dataType: ["job", "salary"],
    searchUrl: (n) => `https://www.tes.com/jobs/search?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 5,
    notes: "Largest international school job board. Now owns Schrole Connect.",
  },
  {
    key: "search_associates",
    label: "Search Associates",
    url: "https://www.searchassociates.com/",
    category: "job_board",
    dataType: ["job"],
    searchUrl: (n) => `https://www.searchassociates.com/schools?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "membership",
    region: "global",
    priority: 4,
    scaleNote: "750+ schools in 120+ countries",
    notes: "Premier agency. Requires candidate registration. 11 job fairs worldwide.",
  },
  {
    key: "teacher_horizons",
    label: "Teacher Horizons",
    url: "https://www.teacherhorizons.com/",
    category: "job_board",
    dataType: ["job", "review"],
    searchUrl: (n) => `https://www.teacherhorizons.com/schools?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "free",
    region: "global",
    priority: 3,
    notes: "Relationship-driven agency. Free for teachers. Community + advisor model.",
  },
  {
    key: "schrole",
    label: "Schrole (Tes Staff Management)",
    url: "https://www.schrole.com/",
    category: "job_board",
    dataType: ["job"],
    searchUrl: (n) => `https://www.schrole.com/jobs/search?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "membership",
    region: "global",
    priority: 3,
    scaleNote: "500+ schools in 100+ countries",
    notes: "Now part of Tes as 'Staff Management'. Job board + HR platform.",
  },
  {
    key: "edvectus",
    label: "Edvectus",
    url: "https://www.edvectus.com/",
    category: "job_board",
    dataType: ["job", "salary"],
    searchUrl: (n) => `https://www.edvectus.com/pages/vacancies/?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 2,
    notes: "Free recruitment agency with detailed employment package guides.",
  },
  {
    key: "iss",
    label: "ISS (International Schools Services)",
    url: "https://www.iss.edu/",
    category: "job_board",
    dataType: ["job"],
    searchUrl: (n) => `https://www.iss.edu/educator-careers?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "low",
    access: "membership",
    region: "global",
    priority: 3,
    notes: "Major US-based agency. Requires candidate registration.",
  },
  {
    key: "seekteachers",
    label: "SeekTeachers",
    url: "https://www.seekteachers.com/",
    category: "job_board",
    dataType: ["job", "salary"],
    searchUrl: (n) => `https://www.seekteachers.com/job-search.asp?keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 2,
    notes: "Free job board; often lists salary ranges in postings.",
  },
  {
    key: "eslcafe_jobs",
    label: "Dave's ESL Cafe Jobs",
    url: "https://www.eslcafe.com/jobs/",
    category: "job_board",
    dataType: ["job"],
    searchUrl: (n) => `https://www.eslcafe.com/jobs/?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 2,
    notes: "Free international job listings, organized by region.",
  },
];

// ---------------------------------------------------------------------------
// ACCREDITATION & INSPECTION DIRECTORIES (verifiable school status)
// ---------------------------------------------------------------------------
const ACCREDITATION: PlatformEntry[] = [
  {
    key: "cobis",
    label: "COBIS (Council of British International Schools)",
    url: "https://www.cobis.org.uk/our-network/search-for-cobis-members/cobis-school-search",
    category: "accreditation",
    dataType: ["accreditation", "inspection"],
    searchUrl: (n) => `https://www.cobis.org.uk/our-network/search-for-cobis-members?Keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 4,
    notes: "British schools overseas accreditation. Searchable directory of accredited members.",
  },
  {
    key: "cis",
    label: "CIS (Council of International Schools)",
    url: "https://www.cois.org/membership-directory",
    category: "accreditation",
    dataType: ["accreditation"],
    searchUrl: (n) => `https://www.cois.org/membership-directory?Keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 4,
    notes: "Global accreditation body. Directory of CIS-accredited and member schools.",
  },
  {
    key: "neasc",
    label: "NEASC (New England Association)",
    url: "https://www.neasc.org/school-directory",
    category: "accreditation",
    dataType: ["accreditation"],
    searchUrl: (n) => `https://www.neasc.org/school-directory?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 3,
    notes: "US accreditation body with international school directory.",
  },
  {
    key: "wasc",
    label: "WASC (Western Association)",
    url: "https://www.acswasc.org/",
    category: "accreditation",
    dataType: ["accreditation"],
    searchUrl: (n) => `https://www.acswasc.org/?s=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 3,
    notes: "Western US accreditation body; accredits many international schools.",
  },
  {
    key: "ib_world",
    label: "IB World Schools",
    url: "https://www.ibo.org/programmes/find-an-ib-school/",
    category: "accreditation",
    dataType: ["accreditation", "curriculum"],
    searchUrl: (n) => `https://www.ibo.org/programmes/find-an-ib-school/?Keywords=${encodeURIComponent(n)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 4,
    notes: "Official directory of IB World Schools (PYP/MYP/DP/CP authorized).",
  },
  {
    key: "bso_govuk",
    label: "British Schools Overseas (GOV.UK)",
    url: "https://www.gov.uk/government/publications/british-schools-overseas-bso-accredited-schools",
    category: "accreditation",
    dataType: ["accreditation", "inspection"],
    searchUrl: (n) =>
      `https://www.gov.uk/search/all?keywords=${encodeURIComponent(n)}&order=updated-newest`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 4,
    notes: "Official DfE list of BSO-accredited schools with published inspection reports.",
  },
  {
    key: "isi_reports",
    label: "ISI Inspection Reports",
    url: "https://www.isi.net/reports/",
    category: "accreditation",
    dataType: ["inspection", "report"],
    searchUrl: (n) => `https://www.isi.net/reports/?search=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 4,
    notes: "Independent Schools Inspectorate reports — public PDFs with detailed findings.",
  },
];

// ---------------------------------------------------------------------------
// SOCIAL MEDIA (Reddit, Facebook, LinkedIn)
// ---------------------------------------------------------------------------
const SOCIAL_REDDIT: PlatformEntry[] = [
  {
    key: "reddit_intschoolreview",
    label: "r/intschoolreview",
    url: "https://www.reddit.com/r/intschoolreview/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/intschoolreview/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 5,
    notes: "Dedicated international school review subreddit.",
  },
  {
    key: "reddit_intlteachers",
    label: "r/InternationalTeachers",
    url: "https://www.reddit.com/r/InternationalTeachers/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/InternationalTeachers/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 5,
    notes: "Primary subreddit. Worker ingests via Reddit OAuth API (free tier).",
  },
  {
    key: "reddit_intlschools",
    label: "r/InternationalSchools",
    url: "https://www.reddit.com/r/InternationalSchools/",
    category: "social",
    dataType: ["review", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/InternationalSchools/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 4,
  },
  {
    key: "reddit_tefl",
    label: "r/TEFL",
    url: "https://www.reddit.com/r/TEFL/",
    category: "social",
    dataType: ["review", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/TEFL/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 3,
  },
  {
    key: "reddit_korea",
    label: "r/teachinginkorea",
    url: "https://www.reddit.com/r/teachinginkorea/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachinginkorea/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "South Korea",
    priority: 3,
  },
  {
    key: "reddit_china",
    label: "r/teachinginchina",
    url: "https://www.reddit.com/r/teachinginchina/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachinginchina/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "China",
    priority: 3,
  },
  {
    key: "reddit_japan",
    label: "r/teachinginjapan",
    url: "https://www.reddit.com/r/teachinginjapan/",
    category: "social",
    dataType: ["review", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachinginjapan/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "Japan",
    priority: 3,
  },
  {
    key: "reddit_thailand",
    label: "r/teachinginthailand",
    url: "https://www.reddit.com/r/teachinginthailand/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachinginthailand/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "Thailand",
    priority: 3,
  },
  {
    key: "reddit_dubai",
    label: "r/teachinginDubai",
    url: "https://www.reddit.com/r/teachinginDubai/",
    category: "social",
    dataType: ["review", "salary", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachinginDubai/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "United Arab Emirates",
    priority: 3,
  },
  {
    key: "reddit_abroad",
    label: "r/teachingabroad",
    url: "https://www.reddit.com/r/teachingabroad/",
    category: "social",
    dataType: ["review", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/teachingabroad/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 2,
  },
  {
    key: "reddit_teachers",
    label: "r/Teachers",
    url: "https://www.reddit.com/r/Teachers/",
    category: "social",
    dataType: ["review", "forum"],
    searchUrl: (n) => `https://www.reddit.com/r/Teachers/search/?q=${encodeURIComponent(n)}`,
    scrapeFeasibility: "high",
    access: "free",
    region: "global",
    priority: 2,
  },
];

const SOCIAL_FACEBOOK: PlatformEntry[] = [
  {
    key: "fb_intl_teachers_colour",
    label: "International Teachers of Colour",
    url: "https://www.internationalteachersofcolour.com/",
    category: "social",
    dataType: ["review", "forum", "diversity"],
    searchUrl: (n) => `https://www.facebook.com/search/top?q=${encodeURIComponent(n)}%20international%20school`,
    scrapeFeasibility: "none",
    access: "membership",
    region: "global",
    priority: 3,
    notes: "Facebook group + website + LinkedIn. Amplifies educators of colour; equity & inclusion focus.",
  },
  {
    key: "fb_english_teachers_korea",
    label: "English Teachers in Korea (FB)",
    url: "https://www.facebook.com/groups/englishteachersinkorea/",
    category: "social",
    dataType: ["job", "salary", "forum"],
    searchUrl: (n) => `https://www.facebook.com/search/top?q=${encodeURIComponent(n)}%20korea%20teacher`,
    scrapeFeasibility: "none",
    access: "membership",
    region: "South Korea",
    priority: 2,
    notes: "Large Korea teaching community. Job listings + contract advice + scam call-outs.",
  },
  {
    key: "fb_uae_teachers",
    label: "UAE Teacher Network (FB/WhatsApp)",
    url: "https://www.linkedin.com/company/uae-teachers-network/",
    category: "social",
    dataType: ["forum", "job"],
    searchUrl: (n) => `https://www.facebook.com/search/top?q=${encodeURIComponent(n)}%20uae%20teacher`,
    scrapeFeasibility: "none",
    access: "membership",
    region: "United Arab Emirates",
    priority: 2,
    notes: "WhatsApp + LinkedIn community for UAE educators.",
  },
  {
    key: "fb_seoul_expats",
    label: "Seoul Expats (FB)",
    url: "https://www.facebook.com/groups/seoulexpats/",
    category: "social",
    dataType: ["forum", "job"],
    searchUrl: (n) => `https://www.facebook.com/search/top?q=${encodeURIComponent(n)}%20seoul`,
    scrapeFeasibility: "none",
    access: "membership",
    region: "South Korea",
    priority: 1,
    scaleNote: "30,000+ members",
    notes: "General expat group with teacher-relevant posts.",
  },
];

// ---------------------------------------------------------------------------
// GENERAL SEARCH
// ---------------------------------------------------------------------------
const GENERAL: PlatformEntry[] = [
  {
    key: "google",
    label: "Google",
    url: "https://www.google.com/",
    category: "general",
    dataType: ["review", "salary", "news"],
    searchUrl: (n) =>
      `https://www.google.com/search?q=${encodeURIComponent(`"${n}" teacher review experience salary`)}`,
    scrapeFeasibility: "medium",
    access: "free",
    region: "global",
    priority: 5,
    notes: "Broadest coverage. Worker can use as a discovery layer for school mentions across the web.",
  },
];

// ---------------------------------------------------------------------------
// FULL REGISTRY
// ---------------------------------------------------------------------------
export const PLATFORM_REGISTRY: PlatformEntry[] = [
  ...SALARY_DATABASES,
  ...REVIEW_SITES,
  ...FORUMS,
  ...JOB_BOARDS,
  ...ACCREDITATION,
  ...SOCIAL_REDDIT,
  ...SOCIAL_FACEBOOK,
  ...GENERAL,
];

/** All entries grouped by category (for UI display). */
export const REGISTRY_BY_CATEGORY: Record<SourceCategory, PlatformEntry[]> = {
  salary_db: [...SALARY_DATABASES],
  review: [...REVIEW_SITES],
  forum: [...FORUMS],
  job_board: [...JOB_BOARDS],
  accreditation: [...ACCREDITATION],
  social: [...SOCIAL_REDDIT, ...SOCIAL_FACEBOOK],
  general: [...GENERAL],
};

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  salary_db: "Salary databases",
  review: "Review sites",
  forum: "Forums",
  job_board: "Job boards & agencies",
  accreditation: "Accreditation & inspection",
  social: "Social media",
  general: "General search",
};

export const CATEGORY_ORDER: SourceCategory[] = [
  "salary_db",
  "review",
  "forum",
  "accreditation",
  "social",
  "job_board",
  "general",
];

/** Lookup a single platform by key. */
export function getPlatform(key: string): PlatformEntry | undefined {
  return PLATFORM_REGISTRY.find((p) => p.key === key);
}

/** Build deep-link search URLs for a school across all (or filtered) platforms. */
export function buildDeepLinks(
  schoolName: string,
  filter?: { category?: SourceCategory; minPriority?: number; region?: string },
): { key: string; label: string; category: SourceCategory; url: string; access: AccessModel; priority: number }[] {
  return PLATFORM_REGISTRY.filter((p) => {
    if (filter?.category && p.category !== filter.category) return false;
    if (filter?.minPriority && p.priority < filter.minPriority) return false;
    if (filter?.region && p.region !== "global" && p.region !== filter.region) return false;
    return true;
  })
    .map((p) => ({
      key: p.key,
      label: p.label,
      category: p.category,
      url: p.searchUrl(schoolName),
      access: p.access,
      priority: p.priority,
    }))
    .sort((a, b) => b.priority - a.priority);
}

/** Sources the worker can scrape automatically (feasibility high/medium, free/freemium). */
export function automatableSources(): PlatformEntry[] {
  return PLATFORM_REGISTRY.filter(
    (p) =>
      (p.scrapeFeasibility === "high" || p.scrapeFeasibility === "medium") &&
      (p.access === "free" || p.access === "freemium"),
  );
}

/** Count summary for display. */
export function registryStats() {
  const byCat = new Map<SourceCategory, number>();
  for (const p of PLATFORM_REGISTRY) {
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  }
  return {
    total: PLATFORM_REGISTRY.length,
    byCategory: Object.fromEntries(byCat) as Record<SourceCategory, number>,
    automatable: automatableSources().length,
  };
}
