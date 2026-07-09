import type { HistogramBucket } from "@/lib/analysis/finance";

export function Histogram({ data, offerValue }: { data: HistogramBucket[]; offerValue?: number }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Not enough data for a distribution.</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {data.map((d, i) => {
          const h = (d.count / max) * 100;
          const isOffer =
            offerValue != null &&
            i === data.findIndex((b) => {
              const lo = Number(b.label.replace(/\D/g, "")) * 1000;
              const next = data[i + 1];
              const hi = next ? Number(next.label.replace(/\D/g, "")) * 1000 : Infinity;
              return offerValue >= lo && offerValue < hi;
            });
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100">
                {d.count}
              </span>
              <div
                className={`w-full animate-bar rounded-t-md ${isOffer ? "bg-gradient-to-t from-fuchsia-500 to-indigo-400" : "bg-gradient-to-t from-indigo-500/40 to-indigo-400/70"}`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatBar({
  label,
  value,
  min,
  max,
  highlight,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  highlight?: boolean;
}) {
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / span) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-semibold ${highlight ? "text-white" : "text-slate-300"}`}>
          ${Math.round(value).toLocaleString()}/mo
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${highlight ? "bg-gradient-to-r from-fuchsia-500 to-indigo-400" : "bg-indigo-400/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
