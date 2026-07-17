-- Country tax rates reference table + static FX rate seed.
-- Data researched July 2026 (PwC, OECD, Trading Economics, IRAS, HMRC, IMF).
-- Effective rates reflect the combined income tax + employee social insurance
-- burden at a typical international-teacher salary (~$50K-$60K USD), not the
-- headline marginal rate.

-- ===========================================================================
-- COUNTRY TAX RATES
-- ===========================================================================
create table if not exists country_tax_rates (
  id uuid primary key default gen_random_uuid(),
  country text not null unique,
  currency text not null default 'USD',
  effective_rate numeric not null default 0,        -- combined effective rate 0..1
  social_insurance_rate numeric,                    -- employee social insurance 0..1 (nullable)
  tax_regime text not null default 'Progressive',
  take_home_pct numeric generated always as (1.0 - effective_rate) stored,
  special_notes text,
  source text not null default 'research-2026',
  updated_at timestamptz not null default now()
);
create index if not exists country_tax_rates_country_idx on country_tax_rates (country);
alter table country_tax_rates enable row level security;
create policy "tax_rates read" on country_tax_rates for select using (true);

-- Enable updates from the service role (worker can refresh rates).
create policy "tax_rates service write" on country_tax_rates
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- SEED: Tax rates by country (effective rates for international teachers)
-- ---------------------------------------------------------------------------
insert into country_tax_rates (country, currency, effective_rate, social_insurance_rate, tax_regime, special_notes) values
-- Middle East (tax-free)
('United Arab Emirates', 'AED', 0.00, 0.00, 'Tax-free', 'No personal income tax for expats; end-of-service gratuity ~21 days/yr'),
('UAE', 'AED', 0.00, 0.00, 'Tax-free', 'Alias for United Arab Emirates'),
('Qatar', 'QAR', 0.00, 0.00, 'Tax-free', 'No personal income tax; EOS gratuity 3 weeks/yr'),
('Saudi Arabia', 'SAR', 0.00, 0.00, 'Tax-free', 'No personal income tax for expats; EOS gratuity ~half-month/yr'),
('Oman', 'OMR', 0.00, 0.00, 'Tax-free', 'No personal income tax for expats; EOS gratuity 15 days/yr'),
('Kuwait', 'KWD', 0.00, 0.00, 'Tax-free', 'No personal income tax for expats; EOS gratuity 15 days/yr'),
('Bahrain', 'BHD', 0.00, 0.00, 'Tax-free', 'No personal income tax for expats; EOS gratuity 1 month/yr'),
('Brunei', 'BND', 0.00, 0.00, 'Tax-free', 'No personal income tax; CPF 5% for citizens only'),
('Bahamas', 'BSD', 0.00, 0.00, 'Tax-free', 'No personal income tax'),
('Cayman Islands', 'KYD', 0.00, 0.00, 'Tax-free', 'No personal income tax'),
('Jordan', 'JOD', 0.07, 0.00, 'Progressive', 'Progressive 7-14% bands; effective low at typical salary'),
('Lebanon', 'LBP', 0.04, 0.00, 'Progressive', 'Progressive 2-25% with exemptions; effective very low in practice'),
('Egypt', 'EGP', 0.13, 0.11, 'Progressive', 'Progressive 0-27.5% + social insurance ~11%'),

-- East Asia
('China', 'CNY', 0.15, 0.105, 'Progressive (expat allowances)', 'Nominal 3-45% but expat housing/education/home-leave allowances reduce effective rate substantially (valid until Dec 2027)'),
('Japan', 'JPY', 0.23, 0.15, 'Progressive', 'Progressive 5-45% + social insurance ~15%; effective ~23% at typical salary'),
('South Korea', 'KRW', 0.18, 0.09, 'Progressive', 'Progressive 6-45% + social insurance ~9%; effective ~18%'),
('Taiwan', 'TWD', 0.12, 0.00, 'Progressive', 'Progressive 5-40% for residents; effective ~12% at typical salary'),
('Hong Kong', 'HKD', 0.15, 0.05, 'Progressive (capped)', 'Progressive 2-17% or standard rate cap ~15% + MPF 5%; one of lowest globally'),
('Macao', 'MOP', 0.12, 0.00, 'Progressive', 'Progressive 7-12%; low effective rate'),

-- Southeast Asia
('Singapore', 'SGD', 0.12, 0.00, 'Progressive', 'Progressive 0-24%; effective ~12% at typical salary; no CPF for Employment Pass holders'),
('Thailand', 'THB', 0.10, 0.05, 'Progressive (DTA exemption)', 'Progressive 0-35% + social insurance; 2-year teacher exemption via DTA for first-time teachers from treaty countries (US, UK, AUS, etc.)'),
('Malaysia', 'MYR', 0.15, 0.11, 'Progressive', 'Progressive 0-30% + EPF 11%; effective ~15% at typical salary; many expat packages tax-equalized'),
('Vietnam', 'VND', 0.08, 0.105, 'Progressive', 'Progressive 5-35% but VND 15.5M/month personal deduction (2026) keeps effective rate ~8% for typical teachers'),
('Indonesia', 'IDR', 0.18, 0.04, 'Progressive', 'Progressive 5-35% + social insurance; effective ~18% at typical salary'),
('Cambodia', 'KHR', 0.10, 0.05, 'Progressive (territorial)', 'Progressive 0-20% on domestic income; USD widely used; territorial system'),
('Philippines', 'PHP', 0.18, 0.045, 'Progressive', 'Progressive 0-35% + SSS/PhilHealth; effective ~18% at typical salary'),
('Myanmar', 'MMK', 0.15, 0.02, 'Progressive', 'Progressive 0-25% effective ~15%'),

-- South Asia
('India', 'INR', 0.15, 0.00, 'Progressive', 'New regime: progressive 0-39% + 4% cess; standard deduction + NPS; effective ~15%'),
('Pakistan', 'PKR', 0.10, 0.00, 'Progressive', 'Progressive 0-35%; effective ~10% at typical salary'),
('Nepal', 'NPR', 0.10, 0.00, 'Progressive', 'Progressive 1-36%; effective ~10%'),
('Bangladesh', 'BDT', 0.10, 0.00, 'Progressive', 'Progressive 0-30%; effective ~10% at typical salary'),
('Sri Lanka', 'LKR', 0.12, 0.00, 'Progressive', 'Progressive 6-36%; effective ~12%'),
('Kazakhstan', 'KZT', 0.10, 0.035, 'Flat', 'Flat 10% personal income tax + social ~3.5%'),
('Uzbekistan', 'UZS', 0.12, 0.00, 'Flat', 'Flat 12% personal income tax'),
('Kyrgyzstan', 'KGS', 0.10, 0.00, 'Flat', 'Flat 10% personal income tax'),
('Azerbaijan', 'AZN', 0.12, 0.03, 'Flat', 'Flat 12% (progressive up to 25% for high earners) + social ~3%'),

-- Europe
('United Kingdom', 'GBP', 0.28, 0.06, 'Progressive + NI', 'Income tax 20-45% + NI 8% on earnings; effective ~28% at typical salary; personal allowance £12,570'),
('Germany', 'EUR', 0.38, 0.2065, 'Progressive + social', 'Income tax 14-45% + solidarity + social insurance ~20.65% (capped); effective ~38%'),
('Switzerland', 'CHF', 0.18, 0.064, 'Progressive (cantonal)', 'Federal 11.5% + cantonal/municipal; varies by canton (Zug ~15%, Zurich ~20%, Geneva ~25%); AHV/IV ~6.4%'),
('Netherlands', 'EUR', 0.42, 0.275, 'Progressive + social', 'Box 1 progressive + social insurance; 30% ruling reduces to ~30% for qualifying expats'),
('France', 'EUR', 0.38, 0.22, 'Progressive + social', 'Income tax 0-45% + CSG/CRDS ~22%; inpatriate regime 50% exclusion for qualifying expats'),
('Spain', 'EUR', 0.30, 0.0635, 'Progressive (autonomous)', 'Progressive 19-47% by region + social; Beckham Law 24% flat for 6 years'),
('Italy', 'EUR', 0.35, 0.0919, 'Progressive + social', 'Progressive 23-43% + social; impatriate regime 50-70% income exemption for 5 years'),
('Portugal', 'EUR', 0.32, 0.11, 'Progressive', 'Progressive 14.5-48% + social; IFICI 20% flat for qualifying'),
('Belgium', 'EUR', 0.40, 0.1307, 'Progressive + social', 'Progressive 25-50% + social; effective ~40% — one of highest globally'),
('Sweden', 'SEK', 0.35, 0.07, 'Progressive + municipal', 'Municipal ~32% + state 20% above threshold; social 7%'),
('Norway', 'NOK', 0.33, 0.082, 'Progressive + social', 'Progressive + social insurance; effective ~33%'),
('Denmark', 'DKK', 0.38, 0.08, 'Progressive', 'Top rate ~52% but effective ~38% at typical salary with deductions'),
('Finland', 'EUR', 0.35, 0.10, 'Progressive + municipal', 'Progressive + municipal; social ~10%; effective ~35%'),
('Poland', 'PLN', 0.20, 0.1371, 'Progressive', 'Progressive 12-32% + social ~13.7%; effective ~20%'),
('Romania', 'RON', 0.10, 0.35, 'Flat', 'Flat 10% income tax + social ~35% (reduced for IT/tech)'),
('Czechia', 'CZK', 0.15, 0.11, 'Flat', 'Flat 15% income tax + social ~11%'),
('Czech Republic', 'CZK', 0.15, 0.11, 'Flat', 'Alias for Czechia'),
('Hungary', 'HUF', 0.15, 0.185, 'Flat', 'Flat 15% income tax + social ~18.5%'),
('Bulgaria', 'BGN', 0.10, 0.1378, 'Flat', 'Flat 10% income tax + social ~13.8% — lowest in EU'),
('Ireland', 'EUR', 0.30, 0.08, 'Progressive + USC', 'Progressive 20-40% + USC + PRSI 4%; SARP relief on income above €75K'),
('Greece', 'EUR', 0.30, 0.1333, 'Progressive', 'Progressive 9-44% + social; effective ~30%'),
('Turkey', 'TRY', 0.25, 0.15, 'Progressive', 'Progressive 15-40% + social; effective ~25% (high inflation context)'),
('Cyprus', 'EUR', 0.20, 0.105, 'Progressive', 'Progressive 20-35% + social; non-dom regime available; effective ~20%'),
('Malta', 'EUR', 0.25, 0.10, 'Progressive', 'Progressive 0-35% + social; non-dom regime available; effective ~25%'),
('Croatia', 'EUR', 0.25, 0.20, 'Progressive', 'Progressive 20-30% + social; effective ~25%'),
('Serbia', 'RSD', 0.15, 0.192, 'Flat', 'Flat 10% income tax + social ~19.2%'),
('Lithuania', 'EUR', 0.20, 0.195, 'Progressive', 'Progressive 20-32% + social; effective ~20%'),
('Luxembourg', 'EUR', 0.30, 0.1255, 'Progressive', 'Progressive 0-42% + social; effective ~30%'),
('Slovakia', 'EUR', 0.19, 0.134, 'Flat', 'Flat 19% + social; effective ~19%'),
('Slovenia', 'EUR', 0.27, 0.221, 'Progressive', 'Progressive 16-50% + social; effective ~27%'),
('Latvia', 'EUR', 0.23, 0.105, 'Progressive', 'Progressive 20-31% + social; basic allowance EUR 510/mo (2025)'),
('Estonia', 'EUR', 0.20, 0.016, 'Flat', 'Flat 20% (basic allowance EUR 654/mo) + low unemployment insurance'),
('Iceland', 'ISK', 0.30, 0.0635, 'Progressive', 'Progressive 31.45-46.24%; effective ~30%'),
('Albania', 'ALL', 0.13, 0.115, 'Progressive', 'Progressive 0-23% + social; effective ~13%'),
('North Macedonia', 'MKD', 0.10, 0.182, 'Flat', 'Flat 10% + social ~18.2%'),
('Georgia', 'GEL', 0.20, 0.02, 'Flat', 'Flat 20% (1% for small business); very low social'),

-- Americas
('United States', 'USD', 0.22, 0.0765, 'Progressive (federal + state)', 'Federal 10-37% + FICA 7.65%; varies by state (0% TX/FL to ~13% CA/NYC)'),
('USA', 'USD', 0.22, 0.0765, 'Progressive (federal + state)', 'Alias for United States'),
('Canada', 'CAD', 0.28, 0.0595, 'Progressive (federal + provincial)', 'Federal 15-33% + provincial; CPP/EI; effective ~28% (Ontario)'),
('Mexico', 'MXN', 0.18, 0.00, 'Progressive', 'Progressive 1.92-35%; effective ~18% at typical salary'),
('Panama', 'PAB', 0.15, 0.00, 'Progressive (territorial)', 'Progressive 0-25%; territorial taxation for foreign-source income; effective ~15%'),
('Costa Rica', 'CRC', 0.10, 0.00, 'Progressive (territorial)', 'Progressive 0-25%; territorial taxation; effective ~10%'),
('Guatemala', 'GTQ', 0.15, 0.0483, 'Progressive', 'Progressive 5-25% + IGSS; effective ~15%'),
('Colombia', 'COP', 0.25, 0.08, 'Progressive', 'Progressive 0-39% + social; effective ~25%'),
('Brazil', 'BRL', 0.20, 0.11, 'Progressive', 'Progressive 0-27.5% + INSS; effective ~20%'),
('Argentina', 'ARS', 0.25, 0.17, 'Progressive', 'Progressive 5-35% + social; effective ~25% (high inflation)'),
('Chile', 'CLP', 0.15, 0.10, 'Progressive', 'Progressive 0-40% + social; effective ~15% at typical salary'),
('Peru', 'PEN', 0.20, 0.09, 'Progressive', 'Progressive 8-30% + social; effective ~20%'),
('Ecuador', 'USD', 0.15, 0.0915, 'Progressive', 'Progressive 0-35% + social; effective ~15% (uses USD)'),
('Uruguay', 'UYU', 0.12, 0.1825, 'Progressive', 'Progressive 0-36% + social; tax-free threshold; effective ~12% for first years'),
('Dominican Republic', 'DOP', 0.18, 0.0288, 'Progressive', 'Progressive 0-25% + TSS; effective ~18%'),
('Nicaragua', 'NIO', 0.15, 0.0625, 'Progressive', 'Progressive 10-30% + social; effective ~15%'),
('Cuba', 'CUP', 0.15, 0.00, 'Progressive', 'Progressive 15-50%; special regimes; effective ~15% for foreign-paid roles'),

-- Africa
('Nigeria', 'NGN', 0.15, 0.08, 'Progressive', 'Progressive 7-24% + pension 8%; effective ~15%'),
('Ghana', 'GHS', 0.17, 0.055, 'Progressive', 'Progressive 0-35% + SSNIT 5.5%; effective ~17%'),
('Kenya', 'KES', 0.25, 0.06, 'Progressive', 'Progressive 10-35% + NSSF/SHELF; effective ~25%'),
('Tanzania', 'TZS', 0.20, 0.10, 'Progressive', 'Progressive 8-30% + social; effective ~20%'),
('Uganda', 'UGX', 0.20, 0.05, 'Progressive', 'Progressive 0-40% + NSSF 5%; effective ~20%'),
('Ethiopia', 'ETB', 0.15, 0.07, 'Progressive', 'Progressive 0-35% + social; effective ~15%'),
('South Africa', 'ZAR', 0.25, 0.01, 'Progressive', 'Progressive 18-45% + UIF 1%; effective ~25%'),
('Mauritius', 'MUR', 0.15, 0.03, 'Progressive', 'Progressive 0-20%; effective ~15%'),
('Seychelles', 'SCR', 0.15, 0.025, 'Progressive', 'Progressive 0-30% + social; effective ~15%'),
('Morocco', 'MAD', 0.20, 0.0448, 'Progressive', 'Progressive 0-38% + CNSS; effective ~20%'),
('Tunisia', 'TND', 0.15, 0.0918, 'Progressive', 'Progressive 0-35% + social; effective ~15%'),
('Senegal', 'XOF', 0.20, 0.076, 'Progressive', 'Progressive 0-40% + social; effective ~20%'),
('Gabon', 'XAF', 0.20, 0.026, 'Progressive', 'Progressive 0-35% + social; effective ~20%'),
('Cameroon', 'XAF', 0.20, 0.0428, 'Progressive (special schedules)', 'Progressive with special schedules + social; effective ~20%'),
('Zambia', 'ZMW', 0.20, 0.05, 'Progressive', 'Progressive 0-37.5% + NAPSA; effective ~20%'),
('Zimbabwe', 'ZWL', 0.20, 0.045, 'Progressive', 'Progressive 0-40% + social; USD commonly used; effective ~20%'),
('Malawi', 'MWK', 0.20, 0.05, 'Progressive', 'Progressive 0-40% + social; effective ~20%'),
('Rwanda', 'RWF', 0.20, 0.03, 'Progressive', 'Progressive 0-30% + RSSB; effective ~20%'),
('Republic of Congo', 'XAF', 0.20, 0.04, 'Progressive', 'Progressive 0-45% + social; effective ~20%'),
('Mauritania', 'MRU', 0.15, 0.06, 'Progressive', 'Progressive 0-40% + social; effective ~15%'),
('Algeria', 'DZD', 0.20, 0.09, 'Progressive', 'Progressive 0-35% + social; effective ~20%'),

-- Oceania
('Australia', 'AUD', 0.25, 0.02, 'Progressive + Medicare', 'Progressive 0-47% (reduced in 2025) + Medicare 2%; effective ~25%; employer pays 11% super'),
('New Zealand', 'NZD', 0.22, 0.00, 'Progressive', 'Progressive 10.5-39%; KiwiSaver optional; effective ~22%'),
('Papua New Guinea', 'PGK', 0.22, 0.084, 'Progressive', 'Progressive 0-42% + social; effective ~22%'),
('Fiji', 'FJD', 0.18, 0.08, 'Progressive', 'Progressive 0-20% + FNPF 8%; effective ~18%')

on conflict (country) do update set
  currency = excluded.currency,
  effective_rate = excluded.effective_rate,
  social_insurance_rate = excluded.social_insurance_rate,
  tax_regime = excluded.tax_regime,
  special_notes = excluded.special_notes,
  source = excluded.source,
  updated_at = now();

-- ===========================================================================
-- STATIC FX RATES (seed — refreshed by the `fx` worker job)
-- rate_to_usd = 1 / (units per USD).  e.g. AED: 1/3.6727 = 0.2723
-- Data: IMF, Federal Reserve H.10, ECB, HMRC — July 2026
-- ===========================================================================
insert into fx_rates (currency, rate_to_usd, fetched_at) values
('USD', 1.0000, now()),
('AED', 0.2723, now()),
('QAR', 0.2747, now()),
('SAR', 0.2667, now()),
('OMR', 2.5974, now()),
('KWD', 3.2573, now()),
('BHD', 2.6596, now()),
('JOD', 1.4104, now()),
('GBP', 1.3387, now()),
('EUR', 1.1422, now()),
('CHF', 1.1240, now()),
('JPY', 0.00616, now()),
('CNY', 0.1471, now()),
('HKD', 0.1280, now()),
('KRW', 0.000666, now()),
('TWD', 0.03077, now()),
('SGD', 0.7806, now()),
('THB', 0.02778, now()),
('MYR', 0.2453, now()),
('VND', 0.00004, now()),
('IDR', 0.0000606, now()),
('PHP', 0.01754, now()),
('MMK', 0.000476, now()),
('INR', 0.01198, now()),
('PKR', 0.0036, now()),
('BDT', 0.00855, now()),
('NPR', 0.00752, now()),
('LKR', 0.00336, now()),
('AUD', 0.7130, now()),
('NZD', 0.6060, now()),
('CAD', 0.7299, now()),
('PGK', 0.2632, now()),
('FJD', 0.4444, now()),
('BRL', 0.1887, now()),
('MXN', 0.05714, now()),
('PAB', 1.0000, now()),
('CRC', 0.00192, now()),
('GTQ', 0.1282, now()),
('COP', 0.000244, now()),
('ARS', 0.00111, now()),
('CLP', 0.001053, now()),
('PEN', 0.2667, now()),
('UYU', 0.0250, now()),
('DOP', 0.01695, now()),
('NGN', 0.000667, now()),
('GHS', 0.0667, now()),
('KES', 0.00775, now()),
('TZS', 0.000385, now()),
('UGX', 0.000270, now()),
('ETB', 0.0080, now()),
('ZAR', 0.0556, now()),
('MUR', 0.0213, now()),
('SCR', 0.0714, now()),
('MAD', 0.1000, now()),
('TND', 0.3175, now()),
('XOF', 0.00167, now()),
('XAF', 0.00167, now()),
('EGP', 0.0208, now()),
('LBP', 0.0000112, now()),
('DZD', 0.00746, now()),
('ZMW', 0.0385, now()),
('ZWL', 0.00278, now()),
('PLN', 0.2564, now()),
('CZK', 0.04444, now()),
('HUF', 0.002778, now()),
('BGN', 0.5848, now()),
('RON', 0.2198, now()),
('RSD', 0.00917, now()),
('SEK', 0.0962, now()),
('NOK', 0.0943, now()),
('DKK', 0.1534, now()),
('ISK', 0.007143, now()),
('RUB', 0.01176, now()),
('UAH', 0.02439, now()),
('TRY', 0.02632, now()),
('GEL', 0.3704, now()),
('MKD', 0.01754, now()),
('ALL', 0.01064, now()),
('AZN', 0.5882, now()),
('KZT', 0.00213, now()),
('UZS', 0.0000794, now()),
('KGS', 0.01149, now()),
('BND', 0.7407, now()),
('KHR', 0.000250, now()),
('MOP', 0.1280, now()),
('KYD', 1.2000, now()),
('BSD', 1.0000, now()),
('NIO', 0.02703, now()),
('MWK', 0.000578, now()),
('RWF', 0.000769, now()),
('CUP', 0.04167, now()),
('MRU', 0.0250, now())

on conflict (currency) do update set
  rate_to_usd = excluded.rate_to_usd,
  fetched_at = now();
