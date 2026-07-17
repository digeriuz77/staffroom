import { describe, expect, it } from "bun:test";
import {
  PLATFORM_REGISTRY,
  buildDeepLinks,
  automatableSources,
  registryStats,
  getPlatform,
  REGISTRY_BY_CATEGORY,
} from "@/lib/data/platformRegistry";

describe("platformRegistry", () => {
  it("has a non-empty registry", () => {
    expect(PLATFORM_REGISTRY.length).toBeGreaterThan(20);
  });

  it("every entry has a valid searchUrl function", () => {
    for (const p of PLATFORM_REGISTRY) {
      expect(typeof p.searchUrl).toBe("function");
      const url = p.searchUrl("Test School");
      expect(url).toContain("Test%20School");
    }
  });

  it("every entry has all required metadata fields", () => {
    for (const p of PLATFORM_REGISTRY) {
      expect(p.key).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.url).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.dataType.length).toBeGreaterThan(0);
      expect(p.scrapeFeasibility).toMatch(/^(high|medium|low|none)$/);
      expect(p.access).toMatch(/^(free|freemium|paid|membership|free_with_auth)$/);
      expect(p.priority).toBeGreaterThanOrEqual(1);
      expect(p.priority).toBeLessThanOrEqual(5);
    }
  });

  it("automatableSources only returns high/medium feasibility + free/freemium", () => {
    const auto = automatableSources();
    for (const p of auto) {
      const feasible = p.scrapeFeasibility === "high" || p.scrapeFeasibility === "medium";
      const accessible = p.access === "free" || p.access === "freemium";
      expect(feasible && accessible).toBe(true);
    }
    expect(auto.length).toBeGreaterThan(0);
  });

  it("buildDeepLinks generates URLs sorted by priority", () => {
    const links = buildDeepLinks("British School");
    expect(links.length).toBeGreaterThan(5);
    for (let i = 1; i < links.length; i++) {
      expect(links[i].priority).toBeLessThanOrEqual(links[i - 1].priority);
    }
  });

  it("buildDeepLinks filters by category", () => {
    const salaryLinks = buildDeepLinks("Test", { category: "salary_db" });
    for (const l of salaryLinks) {
      expect(l.category).toBe("salary_db");
    }
    expect(salaryLinks.length).toBeGreaterThan(0);
  });

  it("getPlatform returns the right entry by key", () => {
    const p = getPlatform("tes");
    expect(p).toBeDefined();
    expect(p!.label).toBe("Tes Jobs");
  });

  it("getPlatform returns undefined for unknown key", () => {
    expect(getPlatform("nonexistent")).toBeUndefined();
  });

  it("registryStats returns correct counts", () => {
    const stats = registryStats();
    expect(stats.total).toBe(PLATFORM_REGISTRY.length);
    expect(stats.automatable).toBeGreaterThan(0);
    expect(stats.byCategory.social).toBeGreaterThan(0);
  });

  it("REGISTRY_BY_CATEGORY covers all categories", () => {
    const categories = Object.keys(REGISTRY_BY_CATEGORY);
    expect(categories).toContain("salary_db");
    expect(categories).toContain("forum");
    expect(categories).toContain("accreditation");
    expect(categories).toContain("social");
  });

  it("no duplicate keys in registry", () => {
    const keys = PLATFORM_REGISTRY.map((p) => p.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("includes Reddit subreddits as automatable", () => {
    const auto = automatableSources();
    const redditKeys = auto.filter((p) => p.key.startsWith("reddit_")).map((p) => p.key);
    expect(redditKeys.length).toBeGreaterThan(3);
  });

  it("includes key accreditation directories", () => {
    const accredKeys = REGISTRY_BY_CATEGORY.accreditation.map((p) => p.key);
    expect(accredKeys).toContain("cobis");
    expect(accredKeys).toContain("cis");
    expect(accredKeys).toContain("ib_world");
  });
});
