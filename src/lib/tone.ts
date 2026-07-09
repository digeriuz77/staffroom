import type { OfferVerdict } from "@/lib/analysis/salary";
import type { SentimentLabel } from "@/lib/analysis/sentiment";

type Tone = "good" | "warn" | "bad" | "neutral";

export function verdictTone(v: OfferVerdict): Tone {
  if (v === "Strong offer" || v === "Competitive") return "good";
  if (v === "Fair") return "warn";
  return "bad";
}

export function sentimentTone(v: SentimentLabel): Tone {
  if (v === "Excellent" || v === "Positive") return "good";
  if (v === "Mixed") return "warn";
  return "bad";
}

export const TONE_CLASSES: Record<Tone, { text: string; bg: string; border: string; dot: string; bar: string }> = {
  good: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400", bar: "bg-emerald-400" },
  warn: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400", bar: "bg-amber-400" },
  bad: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400", bar: "bg-rose-400" },
  neutral: { text: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/30", dot: "bg-slate-400", bar: "bg-slate-400" },
};

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
