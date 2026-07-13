// School website health checker: fetches a school's website and assesses
// inspector-style signals — how recently content was updated, whether news is
// actively posted, staff directory freshness, policy availability, etc.
//
// Research basis: ISI BSO Inspection Handbook requires schools to publish
// inspection reports, policies, staff/governor details, and ethos statements
// on their website. Inspectors review the website pre-inspection. A stale or
// thin website is a negative signal for school quality/engagement.

export interface WebsiteHealthSignals {
  url: string | null;
  reachable: boolean;
  // Content freshness signals
  hasNewsSection: boolean;
  newsRecencyDays: number | null; // days since most recent dated news item
  lastModifiedHeader: string | null;
  // Structural signals
  hasStaffPage: boolean;
  hasPoliciesPage: boolean;
  hasInspectionReport: boolean;
  hasCalendar: boolean;
  hasCareersPage: boolean;
  // Activity signals
  pageCount: number | null; // internal links found
  socialLinks: string[];
  // Computed score 0..100 (higher = healthier digital presence)
  healthScore: number;
  signals: { label: string; status: "good" | "warn" | "bad" | "unknown"; detail: string }[];
}

function extractDomain(schoolName: string, city: string, country: string): string | null {
  // Try to construct a plausible domain — this is a heuristic; the real URL
  // should come from the school record or a search.
  const slug = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
  if (!slug) return null;
  // Common TLDs for international schools
  return `${slug}.org`;
}

function findDates(html: string): Date[] {
  const dates: Date[] = [];
  // Match common date formats: 2026-01-15, Jan 15 2026, 15 Jan 2026, etc.
  const patterns = [
    /20(?:2[4-6])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20(?:2[4-6])/gi,
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+20(?:2[4-6])/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const d = new Date(m[0]);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }
  return dates;
}

function hasKeyword(html: string, keywords: string[]): boolean {
  const lower = html.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function extractSocialLinks(html: string): string[] {
  const socials: string[] = [];
  const re = /href=["'](https?:\/\/(?:www\.)?(?:facebook|twitter|x|instagram|linkedin|youtube|wechat)\.[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!socials.includes(m[1])) socials.push(m[1]);
  }
  return socials.slice(0, 5);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countInternalLinks(html: string, domain: string): number {
  const safe = escapeRegExp(domain);
  const re = new RegExp(`href=["']/?[^"']*(?:${safe}|^/)[^"']*["']`, "gi");
  return (html.match(re) ?? []).length;
}

/**
 * Assess a school website's health from its HTML. If html is empty/unreachable,
 * returns a best-effort signal with healthScore = 0.
 */
export function assessWebsiteHealth(
  html: string,
  url: string | null,
  schoolName: string,
  city: string,
  country: string,
  lastModified: string | null,
): WebsiteHealthSignals {
  const domain = url ? new URL(url).hostname.replace(/^www\./, "") : extractDomain(schoolName, city, country);
  const reachable = html.length > 500;

  if (!reachable) {
    return {
      url,
      reachable: false,
      hasNewsSection: false,
      newsRecencyDays: null,
      lastModifiedHeader: lastModified,
      hasStaffPage: false,
      hasPoliciesPage: false,
      hasInspectionReport: false,
      hasCalendar: false,
      hasCareersPage: false,
      pageCount: null,
      socialLinks: [],
      healthScore: 0,
      signals: [
        { label: "Website reachable", status: "bad", detail: "Could not fetch the school website" },
        { label: "Overall digital presence", status: "bad", detail: "No website data available" },
      ],
    };
  }

  // Extract dates to assess freshness
  const dates = findDates(html).sort((a, b) => b.getTime() - a.getTime());
  const now = new Date();
  const recentDate = dates[0];
  const newsRecencyDays = recentDate
    ? Math.round((now.getTime() - recentDate.getTime()) / (86400 * 1000))
    : null;

  const hasNewsSection = hasKeyword(html, ["news", "blog", "latest", "announcements", "updates", "newsletter"]);
  const hasStaffPage = hasKeyword(html, ["our staff", "staff directory", "meet the team", "faculty", "leadership team", "our teachers", "staff list", "governors"]);
  const hasPoliciesPage = hasKeyword(html, ["policies", "child protection", "safeguarding policy", "privacy policy"]);
  const hasInspectionReport = hasKeyword(html, ["inspection report", "isi report", "ofsted", "bso", "council of international schools", "cis accreditation", "wasc", "neasc", "accreditation"]);
  const hasCalendar = hasKeyword(html, ["calendar", "term dates", "events calendar", "upcoming events"]);
  const hasCareersPage = hasKeyword(html, ["careers", "vacancies", "job openings", "work with us", "join our team", "employment", "current vacancies"]);
  const socialLinks = extractSocialLinks(html);
  const pageCount = domain ? countInternalLinks(html, domain) : null;

  // Compute health score (0..100)
  let score = 0;
  const signals: WebsiteHealthSignals["signals"] = [];

  // News freshness (max 25 pts)
  if (newsRecencyDays !== null) {
    if (newsRecencyDays <= 30) {
      score += 25;
      signals.push({ label: "News/updates freshness", status: "good", detail: `Most recent dated content: ${newsRecencyDays} days ago` });
    } else if (newsRecencyDays <= 90) {
      score += 15;
      signals.push({ label: "News/updates freshness", status: "warn", detail: `Most recent dated content: ${newsRecencyDays} days ago` });
    } else if (newsRecencyDays <= 365) {
      score += 5;
      signals.push({ label: "News/updates freshness", status: "warn", detail: `Most recent dated content: ${Math.round(newsRecencyDays / 30)} months ago` });
    } else {
      signals.push({ label: "News/updates freshness", status: "bad", detail: `Most recent dated content: over a year ago (${Math.round(newsRecencyDays / 365)}y)` });
    }
  } else if (hasNewsSection) {
    score += 8;
    signals.push({ label: "News section", status: "warn", detail: "News section found but no recent dates detected" });
  } else {
    signals.push({ label: "News/updates", status: "bad", detail: "No news or updates section detected" });
  }

  // Staff page (max 15 pts)
  if (hasStaffPage) {
    score += 15;
    signals.push({ label: "Staff & governance transparency", status: "good", detail: "Staff directory / leadership team page found" });
  } else {
    signals.push({ label: "Staff & governance transparency", status: "warn", detail: "No staff/governor details found (inspectors expect these)" });
  }

  // Policies (max 15 pts) — required by BSO/ISI standards
  if (hasPoliciesPage) {
    score += 15;
    signals.push({ label: "Policies & compliance", status: "good", detail: "Policies / safeguarding info published" });
  } else {
    score += 0;
    signals.push({ label: "Policies & compliance", status: "bad", detail: "No policies visible — BSO/ISI requires key policies on website" });
  }

  // Accreditation/inspection report (max 15 pts)
  if (hasInspectionReport) {
    score += 15;
    signals.push({ label: "Accreditation transparency", status: "good", detail: "Inspection/accreditation report referenced" });
  } else {
    signals.push({ label: "Accreditation transparency", status: "unknown", detail: "No inspection report found on homepage" });
  }

  // Calendar (max 10 pts)
  if (hasCalendar) {
    score += 10;
    signals.push({ label: "Calendar & events", status: "good", detail: "Active calendar/events section" });
  } else {
    signals.push({ label: "Calendar & events", status: "warn", detail: "No calendar or events section found" });
  }

  // Careers (max 10 pts) — active hiring is a sign of a growing school
  if (hasCareersPage) {
    score += 10;
    signals.push({ label: "Careers/hiring activity", status: "good", detail: "Careers/vacancies page present" });
  } else {
    signals.push({ label: "Careers/hiring activity", status: "unknown", detail: "No careers page found" });
  }

  // Social presence (max 10 pts)
  if (socialLinks.length >= 2) {
    score += 10;
    signals.push({ label: "Social media presence", status: "good", detail: `${socialLinks.length} social channels linked` });
  } else if (socialLinks.length === 1) {
    score += 5;
    signals.push({ label: "Social media presence", status: "warn", detail: "1 social channel linked" });
  } else {
    signals.push({ label: "Social media presence", status: "warn", detail: "No social media links found" });
  }

  return {
    url,
    reachable: true,
    hasNewsSection,
    newsRecencyDays,
    lastModifiedHeader: lastModified,
    hasStaffPage,
    hasPoliciesPage,
    hasInspectionReport,
    hasCalendar,
    hasCareersPage,
    pageCount,
    socialLinks,
    healthScore: Math.min(100, score),
    signals,
  };
}
