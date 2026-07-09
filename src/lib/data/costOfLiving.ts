import type { ColItem, Region } from "@/lib/types";
import { regionOfCountry } from "@/lib/data/geo";

function buyingPower(medianMonthlyUsd: number, colIndex: number): number {
  if (!colIndex) return medianMonthlyUsd;
  return (medianMonthlyUsd / colIndex) * 100;
}

type RawCity = [
  city: string,
  country: string,
  colIndex: number,
  medianMonthlyUsd: number,
  milk: number,
  beer: number,
  meal: number,
  takeaway: number,
  gym: number,
  taxi: number,
];

const RAW: RawCity[] = [
  ["Bangkok", "Thailand", 42, 3515, 1.5, 2.8, 6, 4.5, 38, 1.2],
  ["Dubai", "United Arab Emirates", 68, 5990, 2.1, 8, 15, 9, 75, 3.5],
  ["Singapore", "Singapore", 87, 8283, 3.2, 9, 18, 10, 120, 3.8],
  ["Tokyo", "Japan", 80, 3055, 1.8, 4, 12, 7, 65, 3],
  ["Shanghai", "China", 62, 5814, 1.7, 3.5, 10, 6, 45, 2],
  ["London", "United Kingdom", 100, 4500, 1.4, 6.5, 22, 12, 55, 4.5],
  ["Zurich", "Switzerland", 148, 10001, 2, 7, 30, 18, 110, 8],
  ["Mexico City", "Mexico", 38, 3191, 1.1, 2.5, 9, 6, 32, 1.5],
  ["Doha", "Qatar", 62, 5757, 1.9, 7, 14, 8, 70, 2.8],
  ["Riyadh", "Saudi Arabia", 52, 6800, 1.6, 1.5, 12, 7, 60, 2.5],
  ["Abu Dhabi", "United Arab Emirates", 66, 6100, 2, 8, 15, 9, 75, 3.3],
  ["Muscat", "Oman", 50, 5400, 1.7, 6, 11, 7, 55, 2.4],
  ["Hong Kong", "Hong Kong", 95, 8600, 3, 8, 18, 10, 90, 3.5],
  ["Kuala Lumpur", "Malaysia", 40, 3800, 1.4, 3, 7, 4.5, 35, 1.1],
  ["Ho Chi Minh City", "Vietnam", 39, 3500, 1.3, 1.8, 5, 4, 30, 0.8],
  ["Hanoi", "Vietnam", 37, 3300, 1.3, 1.8, 5, 4, 28, 0.8],
  ["Jakarta", "Indonesia", 39, 3400, 1.4, 3, 6, 4, 35, 0.9],
  ["Phnom Penh", "Cambodia", 37, 3200, 1.5, 2.5, 7, 5, 40, 1],
  ["Manila", "Philippines", 41, 3300, 1.6, 2, 7, 5, 38, 1.2],
  ["Beijing", "China", 64, 5600, 1.7, 3.5, 11, 7, 50, 2.1],
  ["Shenzhen", "China", 63, 5800, 1.8, 4, 11, 7, 55, 2],
  ["Guangzhou", "China", 58, 5200, 1.6, 3.5, 9, 6, 45, 1.8],
  ["Chengdu", "China", 48, 4500, 1.4, 3, 8, 5, 38, 1.5],
  ["Seoul", "South Korea", 83, 4800, 2.4, 4.5, 12, 7, 55, 2.8],
  ["Busan", "South Korea", 72, 4200, 2.2, 4, 10, 6, 48, 2.4],
  ["Taipei", "Taiwan", 65, 4200, 2.2, 3.5, 10, 6, 45, 2],
  ["Mumbai", "India", 35, 3800, 0.8, 3, 5, 3.5, 28, 0.7],
  ["Bangalore", "India", 33, 3500, 0.7, 2.8, 4, 3, 25, 0.7],
  ["Bangalore", "India", 33, 3500, 0.7, 2.8, 4, 3, 25, 0.7],
  ["Istanbul", "Turkey", 44, 3200, 1, 3.5, 8, 5, 32, 1],
  ["Cairo", "Egypt", 31, 3000, 0.9, 2.5, 6, 4, 28, 0.8],
  ["Nairobi", "Kenya", 43, 3400, 1.2, 3, 8, 5, 40, 1.5],
  ["Lagos", "Nigeria", 45, 3600, 1.5, 2.5, 9, 6, 45, 1.2],
  ["Accra", "Ghana", 47, 3300, 1.4, 2.8, 8, 5, 42, 1.3],
  ["Johannesburg", "South Africa", 46, 3200, 1.1, 2.5, 9, 6, 38, 1.1],
  ["Berlin", "Germany", 72, 4500, 1.2, 4, 15, 9, 45, 2.8],
  ["Munich", "Germany", 82, 4800, 1.3, 4.5, 17, 10, 55, 3.2],
  ["Amsterdam", "Netherlands", 79, 4800, 1.3, 5, 18, 11, 55, 3.2],
  ["Paris", "France", 80, 4300, 1.3, 6, 18, 12, 50, 3],
  ["Madrid", "Spain", 60, 3400, 1.1, 3.5, 14, 9, 42, 2.2],
  ["Barcelona", "Spain", 64, 3500, 1.1, 3.5, 15, 9, 45, 2.3],
  ["Lisbon", "Portugal", 55, 3200, 1.1, 2.5, 13, 8, 40, 2],
  ["Rome", "Italy", 67, 3500, 1.4, 5, 18, 11, 50, 2.8],
  ["Milan", "Italy", 75, 3800, 1.5, 5.5, 20, 12, 55, 3],
  ["Warsaw", "Poland", 45, 3400, 1.1, 3, 12, 7, 38, 1.5],
  ["Prague", "Czech Republic", 50, 3400, 1.2, 2.5, 12, 7, 40, 1.6],
  ["Bucharest", "Romania", 38, 3000, 1.1, 2.5, 11, 6, 32, 1.3],
  ["Vienna", "Austria", 73, 4200, 1.4, 4.5, 17, 10, 52, 2.8],
  ["Brussels", "Belgium", 76, 4400, 1.4, 4.5, 18, 11, 50, 3],
  ["Geneva", "Switzerland", 132, 7500, 2, 7, 28, 17, 110, 7],
  ["New York", "United States", 117, 6500, 1.5, 8, 25, 15, 70, 4],
  ["San Francisco", "United States", 115, 7000, 1.6, 8, 25, 16, 90, 4],
  ["Houston", "United States", 78, 5000, 1.2, 6, 20, 12, 45, 3],
  ["Mexico City", "Mexico", 38, 3191, 1.1, 2.5, 9, 6, 32, 1.5],
  ["Sao Paulo", "Brazil", 47, 4200, 1.2, 2.5, 14, 8, 45, 1.8],
  ["Buenos Aires", "Argentina", 36, 4500, 1, 3, 11, 7, 38, 1],
  ["Santiago", "Chile", 49, 3800, 1.2, 3.5, 13, 8, 42, 1.6],
  ["Lima", "Peru", 41, 3500, 1.2, 3, 11, 7, 40, 1.4],
  ["Bogota", "Colombia", 40, 3500, 1.2, 2.5, 10, 6, 38, 1.3],
  ["Panama City", "Panama", 56, 4500, 1.6, 3, 14, 9, 55, 2],
  ["Auckland", "New Zealand", 88, 4000, 1.6, 6, 18, 11, 45, 3],
  ["Sydney", "Australia", 95, 4500, 1.6, 7, 20, 12, 50, 3.2],
];

const deduped: RawCity[] = [];
const seen = new Set<string>();
for (const row of RAW) {
  const key = row[0].toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(row);
}

export const COST_OF_LIVING: ColItem[] = deduped.map(([city, country, colIndex, medianMonthlyUsd, milk, beer, meal, takeaway, gym, taxi]) => ({
  city,
  country,
  region: regionOfCountry(country) as Region,
  countryCode: "",
  colIndex,
  medianMonthlyUsd,
  buyingPowerUsd: buyingPower(medianMonthlyUsd, colIndex),
  milk,
  beer,
  meal,
  takeaway,
  gym,
  taxi,
}));

export function colForCity(city: string): ColItem | undefined {
  const key = city.trim().toLowerCase();
  return COST_OF_LIVING.find((c) => c.city.toLowerCase() === key);
}

export function colNearest(city: string, country: string): ColItem | undefined {
  const direct = colForCity(city);
  if (direct) return direct;
  const byCountry = COST_OF_LIVING.find((c) => c.country.toLowerCase() === country.trim().toLowerCase());
  return byCountry;
}

export function monthlyLivingCostUsd(item: ColItem): number {
  const rent = (item.colIndex / 100) * 1400;
  const groceries = item.milk * 30 + item.meal * 6 + item.takeaway * 4;
  const transport = item.taxi * 30;
  const utilities = (item.colIndex / 100) * 150;
  return rent + groceries + transport + utilities + item.gym;
}
