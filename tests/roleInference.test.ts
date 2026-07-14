import { describe, expect, it } from "bun:test";
import { inferRole, detectDualRole } from "@/lib/analysis/roleInference";

describe("roleInference", () => {
  describe("inferRole", () => {
    it("detects Head of Department", () => {
      const result = inferRole("Head of Department - Mathematics");
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch!.profile.key).toBe("hod");
      expect(result.bestMatch!.profile.tier).toBe("middle");
      expect(result.teachingPct).toBe(0.7);
      expect(result.salaryUplift).toBeGreaterThan(0);
    });

    it("detects IB Programme Coordinator", () => {
      const result = inferRole("IB DP Coordinator");
      expect(result.bestMatch!.profile.key).toBe("ib_coordinator");
      expect(result.bestMatch!.profile.tier).toBe("middle");
    });

    it("detects Deputy Head Pastoral", () => {
      const result = inferRole("Deputy Head (Pastoral)");
      expect(result.bestMatch!.profile.key).toBe("deputy_head_pastoral");
      expect(result.bestMatch!.profile.tier).toBe("senior");
      expect(result.bestMatch!.profile.onSLT).toBe(true);
    });

    it("detects classroom teacher as baseline", () => {
      const result = inferRole("Year 4 Class Teacher");
      expect(result.bestMatch!.profile.key).toBe("classroom_teacher");
      expect(result.teachingPct).toBe(1.0);
      expect(result.salaryUplift).toBe(0);
    });

    it("detects Principal / Head Teacher", () => {
      const result = inferRole("Principal / Head of School");
      expect(result.bestMatch!.profile.tier).toBe("head");
      expect(result.teachingPct).toBe(0);
    });

    it("identifies admin-heavy roles (adminPct >= 50%)", () => {
      const result = inferRole("IB MYP Coordinator");
      expect(result.isAdminHeavy).toBe(true);
      expect(result.adminPct).toBeGreaterThanOrEqual(0.5);
    });

    it("flags in-addition-to-teaching for middle roles", () => {
      const result = inferRole("Head of Department");
      expect(result.inAdditionToTeaching).toBe(true);
    });

    it("does not flag in-addition-to-teaching for head roles", () => {
      const result = inferRole("Headmaster");
      expect(result.inAdditionToTeaching).toBe(false);
    });

    it("returns a human-readable summary", () => {
      const result = inferRole("Assistant Headteacher");
      // "Assistant Headteacher" matches both assistant_head and head_teacher;
      // head_teacher wins by tier weight. The summary should still be descriptive.
      expect(result.summary).toMatch(/match/i);
      expect(result.summary.length).toBeGreaterThan(20);
    });

    it("returns at least one match for any teacher-related text", () => {
      const result = inferRole("teacher");
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("ranks senior roles above classroom when both match", () => {
      const result = inferRole("Assistant Headteacher and Teacher");
      expect(result.bestMatch!.profile.tier).not.toBe("classroom");
    });
  });

  describe("detectDualRole", () => {
    it("detects teaching timetable mention", () => {
      const { dualRole, evidence } = detectDualRole(
        "The role includes a reduced teaching timetable of 60%.",
      );
      expect(dualRole).toBe(true);
      expect(evidence).toContain("teaching timetable");
    });

    it("detects in-addition-to-teaching", () => {
      const { dualRole } = detectDualRole("This position is in addition to teaching duties.");
      expect(dualRole).toBe(true);
    });

    it("returns false for pure admin text", () => {
      const { dualRole, evidence } = detectDualRole("Purely administrative role with no classes.");
      expect(dualRole).toBe(false);
      expect(evidence.length).toBe(0);
    });
  });
});
