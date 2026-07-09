import type { SentimentPost } from "@/lib/types";

const m = (
  school: string,
  author: string,
  date: string,
  body: string,
  score: number,
  themes: string[],
  upvotes?: number
): SentimentPost => ({
  id: `static_${school.slice(0, 6)}_${date}_${Math.random().toString(36).slice(2, 7)}`,
  school,
  source: "reddit",
  provenance: "static",
  author,
  date,
  body,
  score,
  upvotes,
  themes,
  url: "https://reddit.com/r/InternationalTeachers",
});

export const STATIC_SENTIMENT: SentimentPost[] = [
  m("Dubai British School", "u/DesertTeacher", "2025-08-14", "Package is solid and paid on time. Housing allowance is decent but not luxury. Leadership approachable, workload heavy in inspection season.", 0.45, ["Salary", "Housing", "Leadership", "Workload"], 142),
  m("Dubai British School", "u/LeftDBS", "2025-03-08", "Pace is relentless and marking expectations huge. Pay fine but 60+ hour weeks. Look elsewhere for work-life balance.", -0.4, ["Workload", "Burnout"], 67),
  m("Shrewsbury International School Bangkok", "u/SawasdeeTeacher", "2025-08-18", "Lovely students and strong British ethos. Pay comfortable for Bangkok, you can save well. Heat and traffic are the trade-offs.", 0.6, ["Students", "Salary", "Lifestyle"], 174),
  m("Brighton College Bangkok", "u/BkkTeacher2025", "2025-09-15", "New campus, great resources. Some pressure on results from parents. Overall happy here.", 0.35, ["Facilities", "Parents"], 40),
  m("Singapore American School", "u/LionCityTeacher", "2025-08-22", "Incredible resources and professional community. Salary good on paper but Singapore rent has exploded, real savings lower than 2020.", 0.4, ["Facilities", "Salary", "Housing"], 203),
  m("Singapore American School", "u/SgExpat", "2025-06-30", "World-class facilities, high pressure. Best-equipped school I've worked in.", 0.3, ["Facilities", "Workload"], 56),
  m("Stamford American International School", "u/SaisTeacher", "2025-07-04", "Selective but supportive. High academic expectations matched with good support. Renewal rates are high.", 0.35, ["Culture", "Retention"], 29),
  m("Harrow Bangkok", "u/HarrowBkk", "2025-08-25", "Strong brand and good package. Long days and parent communication heavy. Recommend for career progression.", 0.25, ["Salary", "Leadership", "Career"], 88),
  m("Wellington College Tianjin", "u/ChinaExpat24", "2025-07-12", "Good allowances and housing covers a nice place. Brand expectations are intense. Air quality the real downside.", 0.1, ["Housing", "Workload"], 45),
  m("NLCS Jeju", "u/JejuTeacher", "2025-06-09", "Beautiful island, strong package, tax-free. Isolation can be tough. Students are motivated.", 0.3, ["Salary", "Lifestyle", "Students"], 60),
  m("Tanglin Trust School", "u/TanglinTrust", "2025-05-19", "Most professional environment I've experienced. Expensive city but the experience is top tier.", 0.5, ["Culture"], 18),
  m("RAK Academy", "u/RakTeacher", "2025-04-22", "Stable, tax-free, decent savings. Quieter than Dubai. Communication during restructures could be better.", 0.2, ["Salary", "Communication"], 38),
  m("British School of Bucharest", "u/BucharestT", "2025-07-19", "Solid reputation, reliable pay. Some bureaucracy with local labour law but HR handles it.", 0.3, ["Salary", "Leadership"], 25),
  m("International School of Kenya", "u/NairobiTeach", "2025-06-18", "Great lifestyle and supportive community. Package average for Nairobi. Resources improving.", 0.2, ["Lifestyle", "Salary"], 33),
  m("Stamford American International School", "u/sgteacherthrow", "2025-03-30", "Friend left after one contract citing inconsistent communication from HR. Shame as students are wonderful.", -0.15, ["Communication", "Turnover"], 9),
];

export function staticSentimentFor(schoolName: string): SentimentPost[] {
  const name = schoolName.toLowerCase();
  return STATIC_SENTIMENT.filter((p) => name.includes(p.school.toLowerCase()) || p.school.toLowerCase().includes(name.split(" ")[0]));
}
