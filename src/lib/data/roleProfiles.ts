// Role profiles: middle management + early senior leadership positions in
// international schools. Researched July 2026 from job descriptions, TIE,
// SabisCareers, SchoolIntel, British Council, IB job descriptions, and academic
// literature (Atkinson 2020 on middle leaders in Vietnam).
//
// Key insight from research: every management role in an international school is
// a DUAL role — leadership/admin + reduced teaching load. The teaching % varies
// by tier: HoD ~60-80% teaching, Coordinator ~40-60%, SLT ~0-20%.
// The "admin-heavy vs teaching + management" distinction the user asks about is
// captured by the teachingPct field (lower = more administrative).

export type RoleTier = "classroom" | "middle" | "senior" | "head";

export interface RoleProfile {
  key: string;
  label: string;
  tier: RoleTier;
  // Title patterns matched against job text (regex source strings)
  matchPatterns: string[];
  // Teaching load as % of full-time (1.0 = full classroom teacher)
  teachingPct: number;
  // Salary uplift over equivalent classroom teacher base (0.15 = +15%)
  salaryUplift: number;
  // Minimum years of classroom experience typically required
  minExperienceYears: number;
  // Typical years in role before next promotion
  typicalTenureYears: number;
  // Core responsibility areas
  responsibilities: string[];
  // Common pain points teachers report in this role
  painPoints: string[];
  // Whether the role is often "in addition to teaching" (true for most middle roles)
  inAdditionToTeaching: boolean;
  // Whether the role includes pastoral responsibilities
  pastoralFocus: boolean;
  // Whether the role is primarily administrative
  adminFocus: boolean;
  // Whether this role is on the SLT
  onSLT: boolean;
  description: string;
}

export const ROLE_PROFILES: RoleProfile[] = [
  // ── CLASSROOM (baseline) ──────────────────────────────────────────────────
  {
    key: "classroom_teacher",
    label: "Classroom Teacher",
    tier: "classroom",
    matchPatterns: ["teacher", "instructor", "class teacher", "form tutor"],
    teachingPct: 1.0,
    salaryUplift: 0.0,
    minExperienceYears: 0,
    typicalTenureYears: 3,
    responsibilities: ["Planning & delivering lessons", "Assessment & marking", "Pastoral/form tutor duties", "Extracurricular activities"],
    painPoints: ["High marking load", "Limited career progression path", "Heavy contact hours"],
    inAdditionToTeaching: false,
    pastoralFocus: true,
    adminFocus: false,
    onSLT: false,
    description: "Full-time classroom teaching. This is the baseline role against which management uplifts are measured.",
  },

  // ── MIDDLE LEADERSHIP ──────────────────────────────────────────────────────
  {
    key: "hod",
    label: "Head of Department (HoD)",
    tier: "middle",
    matchPatterns: ["head of department", "head of .* department", "hod\\b", "department head", "head of faculty", "subject leader", "curriculum leader"],
    teachingPct: 0.7,
    salaryUplift: 0.2,
    minExperienceYears: 5,
    typicalTenureYears: 3,
    responsibilities: ["Line-managing department staff", "Curriculum & assessment design", "Budget management", "Staff observations & appraisals", "Data analysis & target-setting", "Recruitment input", "Parent liaison on subject matters"],
    painPoints: ["Balancing teaching with admin workload", "Difficult conversations about performance", "Insufficient non-contact time", "Caught between SLT expectations and teacher reality", "Budget constraints"],
    inAdditionToTeaching: true,
    pastoralFocus: false,
    adminFocus: false,
    onSLT: false,
    description: "First major leadership step. Leads a subject department — curriculum, staffing, budget, outcomes. Typically retains 60-80% teaching load. Salary uplift of 15-30% over classroom base.",
  },
  {
    key: "key_stage_coordinator",
    label: "Key Stage / Grade Coordinator",
    tier: "middle",
    matchPatterns: ["key stage coordinator", "key stage leader", "grade level coordinator", "year group leader", "phase leader", "head of year", "head of key stage"],
    teachingPct: 0.8,
    salaryUplift: 0.12,
    minExperienceYears: 4,
    typicalTenureYears: 3,
    responsibilities: ["Coordinating a key stage or year group", "Pastoral oversight for the cohort", "Cross-subject curriculum alignment", "Monitoring student progress across subjects", "Organising year-group events"],
    painPoints: ["Pastoral workload (behaviour, welfare)", "Coordinating across multiple departments", "Often unclear scope of authority", "Parents management"],
    inAdditionToTeaching: true,
    pastoralFocus: true,
    adminFocus: false,
    onSLT: false,
    description: "Coordinates a year group or key stage — often a pastoral-leaning role combined with teaching. Lighter admin than HoD but heavier pastoral load.",
  },
  {
    key: "ib_coordinator",
    label: "IB Programme Coordinator",
    tier: "middle",
    matchPatterns: ["ib coordinator", "pyp coordinator", "myp coordinator", "dp coordinator", "cp coordinator", "ibd?pc? coordinator", "ib programme coordinator", "diploma coordinator"],
    teachingPct: 0.5,
    salaryUplift: 0.25,
    minExperienceYears: 5,
    typicalTenureYears: 4,
    responsibilities: ["Programme implementation & IB standards compliance", "Authorization & 5-year evaluation preparation", "Faculty PD planning against IB catalogue", "Exam registration, IA samples, predicted grades (DP)", "ManageBac/Toddle/Atlas platform administration", "Parent & IBO communication", "Budget for programme resources"],
    painPoints: ["Massive administrative burden (IBIS, ManageBac)", "Evaluation cycle dominates 12-18 months of calendar", "Sometimes not treated as full SLT member despite workload", "Dual workload: teaching + heavy coordination"],
    inAdditionToTeaching: true,
    pastoralFocus: false,
    adminFocus: true,
    onSLT: false,
    description: "Operational owner of an IB programme (PYP/MYP/DP/CP). Blends curriculum leadership with heavy operations: IBIS submissions, exam logistics, platform admin. DP coordinators are almost always on SLT in practice.",
  },
  {
    key: "sen_coordinator",
    label: "SENCO / Learning Support Coordinator",
    tier: "middle",
    matchPatterns: ["senco", "sen coordinator", "sendco", "learning support coordinator", "inclusion coordinator", "head of learning support", "head of inclusion", "special educational needs"],
    teachingPct: 0.4,
    salaryUplift: 0.15,
    minExperienceYears: 5,
    typicalTenureYears: 4,
    responsibilities: ["Managing Education Health Care Plans / IEPs", "Coordinating learning support assistants", "Liaison with external specialists", "Inclusion policy & staff training", "Assessing & tracking SEN students"],
    painPoints: ["High caseload with insufficient staffing", "Emotional demands of pastoral/SEN work", "Budget constraints for interventions", "Often under-resourced vs the need"],
    inAdditionToTeaching: true,
    pastoralFocus: true,
    adminFocus: true,
    onSLT: false,
    description: "Coordinates special educational needs provision. High administrative load (IEPs, reports, external liaison) combined with teaching. Often under-resourced relative to caseload.",
  },
  {
    key: "cas_ee_tok_coordinator",
    label: "CAS / EE / TOK Coordinator",
    tier: "middle",
    matchPatterns: ["cas coordinator", "extended essay coordinator", "\\bee coordinator\\b", "tok coordinator", "theory of knowledge coordinator", "core coordinator"],
    teachingPct: 0.85,
    salaryUplift: 0.08,
    minExperienceYears: 3,
    typicalTenureYears: 3,
    responsibilities: ["Managing the IB core component (CAS/EE/TOK)", "Student supervision & milestone tracking", "Teacher coordination for supervisors", "Documentation & IB compliance"],
    painPoints: ["Added responsibility with minimal time release", "Supervising students across subject areas", "Administrative documentation"],
    inAdditionToTeaching: true,
    pastoralFocus: true,
    adminFocus: false,
    onSLT: false,
    description: "Minor IB core component coordinator. Usually a small addition to a teaching role with a modest time release. Good stepping stone to DP Coordinator.",
  },
  {
    key: "data_assessment_coordinator",
    label: "Data & Assessment Coordinator",
    tier: "middle",
    matchPatterns: ["data coordinator", "assessment coordinator", "examinations officer", "exams coordinator", "head of assessment", "data manager"],
    teachingPct: 0.3,
    salaryUplift: 0.15,
    minExperienceYears: 4,
    typicalTenureYears: 4,
    responsibilities: ["Managing school-wide assessment data", "Exam administration & logistics", "Data analysis & reporting to SLT", "Managing assessment platforms (MAP, CAT4, etc.)", "Target-setting frameworks"],
    painPoints: ["Highly administrative — limited pedagogical influence", "Seasonal exam-period stress", "Can be seen as 'back office' rather than leadership"],
    inAdditionToTeaching: true,
    pastoralFocus: false,
    adminFocus: true,
    onSLT: false,
    description: "Primarily administrative. Manages the school's data and exam systems. Low teaching load but limited pedagogical leadership — more operations than education.",
  },

  // ── EARLY SENIOR LEADERSHIP ────────────────────────────────────────────────
  {
    key: "assistant_head",
    label: "Assistant Head / Assistant Principal",
    tier: "senior",
    matchPatterns: ["assistant head", "assistant headteacher", "assistant principal", "assistant headmaster", "assistant headmistress", "assistant director", "vice principal"],
    teachingPct: 0.3,
    salaryUplift: 0.35,
    minExperienceYears: 7,
    typicalTenureYears: 3,
    responsibilities: ["Strategic school improvement planning", "Staff performance management & appraisals", "Quality assurance of teaching & learning", "Timetable development", "Parent & stakeholder communication", "Cover for Deputy/Head in absence"],
    painPoints: ["Workload intensification — rarely enough hours", "Accountability without full authority", "Balancing teaching with heavy admin", "Deputising for absent leaders adds stress"],
    inAdditionToTeaching: true,
    pastoralFocus: false,
    adminFocus: true,
    onSLT: true,
    description: "Entry into SLT. Strategic responsibility for school improvement, QA, and staff management. Usually retains some teaching (20-30%). The first role where admin genuinely competes with pedagogy.",
  },
  {
    key: "deputy_head_pastoral",
    label: "Deputy Head (Pastoral)",
    tier: "senior",
    matchPatterns: ["deputy head.*pastoral", "deputy principal.*pastoral", "pastoral deputy", "head of pastoral", "deputy head.*welfare", "deputy head.*wellbeing"],
    teachingPct: 0.15,
    salaryUplift: 0.45,
    minExperienceYears: 8,
    typicalTenureYears: 4,
    responsibilities: ["Whole-school pastoral care & wellbeing strategy", "Behaviour policy & discipline systems", "Safeguarding lead responsibilities", "Managing heads of year / pastoral team", "Crisis & incident management", "Boarding oversight (if applicable)"],
    painPoints: ["Crisis management dominates the week", "Safeguarding burden is emotionally heavy", "Parent escalation handling", "24/7 expectation in boarding contexts"],
    inAdditionToTeaching: true,
    pastoralFocus: true,
    adminFocus: true,
    onSLT: true,
    description: "Senior pastoral leader. Owns behaviour, safeguarding, wellbeing. Minimal teaching (0-15%). Crisis-driven schedule — reactive by nature. Emotionally demanding.",
  },
  {
    key: "deputy_head_academic",
    label: "Deputy Head (Academic)",
    tier: "senior",
    matchPatterns: ["deputy head.*academic", "deputy principal.*academic", "academic deputy", "deputy head.*curriculum", "director of studies", "director of teaching and learning", "director of curriculum"],
    teachingPct: 0.15,
    salaryUplift: 0.45,
    minExperienceYears: 8,
    typicalTenureYears: 4,
    responsibilities: ["Whole-school curriculum strategy & oversight", "Teaching & learning quality assurance", "Assessment & reporting systems", "Professional development programme", "Managing IB/curriculum coordinators & HoDs", "Timetable construction"],
    painPoints: ["Accountability for academic outcomes across the school", "Managing underperforming departments", "Balancing innovation with compliance", "Complex stakeholder management (board, parents, staff)"],
    inAdditionToTeaching: true,
    pastoralFocus: false,
    adminFocus: true,
    onSLT: true,
    description: "Senior academic leader. Owns curriculum, assessment, PD, and academic outcomes. Minimal teaching (0-15%). Highly strategic but heavy administrative burden.",
  },
  {
    key: "head_of_primary",
    label: "Head of Primary / Elementary Principal",
    tier: "senior",
    matchPatterns: ["head of primary", "primary principal", "head of elementary", "elementary principal", "head of lower school", "lower school principal", "head of early years"],
    teachingPct: 0.05,
    salaryUplift: 0.5,
    minExperienceYears: 8,
    typicalTenureYears: 5,
    responsibilities: ["Leading the primary division", "Staff recruitment, development & management", "Curriculum oversight for primary phase", "Parent & community relations", "Budget management for the division", "Quality assurance"],
    painPoints: ["Managing diverse stakeholder expectations", "Heavy administrative load", "Cultural sensitivity in international contexts", "Recruitment pressures"],
    inAdditionToTeaching: false,
    pastoralFocus: true,
    adminFocus: true,
    onSLT: true,
    description: "Divisional head for primary/elementary. Near-zero teaching. Full P&L and staffing responsibility for the division. Strategic leader with heavy administrative duties.",
  },
  {
    key: "head_of_secondary",
    label: "Head of Secondary / High School Principal",
    tier: "senior",
    matchPatterns: ["head of secondary", "secondary principal", "head of high school", "high school principal", "head of upper school", "upper school principal"],
    teachingPct: 0.05,
    salaryUplift: 0.5,
    minExperienceYears: 8,
    typicalTenureYears: 5,
    responsibilities: ["Leading the secondary division", "Staff recruitment & management", "Exam board liaison & results accountability", "University guidance oversight", "Curriculum (IB/IGCSE/A-Level) oversight", "Budget & resource management"],
    painPoints: ["Accountability for exam results", "Managing complex IB/A-Level programme logistics", "Stakeholder expectations (parents, universities, board)", "Heavy administrative & compliance load"],
    inAdditionToTeaching: false,
    pastoralFocus: true,
    adminFocus: true,
    onSLT: true,
    description: "Divisional head for secondary/high school. Near-zero teaching. Exam results accountability. Complex curriculum programme management. Strategic + heavily administrative.",
  },
  {
    key: "designated_safeguarding_lead",
    label: "Designated Safeguarding Lead (DSL)",
    tier: "middle",
    matchPatterns: ["designated safeguarding", "\\bdsl\\b", "safeguarding lead", "safeguarding officer", "head of safeguarding", "child protection officer"],
    teachingPct: 0.5,
    salaryUplift: 0.12,
    minExperienceYears: 5,
    typicalTenureYears: 4,
    responsibilities: ["Managing all safeguarding referrals", "Liaison with local authorities & police", "Staff safeguarding training", "Policy development & compliance", "Record-keeping & case management"],
    painPoints: ["Emotionally draining work", "Legal accountability & risk", "Often combined with teaching with inadequate time release", "Crisis-driven, unpredictable workload"],
    inAdditionToTeaching: true,
    pastoralFocus: true,
    adminFocus: true,
    onSLT: false,
    description: "Statutory safeguarding lead. Emotionally demanding, legally accountable. Often combined with a teaching role with insufficient time release. High responsibility, moderate uplift.",
  },
  {
    key: "head_teacher",
    label: "Head Teacher / Principal / Director",
    tier: "head",
    matchPatterns: ["head teacher", "headteacher", "principal\\b", "headmaster", "headmistress", "head of school", "school director", "director of school"],
    teachingPct: 0.0,
    salaryUplift: 0.8,
    minExperienceYears: 12,
    typicalTenureYears: 5,
    responsibilities: ["Overall school leadership & vision", "Board governance & reporting", "Financial oversight & strategy", "Hiring all staff", "External relations & reputation", "Setting school culture & ethos"],
    painPoints: ["Ultimate accountability for everything", "Board/governor management", "Isolation at the top", "Work-life balance challenges", "Political pressures from multiple stakeholder groups"],
    inAdditionToTeaching: false,
    pastoralFocus: false,
    adminFocus: true,
    onSLT: true,
    description: "Top of the school leadership hierarchy. Zero teaching. Ultimate accountability for all outcomes. Strategic, political, and heavily administrative. Significant salary uplift.",
  },
];

// Build a lookup map
const PROFILE_MAP = new Map(ROLE_PROFILES.map((r) => [r.key, r]));

export function getRoleProfile(key: string): RoleProfile | undefined {
  return PROFILE_MAP.get(key);
}

export function getProfilesByTier(tier: RoleTier): RoleProfile[] {
  return ROLE_PROFILES.filter((r) => r.tier === tier);
}

/** All role profiles keyed by tier for UI display. */
export const PROFILES_BY_TIER: Record<RoleTier, RoleProfile[]> = {
  classroom: getProfilesByTier("classroom"),
  middle: getProfilesByTier("middle"),
  senior: getProfilesByTier("senior"),
  head: getProfilesByTier("head"),
};

export const TIER_LABELS: Record<RoleTier, string> = {
  classroom: "Classroom Teacher",
  middle: "Middle Leadership",
  senior: "Senior Leadership (SLT)",
  head: "Head / Principal",
};

export const TIER_ORDER: RoleTier[] = ["classroom", "middle", "senior", "head"];
