import { describe, expect, it } from "bun:test";
import { aggregateThemesFromPosts, bucketByThemes, canonicalTheme } from "@/lib/ai/clustering";
import type { ClusterPost } from "@/lib/ai/clustering";

// Clustering post constructor with sensible defaults.
function mk(over: Partial<ClusterPost> = {}): ClusterPost {
  return {
    id: over.id ?? "p1",
    embedding: over.embedding ?? null,
    sentiment_score: over.sentiment_score ?? 0,
    themes: over.themes ?? null,
    title: over.title ?? null,
    body: over.body ?? null,
  };
}

describe("canonicalTheme", () => {
  it("maps Salary -> Pay", () => {
    expect(canonicalTheme("Salary")).toBe("Pay");
  });

  it("maps Leadership -> Management", () => {
    expect(canonicalTheme("Leadership")).toBe("Management");
  });

  it("passes through all other lexicon labels unchanged", () => {
    for (const label of [
      "Housing",
      "Workload",
      "Turnover",
      "Culture",
      "Students",
      "Parents",
      "Facilities",
      "Tax & savings",
    ]) {
      expect(canonicalTheme(label)).toBe(label);
    }
  });
});

describe("aggregateThemesFromPosts (live inline themes)", () => {
  it("groups lexicon tags into canonical themes with averaged sentiment", () => {
    const themes = aggregateThemesFromPosts([
      { themes: ["Salary", "Housing"], sentiment: 0.5 },
      { themes: ["Salary"], sentiment: -0.3 },
      { themes: ["Leadership"], sentiment: 0.1 },
    ]);
    const byLabel = new Map(themes.map((t) => [t.label, t]));
    expect(byLabel.get("Pay")?.count).toBe(2);
    expect(byLabel.get("Pay")?.sentiment).toBe(0.1); // (0.5 + -0.3) / 2
    expect(byLabel.get("Management")?.count).toBe(1);
    expect(byLabel.get("Housing")?.count).toBe(1);
  });

  it("is sorted by descending post count", () => {
    const themes = aggregateThemesFromPosts([
      { themes: ["Housing"], sentiment: 0 },
      { themes: ["Salary", "Workload"], sentiment: 0 },
      { themes: ["Salary"], sentiment: 0 },
    ]);
    expect(themes[0].label).toBe("Pay");
    expect(themes[0].count).toBe(2);
  });

  it("returns nothing for posts without themes", () => {
    expect(aggregateThemesFromPosts([{ themes: null, sentiment: 0 }])).toEqual([]);
    expect(aggregateThemesFromPosts([{ themes: [], sentiment: 0 }])).toEqual([]);
    expect(aggregateThemesFromPosts([])).toEqual([]);
  });
});

describe("bucketByThemes (lexicon mode)", () => {
  it("buckets posts by their lexicon themes with no embeddings provider", () => {
    const posts = [
      mk({ id: "a", themes: ["Salary", "Housing"], sentiment_score: 0.5 }),
      mk({ id: "b", themes: ["Salary"], sentiment_score: -0.3 }),
      mk({ id: "c", themes: ["Leadership", "Workload"], sentiment_score: 0 }),
    ];
    const buckets = bucketByThemes(posts, [], false);

    // Salary is canonicalized to Pay.
    expect(buckets.get("Pay")?.count).toBe(2);
    expect(buckets.get("Pay")?.sentSum).toBeCloseTo(0.2);
    // Leadership -> Management.
    expect(buckets.get("Management")?.count).toBe(1);
    expect(buckets.get("Housing")?.count).toBe(1);
    expect(buckets.get("Workload")?.count).toBe(1);
  });

  it("drops posts that have no themes and no vector", () => {
    const posts = [mk({ id: "empty", themes: [] }), mk({ id: "nulled", themes: null })];
    expect(bucketByThemes(posts, [], false).size).toBe(0);
  });

  it("falls back to lexicon tags when semantic mode is on but a post has no vector", () => {
    const posts = [
      // vector present but semantic disabled path not taken; here semantic=true
      // yet embedding is null -> must still use lexicon themes.
      mk({ id: "novector", themes: ["Salary"], sentiment_score: 0.4 }),
    ];
    const buckets = bucketByThemes(posts, [], true);
    expect(buckets.get("Pay")?.count).toBe(1);
  });

  it("uses semantic assignment when a post has a real vector", () => {
    // Centroid "Pay" aligned with the post vector; everything else orthogonal.
    const dim = 4;
    const payVec = Array.from({ length: dim }, (_, i) => (i === 0 ? 1 : 0));
    const otherVec = Array.from({ length: dim }, (_, i) => (i === 1 ? 1 : 0));
    const centroids = [
      { label: "Pay", vec: payVec },
      { label: "Culture", vec: otherVec },
    ];
    const posts = [
      // Lexicon says Housing, but the vector points at Pay -> semantic wins.
      mk({ id: "v", themes: ["Housing"], embedding: payVec, sentiment_score: 0.2 }),
    ];
    const buckets = bucketByThemes(posts, centroids, true);
    expect(buckets.has("Pay")).toBe(true);
    expect(buckets.has("Housing")).toBe(false);
  });
});
