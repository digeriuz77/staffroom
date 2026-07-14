import { describe, expect, it } from "bun:test";
import { convertUsd, formatCurrency, currencySymbol } from "@/lib/finance/currency";
import { FX_RATES_STATIC } from "@/lib/data/exchangeRates";

describe("currency", () => {
  describe("convertUsd", () => {
    it("converts USD to GBP correctly", () => {
      // rate_to_usd for GBP = 1.3387, so 100 USD / 1.3387 = ~74.7 GBP
      const result = convertUsd(100, "GBP", FX_RATES_STATIC);
      expect(result).toBeCloseTo(74.7, 0);
    });

    it("converts USD to AED correctly", () => {
      // rate_to_usd for AED = 0.2723, so 100 USD / 0.2723 = ~367.2 AED
      const result = convertUsd(100, "AED", FX_RATES_STATIC);
      expect(result).toBeCloseTo(367.2, 0);
    });

    it("returns unchanged for USD to USD", () => {
      expect(convertUsd(1000, "USD", FX_RATES_STATIC)).toBe(1000);
    });

    it("falls back to USD value for unknown currency", () => {
      expect(convertUsd(500, "UNKNOWN", FX_RATES_STATIC)).toBe(500);
    });

    it("falls back when rate is 0", () => {
      expect(convertUsd(500, "USD", { USD: 0 })).toBe(500);
    });

    it("is case-insensitive on currency code", () => {
      expect(convertUsd(100, "gbp", FX_RATES_STATIC)).toBeCloseTo(
        convertUsd(100, "GBP", FX_RATES_STATIC),
        5,
      );
    });
  });

  describe("formatCurrency", () => {
    it("formats USD with dollar sign", () => {
      expect(formatCurrency(1234.5, "USD", FX_RATES_STATIC)).toBe("$1,235");
    });

    it("formats GBP with pound sign", () => {
      const result = formatCurrency(1000, "GBP", FX_RATES_STATIC);
      expect(result.startsWith("£")).toBe(true);
    });

    it("formats compact with k suffix for large amounts", () => {
      const result = formatCurrency(50000, "USD", FX_RATES_STATIC, true);
      expect(result).toContain("k");
    });

    it("formats EUR with euro sign", () => {
      expect(formatCurrency(100, "EUR", FX_RATES_STATIC).startsWith("€")).toBe(true);
    });
  });

  describe("currencySymbol", () => {
    it("returns correct symbols for known currencies", () => {
      expect(currencySymbol("USD")).toBe("$");
      expect(currencySymbol("GBP")).toBe("£");
      expect(currencySymbol("EUR")).toBe("€");
      expect(currencySymbol("JPY")).toBe("¥");
      expect(currencySymbol("THB")).toBe("฿");
    });

    it("returns code prefix for unknown currencies", () => {
      expect(currencySymbol("BRL")).toBe("BRL ");
    });
  });
});
