import { describe, expect, it } from "bun:test";
import { assessWebsiteHealth } from "@/lib/analysis/websiteHealth";

// Helper to pad HTML past the 500-char reachability threshold.
function wrap(body: string): string {
  return `<html><head><title>Test School</title><meta name="description" content="Test School is a leading international school dedicated to excellence in education and student development across all year groups and curricula. ${" ".repeat(400)}"></meta></head><body>${body}</body></html>`;
}

describe("websiteHealth", () => {
  it("returns healthScore 0 when HTML is empty/unreachable", () => {
    const result = assessWebsiteHealth("", null, "Test School", "Dubai", "UAE", null);
    expect(result.reachable).toBe(false);
    expect(result.healthScore).toBe(0);
    expect(result.signals.some((s) => s.status === "bad")).toBe(true);
  });

  it("detects news freshness from dated content", () => {
    const html = wrap(`<div class="news">Latest update: 2026-06-15 — Sports Day photos</div>`);
    const result = assessWebsiteHealth(html, "https://test.org", "Test School", "Dubai", "UAE", null);
    expect(result.reachable).toBe(true);
    expect(result.newsRecencyDays).not.toBeNull();
    expect(result.newsRecencyDays!).toBeGreaterThan(0);
  });

  it("detects staff page and policies", () => {
    const html = wrap(`
      <a href="/our-staff">Our Staff</a>
      <a href="/safeguarding-policy">Safeguarding Policy</a>
      <a href="/inspection-report">ISI Inspection Report</a>
      <a href="/calendar">Term Dates</a>
      <a href="/careers">Current Vacancies</a>
    `);
    const result = assessWebsiteHealth(html, "https://test.org", "Test School", "Dubai", "UAE", null);
    expect(result.hasStaffPage).toBe(true);
    expect(result.hasPoliciesPage).toBe(true);
    expect(result.hasInspectionReport).toBe(true);
    expect(result.hasCalendar).toBe(true);
    expect(result.hasCareersPage).toBe(true);
    expect(result.healthScore).toBeGreaterThan(50);
  });

  it("extracts social media links", () => {
    const html = wrap(`
      <a href="https://facebook.com/testschool">FB</a>
      <a href="https://instagram.com/testschool">IG</a>
      <a href="https://twitter.com/testschool">X</a>
    `);
    const result = assessWebsiteHealth(html, "https://test.org", "Test School", "Dubai", "UAE", null);
    expect(result.socialLinks.length).toBe(3);
    expect(result.socialLinks.some((s) => s.includes("facebook"))).toBe(true);
    expect(result.socialLinks.some((s) => s.includes("instagram"))).toBe(true);
  });

  it("does NOT throw on hostnames with regex metacharacters", () => {
    const html = wrap(`<a href="/page1">Link 1</a><a href="/page2">Link 2</a>`);
    expect(() => {
      assessWebsiteHealth(html, "https://school+(name).org", "Test", "City", "Country", null);
    }).not.toThrow();
  });

  it("handles HTML shorter than 500 chars as unreachable", () => {
    const shortHtml = "<html><body>tiny</body></html>";
    const result = assessWebsiteHealth(shortHtml, null, "Test", "City", "Country", null);
    expect(result.reachable).toBe(false);
    expect(result.healthScore).toBe(0);
  });
});
