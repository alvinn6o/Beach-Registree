import { describe, expect, it } from "vitest";
import { assessPlanHealth } from "../src/review";
import type { Course, MajorRequirements, PlanResult } from "../src/types";

function course(
  id: string,
  units: number,
  prereqs: string[] = [],
  minUnitsCompleted = 0
): Course {
  return {
    id,
    name: id,
    units,
    description: "",
    prerequisites: prereqs,
    prerequisites_or: [],
    corequisites: [],
    semester_offered: "F/S",
    category: "core",
    min_grade: "C",
    notes: "",
    minUnitsCompleted,
  };
}

function major(courseIds: string[]): MajorRequirements {
  return {
    id: "test",
    name: "Test Major",
    department: "TEST",
    catalog_year: "2025-2026",
    total_units_required: 120,
    requirements: [{ name: "Core", type: "all", courses: courseIds }],
  };
}

function plan(semesters: PlanResult["semesters"]): PlanResult {
  return {
    semesters,
    validation: {
      all_requirements_met: true,
      graduation_on_target: true,
      errors: [],
      warnings: [],
    },
  };
}

describe("assessPlanHealth", () => {
  it("marks a clean plan as on-track", () => {
    const courses = [course("A", 3), course("B", 3, ["A"])];
    const report = assessPlanHealth({
      courses,
      plan: plan([
        { term: "Fall 2025", courses: ["A"], total_units: 3, warnings: [] },
        { term: "Spring 2026", courses: ["B"], total_units: 3, warnings: [] },
      ]),
      completedCourseIds: [],
      majorRequirements: major(["A", "B"]),
      selectedElectives: [],
      preferredUnits: 15,
      minUnitsPerSemester: 3,
    });

    expect(report.status).toBe("on-track");
    expect(report.hardIssueCount).toBe(0);
    expect(report.warningCount).toBe(0);
  });

  it("treats underloaded semesters as warnings instead of blockers", () => {
    const courses = [course("A", 3), course("B", 3)];
    const report = assessPlanHealth({
      courses,
      plan: plan([
        { term: "Fall 2025", courses: ["A", "B"], total_units: 6, warnings: [] },
      ]),
      completedCourseIds: [],
      majorRequirements: major(["A", "B"]),
      selectedElectives: [],
      preferredUnits: 15,
      minUnitsPerSemester: 12,
    });

    expect(report.status).toBe("needs-review");
    expect(report.hardIssueCount).toBe(0);
    expect(report.warningCount).toBeGreaterThan(0);
  });

  it("marks prerequisite violations as blockers", () => {
    const courses = [course("A", 3), course("B", 3, ["A"])];
    const report = assessPlanHealth({
      courses,
      plan: plan([
        { term: "Fall 2025", courses: ["B"], total_units: 3, warnings: [] },
      ]),
      completedCourseIds: [],
      majorRequirements: major(["A", "B"]),
      selectedElectives: [],
      preferredUnits: 15,
      minUnitsPerSemester: 3,
    });

    expect(report.status).toBe("blocked");
    expect(report.hardIssueCount).toBeGreaterThan(0);
  });
});
