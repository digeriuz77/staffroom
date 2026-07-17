import { describe, expect, it } from "bun:test";
import { parseBriefResult } from "@/lib/ai/briefs";

describe("AI school brief validation", () => {
  it("normalizes and bounds agent output", () => {
    const result = parseBriefResult({
      summary: "  Evidence suggests   generally positive package discussion. ",
      strengths: ["Housing is frequently mentioned", "Pay appears competitive", "A", "Ignored"],
      watchouts: ["Workload comes up in two posts"],
      questions: ["How is housing allocated?", "What is the timetable?"],
    });
    expect(result.summary).toBe(
      "Evidence suggests generally positive package discussion.",
    );
    expect(result.strengths).toHaveLength(3);
    expect(result.questions).toHaveLength(2);
  });

  it("rejects responses without a grounded summary", () => {
    expect(() => parseBriefResult({ strengths: [] })).toThrow(
      "missing a summary",
    );
    expect(() => parseBriefResult(null)).toThrow("invalid brief");
  });
});
