import type { SalaryRecord, School } from "@/lib/types";
import { SALARIES } from "@/lib/data/schools";
import { regionOfCountry } from "@/lib/data/geo";

export interface SalaryStats {
  count: number;
  min: number;
  max: number;
  median: number;
  mean: number;
  p25: number;
  p75: number;
}

export function netValues(records: SalaryRecord[]): number[] {
  return records.map((r) => r.netMonthlyUsd).filter((n) => n > 0);
}

export function grossValues(records: SalaryRecord[]): number[] {
  return records.map((r) => r.monthlySalaryUsd).filter((n) => n > 0);
}

export function statsFor(values: number[]): SalaryStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { count: 0, min: 0, max: 0, median: 0, mean: 0, p25: 0, p75: 0 };
  const pick = (p: number) => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
    median: pick(0.5),
    mean: sorted.reduce((a, b) => a + b, 0) / n,
    p25: pick(0.25),
    p75: pick(0.75),
  };
}

export function percentileOf(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  let below = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return ((below + 0.5 * equal) / sorted.length) * 100;
}

export function recordsForRegion(region: School["region"]): SalaryRecord[] {
  return SALARIES.filter((r) => regionOfCountry(r.country) === region);
}

export function recordsForCountry(country: string): SalaryRecord[] {
  return SALARIES.filter((r) => r.country.toLowerCase() === country.trim().toLowerCase());
}

export interface HistogramBucket {
  label: string;
  count: number;
}

export function histogram(values: number[], buckets = 7): HistogramBucket[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ label: `$${Math.round(min / 1000)}k`, count: values.length }];
  const step = (max - min) / buckets;
  const result: HistogramBucket[] = [];
  for (let i = 0; i < buckets; i++) {
    const lo = min + step * i;
    const hi = i === buckets - 1 ? max : min + step * (i + 1);
    const count = values.filter((v) => v >= lo && (v < hi || (i === buckets - 1 && v <= hi + 0.01))).length;
    result.push({ label: `$${Math.round(lo / 1000)}k`, count });
  }
  return result;
}

export function formatUsd(n: number, compact?: boolean): string {
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  }
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
