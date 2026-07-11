// Static reference tax rates for international teachers (researched July 2026).
// Mirrors the country_tax_rates table seed (migration 0005). Used as the
// fallback when Supabase is not configured.
//
// effective_rate = combined income tax + employee social insurance at a typical
// international-teacher salary (~$50K-$60K USD), not the headline marginal rate.

export interface TaxRateEntry {
  country: string;
  currency: string;
  effectiveRate: number; // 0..1
  socialInsuranceRate: number | null; // 0..1
  taxRegime: string;
  takeHomePct: number; // 1 - effectiveRate
  specialNotes: string;
}

function entry(
  country: string,
  currency: string,
  effectiveRate: number,
  socialInsuranceRate: number | null,
  taxRegime: string,
  specialNotes: string,
): TaxRateEntry {
  return {
    country,
    currency,
    effectiveRate,
    socialInsuranceRate,
    taxRegime,
    takeHomePct: 1 - effectiveRate,
    specialNotes,
  };
}

export const TAX_RATES: TaxRateEntry[] = [
  // Middle East (tax-free)
  entry("United Arab Emirates", "AED", 0.00, 0.00, "Tax-free", "No personal income tax for expats; end-of-service gratuity ~21 days/yr"),
  entry("UAE", "AED", 0.00, 0.00, "Tax-free", "Alias for United Arab Emirates"),
  entry("Qatar", "QAR", 0.00, 0.00, "Tax-free", "No personal income tax; EOS gratuity 3 weeks/yr"),
  entry("Saudi Arabia", "SAR", 0.00, 0.00, "Tax-free", "No personal income tax for expats; EOS gratuity ~half-month/yr"),
  entry("Oman", "OMR", 0.00, 0.00, "Tax-free", "No personal income tax for expats; EOS gratuity 15 days/yr"),
  entry("Kuwait", "KWD", 0.00, 0.00, "Tax-free", "No personal income tax for expats; EOS gratuity 15 days/yr"),
  entry("Bahrain", "BHD", 0.00, 0.00, "Tax-free", "No personal income tax for expats; EOS gratuity 1 month/yr"),
  entry("Brunei", "BND", 0.00, 0.00, "Tax-free", "No personal income tax; CPF 5% for citizens only"),
  entry("Bahamas", "BSD", 0.00, 0.00, "Tax-free", "No personal income tax"),
  entry("Cayman Islands", "KYD", 0.00, 0.00, "Tax-free", "No personal income tax"),
  entry("Jordan", "JOD", 0.07, 0.00, "Progressive", "Progressive 7-14%; effective low at typical salary"),
  entry("Lebanon", "LBP", 0.04, 0.00, "Progressive", "Progressive 2-25% with exemptions; effective very low"),
  entry("Egypt", "EGP", 0.13, 0.11, "Progressive", "Progressive 0-27.5% + social insurance ~11%"),

  // East Asia
  entry("China", "CNY", 0.15, 0.105, "Progressive (expat allowances)", "Nominal 3-45% but expat allowances reduce effective rate (valid until Dec 2027)"),
  entry("Japan", "JPY", 0.23, 0.15, "Progressive", "Progressive 5-45% + social insurance ~15%; effective ~23%"),
  entry("South Korea", "KRW", 0.18, 0.09, "Progressive", "Progressive 6-45% + social insurance ~9%; effective ~18%"),
  entry("Taiwan", "TWD", 0.12, 0.00, "Progressive", "Progressive 5-40% for residents; effective ~12%"),
  entry("Hong Kong", "HKD", 0.15, 0.05, "Progressive (capped)", "Progressive 2-17% or standard rate cap ~15% + MPF 5%"),
  entry("Macao", "MOP", 0.12, 0.00, "Progressive", "Progressive 7-12%; low effective rate"),

  // Southeast Asia
  entry("Singapore", "SGD", 0.12, 0.00, "Progressive", "Progressive 0-24%; effective ~12%; no CPF for Employment Pass holders"),
  entry("Thailand", "THB", 0.10, 0.05, "Progressive (DTA exemption)", "Progressive 0-35%; 2-year teacher exemption via DTA for first-time teachers"),
  entry("Malaysia", "MYR", 0.15, 0.11, "Progressive", "Progressive 0-30% + EPF 11%; effective ~15%; many expat packages tax-equalized"),
  entry("Vietnam", "VND", 0.08, 0.105, "Progressive", "Progressive 5-35%; VND 15.5M/month deduction keeps effective ~8%"),
  entry("Indonesia", "IDR", 0.18, 0.04, "Progressive", "Progressive 5-35% + social insurance; effective ~18%"),
  entry("Cambodia", "KHR", 0.10, 0.05, "Progressive (territorial)", "Progressive 0-20% on domestic income; USD widely used"),
  entry("Philippines", "PHP", 0.18, 0.045, "Progressive", "Progressive 0-35% + SSS/PhilHealth; effective ~18%"),
  entry("Myanmar", "MMK", 0.15, 0.02, "Progressive", "Progressive 0-25%; effective ~15%"),

  // South Asia
  entry("India", "INR", 0.15, 0.00, "Progressive", "New regime 0-39% + 4% cess; effective ~15%"),
  entry("Pakistan", "PKR", 0.10, 0.00, "Progressive", "Progressive 0-35%; effective ~10%"),
  entry("Nepal", "NPR", 0.10, 0.00, "Progressive", "Progressive 1-36%; effective ~10%"),
  entry("Bangladesh", "BDT", 0.10, 0.00, "Progressive", "Progressive 0-30%; effective ~10%"),
  entry("Sri Lanka", "LKR", 0.12, 0.00, "Progressive", "Progressive 6-36%; effective ~12%"),
  entry("Kazakhstan", "KZT", 0.10, 0.035, "Flat", "Flat 10% + social ~3.5%"),
  entry("Uzbekistan", "UZS", 0.12, 0.00, "Flat", "Flat 12%"),
  entry("Kyrgyzstan", "KGS", 0.10, 0.00, "Flat", "Flat 10%"),
  entry("Azerbaijan", "AZN", 0.12, 0.03, "Flat", "Flat 12% + social ~3%"),

  // Europe
  entry("United Kingdom", "GBP", 0.28, 0.06, "Progressive + NI", "Income tax 20-45% + NI 8%; effective ~28%"),
  entry("Germany", "EUR", 0.38, 0.2065, "Progressive + social", "Income tax 14-45% + social ~20.65%; effective ~38%"),
  entry("Switzerland", "CHF", 0.18, 0.064, "Progressive (cantonal)", "Federal+cantonal; varies by canton (Zug ~15%, Zurich ~20%)"),
  entry("Netherlands", "EUR", 0.42, 0.275, "Progressive + social", "Box 1 progressive + social; 30% ruling reduces to ~30%"),
  entry("France", "EUR", 0.38, 0.22, "Progressive + social", "Income tax 0-45% + CSG/CRDS ~22%; inpatriate 50% exclusion"),
  entry("Spain", "EUR", 0.30, 0.0635, "Progressive (autonomous)", "Progressive 19-47%; Beckham Law 24% flat for expats"),
  entry("Italy", "EUR", 0.35, 0.0919, "Progressive + social", "Progressive 23-43% + social; impatriate 50-70% exemption"),
  entry("Portugal", "EUR", 0.32, 0.11, "Progressive", "Progressive 14.5-48%; IFICI 20% flat for qualifying"),
  entry("Belgium", "EUR", 0.40, 0.1307, "Progressive + social", "Progressive 25-50% + social; effective ~40%"),
  entry("Sweden", "SEK", 0.35, 0.07, "Progressive + municipal", "Municipal ~32% + state 20%; social 7%"),
  entry("Norway", "NOK", 0.33, 0.082, "Progressive + social", "Progressive + social; effective ~33%"),
  entry("Denmark", "DKK", 0.38, 0.08, "Progressive", "Top ~52% but effective ~38% with deductions"),
  entry("Finland", "EUR", 0.35, 0.10, "Progressive + municipal", "Progressive + municipal + social; effective ~35%"),
  entry("Poland", "PLN", 0.20, 0.1371, "Progressive", "Progressive 12-32% + social ~13.7%; effective ~20%"),
  entry("Romania", "RON", 0.10, 0.35, "Flat", "Flat 10% + social ~35%"),
  entry("Czechia", "CZK", 0.15, 0.11, "Flat", "Flat 15% + social ~11%"),
  entry("Czech Republic", "CZK", 0.15, 0.11, "Flat", "Alias for Czechia"),
  entry("Hungary", "HUF", 0.15, 0.185, "Flat", "Flat 15% + social ~18.5%"),
  entry("Bulgaria", "BGN", 0.10, 0.1378, "Flat", "Flat 10% + social ~13.8% — lowest in EU"),
  entry("Ireland", "EUR", 0.30, 0.08, "Progressive + USC", "Progressive 20-40% + USC + PRSI 4%; SARP relief above EUR 75K"),
  entry("Greece", "EUR", 0.30, 0.1333, "Progressive", "Progressive 9-44% + social; effective ~30%"),
  entry("Turkey", "TRY", 0.25, 0.15, "Progressive", "Progressive 15-40% + social; effective ~25%"),
  entry("Cyprus", "EUR", 0.20, 0.105, "Progressive", "Progressive 20-35%; non-dom regime available"),
  entry("Malta", "EUR", 0.25, 0.10, "Progressive", "Progressive 0-35%; non-dom regime available"),
  entry("Croatia", "EUR", 0.25, 0.20, "Progressive", "Progressive 20-30% + social; effective ~25%"),
  entry("Serbia", "RSD", 0.15, 0.192, "Flat", "Flat 10% + social ~19.2%"),
  entry("Lithuania", "EUR", 0.20, 0.195, "Progressive", "Progressive 20-32% + social; effective ~20%"),
  entry("Luxembourg", "EUR", 0.30, 0.1255, "Progressive", "Progressive 0-42% + social; effective ~30%"),
  entry("Slovakia", "EUR", 0.19, 0.134, "Flat", "Flat 19% + social; effective ~19%"),
  entry("Slovenia", "EUR", 0.27, 0.221, "Progressive", "Progressive 16-50% + social; effective ~27%"),
  entry("Latvia", "EUR", 0.23, 0.105, "Progressive", "Progressive 20-31% + social; basic allowance EUR 510/mo"),
  entry("Estonia", "EUR", 0.20, 0.016, "Flat", "Flat 20% (allowance EUR 654/mo) + low social"),
  entry("Iceland", "ISK", 0.30, 0.0635, "Progressive", "Progressive 31-46%; effective ~30%"),
  entry("Albania", "ALL", 0.13, 0.115, "Progressive", "Progressive 0-23% + social; effective ~13%"),
  entry("North Macedonia", "MKD", 0.10, 0.182, "Flat", "Flat 10% + social ~18.2%"),
  entry("Georgia", "GEL", 0.20, 0.02, "Flat", "Flat 20% (1% small business); low social"),

  // Americas
  entry("United States", "USD", 0.22, 0.0765, "Progressive (federal + state)", "Federal 10-37% + FICA 7.65%; varies by state"),
  entry("USA", "USD", 0.22, 0.0765, "Progressive (federal + state)", "Alias for United States"),
  entry("Canada", "CAD", 0.28, 0.0595, "Progressive (federal + provincial)", "Federal 15-33% + provincial; effective ~28%"),
  entry("Mexico", "MXN", 0.18, 0.00, "Progressive", "Progressive 1.92-35%; effective ~18%"),
  entry("Panama", "PAB", 0.15, 0.00, "Progressive (territorial)", "Progressive 0-25%; territorial; effective ~15%"),
  entry("Costa Rica", "CRC", 0.10, 0.00, "Progressive (territorial)", "Progressive 0-25%; territorial; effective ~10%"),
  entry("Guatemala", "GTQ", 0.15, 0.0483, "Progressive", "Progressive 5-25% + IGSS; effective ~15%"),
  entry("Colombia", "COP", 0.25, 0.08, "Progressive", "Progressive 0-39% + social; effective ~25%"),
  entry("Brazil", "BRL", 0.20, 0.11, "Progressive", "Progressive 0-27.5% + INSS; effective ~20%"),
  entry("Argentina", "ARS", 0.25, 0.17, "Progressive", "Progressive 5-35% + social; effective ~25%"),
  entry("Chile", "CLP", 0.15, 0.10, "Progressive", "Progressive 0-40% + social; effective ~15%"),
  entry("Peru", "PEN", 0.20, 0.09, "Progressive", "Progressive 8-30% + social; effective ~20%"),
  entry("Ecuador", "USD", 0.15, 0.0915, "Progressive", "Progressive 0-35% + social; uses USD"),
  entry("Uruguay", "UYU", 0.12, 0.1825, "Progressive", "Progressive 0-36% + social; tax-free threshold"),
  entry("Dominican Republic", "DOP", 0.18, 0.0288, "Progressive", "Progressive 0-25% + TSS; effective ~18%"),
  entry("Nicaragua", "NIO", 0.15, 0.0625, "Progressive", "Progressive 10-30% + social; effective ~15%"),
  entry("Cuba", "CUP", 0.15, 0.00, "Progressive", "Progressive 15-50%; special regimes"),

  // Africa
  entry("Nigeria", "NGN", 0.15, 0.08, "Progressive", "Progressive 7-24% + pension 8%; effective ~15%"),
  entry("Ghana", "GHS", 0.17, 0.055, "Progressive", "Progressive 0-35% + SSNIT 5.5%; effective ~17%"),
  entry("Kenya", "KES", 0.25, 0.06, "Progressive", "Progressive 10-35% + NSSF/SHELF; effective ~25%"),
  entry("Tanzania", "TZS", 0.20, 0.10, "Progressive", "Progressive 8-30% + social; effective ~20%"),
  entry("Uganda", "UGX", 0.20, 0.05, "Progressive", "Progressive 0-40% + NSSF 5%; effective ~20%"),
  entry("Ethiopia", "ETB", 0.15, 0.07, "Progressive", "Progressive 0-35% + social; effective ~15%"),
  entry("South Africa", "ZAR", 0.25, 0.01, "Progressive", "Progressive 18-45% + UIF 1%; effective ~25%"),
  entry("Mauritius", "MUR", 0.15, 0.03, "Progressive", "Progressive 0-20%; effective ~15%"),
  entry("Seychelles", "SCR", 0.15, 0.025, "Progressive", "Progressive 0-30% + social; effective ~15%"),
  entry("Morocco", "MAD", 0.20, 0.0448, "Progressive", "Progressive 0-38% + CNSS; effective ~20%"),
  entry("Tunisia", "TND", 0.15, 0.0918, "Progressive", "Progressive 0-35% + social; effective ~15%"),
  entry("Senegal", "XOF", 0.20, 0.076, "Progressive", "Progressive 0-40% + social; effective ~20%"),
  entry("Gabon", "XAF", 0.20, 0.026, "Progressive", "Progressive 0-35% + social; effective ~20%"),
  entry("Cameroon", "XAF", 0.20, 0.0428, "Progressive (special schedules)", "Progressive + social; effective ~20%"),
  entry("Zambia", "ZMW", 0.20, 0.05, "Progressive", "Progressive 0-37.5% + NAPSA; effective ~20%"),
  entry("Zimbabwe", "ZWL", 0.20, 0.045, "Progressive", "Progressive 0-40% + social; USD used; effective ~20%"),
  entry("Malawi", "MWK", 0.20, 0.05, "Progressive", "Progressive 0-40% + social; effective ~20%"),
  entry("Rwanda", "RWF", 0.20, 0.03, "Progressive", "Progressive 0-30% + RSSB; effective ~20%"),
  entry("Republic of Congo", "XAF", 0.20, 0.04, "Progressive", "Progressive 0-45% + social; effective ~20%"),
  entry("Mauritania", "MRU", 0.15, 0.06, "Progressive", "Progressive 0-40% + social; effective ~15%"),
  entry("Algeria", "DZD", 0.20, 0.09, "Progressive", "Progressive 0-35% + social; effective ~20%"),

  // Oceania
  entry("Australia", "AUD", 0.25, 0.02, "Progressive + Medicare", "Progressive 0-47% + Medicare 2%; effective ~25%"),
  entry("New Zealand", "NZD", 0.22, 0.00, "Progressive", "Progressive 10.5-39%; effective ~22%"),
  entry("Papua New Guinea", "PGK", 0.22, 0.084, "Progressive", "Progressive 0-42% + social; effective ~22%"),
  entry("Fiji", "FJD", 0.18, 0.08, "Progressive", "Progressive 0-20% + FNPF 8%; effective ~18%"),
];

const TAX_MAP = new Map(TAX_RATES.map((r) => [r.country.trim().toLowerCase(), r]));

const DEFAULT_RATE: TaxRateEntry = {
  country: "Unknown",
  currency: "USD",
  effectiveRate: 0.15,
  socialInsuranceRate: null,
  taxRegime: "Progressive",
  takeHomePct: 0.85,
  specialNotes: "Estimated default — no specific data for this country",
};

/** Look up the effective tax rate for a country (static fallback). */
export function getTaxRateStatic(country: string): TaxRateEntry {
  return TAX_MAP.get(country.trim().toLowerCase()) ?? DEFAULT_RATE;
}
