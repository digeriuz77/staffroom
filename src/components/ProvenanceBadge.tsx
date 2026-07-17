import type { TrustTier } from "@/lib/db/types";

const TIER_META: Record<TrustTier, { label: string; className: string }> = {
  seed: {
    label: "Seed data",
    className: "border-slate-500/20 bg-slate-500/5 text-slate-400",
  },
  unverified: {
    label: "Self-reported",
    className: "border-amber-500/20 bg-amber-500/5 text-amber-400/80",
  },
  email: {
    label: "Verified",
    className: "border-indigo-500/20 bg-indigo-500/5 text-indigo-300/80",
  },
  school: {
    label: "School-verified",
    className: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80",
  },
};

export function ProvenanceBadge({ tier = "seed" }: { tier?: TrustTier }) {
  const meta = TIER_META[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}
      title={`Data trust tier: ${meta.label}`}
    >
      {meta.label}
    </span>
  );
}

export function DataDisclaimer() {
  return (
    <p className="mt-4 text-xs leading-relaxed text-slate-600">
      Salary data is self-reported and indicative. Figures are normalized to USD and
      adjusted for tax regimes where noted. Always verify offer details directly with
      the school. <a href="/about" className="text-slate-500 underline hover:text-slate-400">How we calculate →</a>
    </p>
  );
}
