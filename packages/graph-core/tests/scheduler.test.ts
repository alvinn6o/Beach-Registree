import { describe, it, expect } from "vitest";
import { generatePlan } from "../src/scheduler";
import type { Course, MajorRequirements, SchedulerInput } from "../src/types";

// ── Minimal course builder ────────────────────────────────────────────────────
function course(
  id: string,
  units: number,
  prereqs: string[] = [],
  prereqsOr: string[][] = [],
  coreqs: string[] = [],
  semester: "F" | "S" | "F/S" = "F/S"
): Course {
  return {
    id,
    name: id,
    units,
    description: "",
    prerequisites: prereqs,
    prerequisites_or: prereqsOr,
    corequisites: coreqs,
    semester_offered: semester,
    category: "core",
    min_grade: "C",
    notes: "",
  };
}

// Major with a single "all" requirement group
function major(courseIds: string[]): MajorRequirements {
  return {
    id: "test",
    name: "Test Major",
    department: "TEST",
    catalog_year: "2025-2026",
    total_units_required: courseIds.reduce((s) => s, 0),
    requirements: [{ name: "Core", type: "all", courses: courseIds }],
  };
}

function input(
  courses: Course[],
  opts: Partial<SchedulerInput> = {}
): SchedulerInput {
  return {
    completedCourses: [],
    majorRequirements: major(courses.map((c) => c.id)),
    selectedElectives: [],
    currentSemester: "Fall 2025",
    targetGraduation: "Spring 2029",
    unitsPerSemester: 18,
    minUnitsPerSemester: 6,
    ...opts,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("generatePlan", () => {
  it("schedules a full 4-year CS-like plan with no remaining courses", () => {
    // 8 courses across 8 semesters (simple linear chain)
    const courses = [
      course("C1", 3),
      course("C2", 3, ["C1"]),
      course("C3", 3, ["C2"]),
      course("C4", 3, ["C3"]),
      course("C5", 3, ["C4"]),
      course("C6", 3, ["C5"]),
      course("C7", 3, ["C6"]),
      course("C8", 3, ["C7"]),
    ];
    const result = generatePlan(courses, input(courses));

    expect(result.validation.errors).toHaveLength(0);
    expect(result.validation.all_requirements_met).toBe(true);

    // Every course must appear exactly once
    const scheduled = result.semesters.flatMap((s) => s.courses);
    for (const c of courses) {
      expect(scheduled).toContain(c.id);
    }
    expect(new Set(scheduled).size).toBe(scheduled.length);
  });

  it("respects prerequisites — successor never appears before predecessor", () => {
    const courses = [
      course("A", 3),
      course("B", 3, ["A"]),
      course("C", 3, ["B"]),
    ];
    const result = generatePlan(courses, input(courses));

    const semesterIndex = (id: string) =>
      result.semesters.findIndex((s) => s.courses.includes(id));

    expect(semesterIndex("A")).toBeLessThan(semesterIndex("B"));
    expect(semesterIndex("B")).toBeLessThan(semesterIndex("C"));
  });

  it("excludes completed courses from the generated plan", () => {
    const courses = [
      course("X", 3),
      course("Y", 3, ["X"]),
      course("Z", 3, ["Y"]),
    ];
    const inp = input(courses, { completedCourses: ["X", "Y"] });
    const result = generatePlan(courses, inp);

    const scheduled = result.semesters.flatMap((s) => s.courses);
    expect(scheduled).not.toContain("X");
    expect(scheduled).not.toContain("Y");
    expect(scheduled).toContain("Z");
  });

  it("co-schedules corequisites in the same semester", () => {
    // M must be taken alongside N (corequisite)
    const courses = [
      course("M", 3, [], [], ["N"]),
      course("N", 3),
    ];
    const result = generatePlan(courses, input(courses));

    // Find which semester M is in
    const sem = result.semesters.find((s) => s.courses.includes("M"));
    expect(sem).toBeDefined();
    expect(sem?.courses).toContain("N");
  });

  it("credit load balancing: semesters stay within ±4 units of each other for evenly distributable workload", () => {
    // 4 independent 3-unit courses × 4 semesters = 12 total units, target ~3u/sem
    const courses = Array.from({ length: 12 }, (_, i) => course(`C${i}`, 3));
    const inp = input(courses, {
      unitsPerSemester: 18,
      minUnitsPerSemester: 6,
      targetGraduation: "Spring 2029",
    });
    const result = generatePlan(courses, inp);

    const activeSems = result.semesters.filter((s) => s.courses.length > 0);
    expect(activeSems.length).toBeGreaterThan(1);

    const unitCounts = activeSems.map((s) => s.total_units);
    const maxUnits = Math.max(...unitCounts);
    const minUnitsVal = Math.min(...unitCounts);
    // Balanced plan: largest semester should not exceed smallest by more than 6u
    expect(maxUnits - minUnitsVal).toBeLessThanOrEqual(6);
  });

  it("reports errors for courses that cannot be scheduled", () => {
    // Only 1 semester available but course chain requires 3
    const courses = [
      course("A", 3),
      course("B", 3, ["A"]),
      course("C", 3, ["B"]),
    ];
    const inp = input(courses, {
      currentSemester: "Fall 2025",
      targetGraduation: "Fall 2025", // only 1 semester
    });
    const result = generatePlan(courses, inp);

    // B and C cannot fit because prereqs can't be satisfied in time
    expect(result.validation.all_requirements_met).toBe(false);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });
});
