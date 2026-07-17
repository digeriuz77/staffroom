import { describe, expect, it } from "bun:test";
import { isRelevantSchoolMention } from "@/lib/reddit/client";

describe("Reddit school relevance", () => {
  it("accepts the full normalized school name", () => {
    expect(
      isRelevantSchoolMention(
        "Dubai International Academy",
        "Any recent reviews of Dubai International Academy?",
      ),
    ).toBe(true);
  });

  it("accepts multiple distinctive school tokens", () => {
    expect(
      isRelevantSchoolMention(
        "Singapore American School",
        "American teachers at the Singapore campus shared package details.",
      ),
    ).toBe(true);
  });

  it("rejects a location-only match for a different school", () => {
    expect(
      isRelevantSchoolMention(
        "Tashkent International School",
        "I am considering an offer from Maple Bear Tashkent.",
      ),
    ).toBe(false);
  });

  it("rejects generic international-school discussion", () => {
    expect(
      isRelevantSchoolMention(
        "International School of Luxembourg",
        "Which international school has the best package?",
      ),
    ).toBe(false);
  });
});
