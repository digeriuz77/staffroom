import { describe, expect, it } from "bun:test";
import { getTaxRateStatic, TAX_RATES } from "@/lib/data/taxRates";

describe("taxRates", () => {
  describe("getTaxRateStatic", () => {
    it("returns 0% for UAE (tax-free)", () => {
      const rate = getTaxRateStatic("United Arab Emirates");
      expect(rate.effectiveRate).toBe(0);
      expect(rate.takeHomePct).toBe(1);
      expect(rate.taxRegime).toBe("Tax-free");
    });

    it("returns 0% for Qatar", () => {
      const rate = getTaxRateStatic("Qatar");
      expect(rate.effectiveRate).toBe(0);
    });

    it("returns non-zero for UK", () => {
      const rate = getTaxRateStatic("United Kingdom");
      expect(rate.effectiveRate).toBeGreaterThan(0);
      expect(rate.effectiveRate).toBeLessThan(0.5);
      expect(rate.takeHomePct).toBeLessThan(1);
    });

    it("returns higher rate for Germany than Singapore", () => {
      const germany = getTaxRateStatic("Germany");
      const singapore = getTaxRateStatic("Singapore");
      expect(germany.effectiveRate).toBeGreaterThan(singapore.effectiveRate);
    });

    it("falls back to default 15% for unknown countries", () => {
      const rate = getTaxRateStatic("Fictional Country");
      expect(rate.effectiveRate).toBe(0.15);
      expect(rate.country).toBe("Unknown");
    });

    it("handles UAE alias", () => {
      const alias = getTaxRateStatic("UAE");
      const full = getTaxRateStatic("United Arab Emirates");
      expect(alias.effectiveRate).toBe(full.effectiveRate);
    });

    it("takeHomePct equals 1 - effectiveRate", () => {
      for (const entry of TAX_RATES) {
        expect(entry.takeHomePct).toBeCloseTo(1 - entry.effectiveRate, 10);
      }
    });

    it("all effective rates are between 0 and 0.55", () => {
      for (const entry of TAX_RATES) {
        expect(entry.effectiveRate).toBeGreaterThanOrEqual(0);
        expect(entry.effectiveRate).toBeLessThanOrEqual(0.55);
      }
    });

    it("covers all major teaching destinations", () => {
      const mustHave = [
        "United Arab Emirates",
        "China",
        "Thailand",
        "Singapore",
        "Japan",
        "United Kingdom",
        "Germany",
        "Hong Kong",
        "Vietnam",
        "Malaysia",
        "Saudi Arabia",
        "South Korea",
      ];
      for (const country of mustHave) {
        const rate = getTaxRateStatic(country);
        expect(rate.country).not.toBe("Unknown");
      }
    });
  });
});
