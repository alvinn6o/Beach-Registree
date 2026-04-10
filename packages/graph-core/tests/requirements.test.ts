import { describe, expect, it } from "vitest";
import { resolveRequirementCourses } from "../src/requirements";
import type { MajorRequirements } from "../src/types";

describe("resolveRequirementCourses", () => {
  it("does not double-count choose-group courses across requirements", () => {
    const major: MajorRequirements = {
      id: "test-major",
      name: "Test Major",
      department: "TEST",
      catalog_year: "2025-2026",
      total_units_required: 120,
      requirements: [
        { name: "Focus", type: "choose", count: 2, courses: ["A", "B", "C"] },
        { name: "General Electives", type: "choose", count: 1, courses: ["B", "C", "D"] },
      ],
    };

    const resolved = resolveRequirementCourses(major, ["A", "B", "C"]);

    expect(resolved.byRequirement["Focus"]).toEqual(["A", "B"]);
    expect(resolved.byRequirement["General Electives"]).toEqual(["C"]);
    expect(new Set(resolved.allRequired).size).toBe(resolved.allRequired.length);
  });
});
