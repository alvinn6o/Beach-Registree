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
  semester: "F" | "S" | "F/S" = "F/S",
  minUnitsCompleted = 0,
  category: Course["category"] = "core"
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
    category,
    min_grade: "C",
    notes: "",
    minUnitsCompleted,
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

  it("auto-extends semesters when target graduation is too short for prerequisite chain", () => {
    // Only 1 semester requested but course chain requires 3 —
    // scheduler should auto-extend and schedule all courses
    const courses = [
      course("A", 3),
      course("B", 3, ["A"]),
      course("C", 3, ["B"]),
    ];
    const inp = input(courses, {
      currentSemester: "Fall 2025",
      targetGraduation: "Fall 2025", // only 1 semester requested
    });
    const result = generatePlan(courses, inp);

    // Scheduler should auto-extend and successfully schedule all courses
    expect(result.validation.all_requirements_met).toBe(true);
    expect(result.semesters.length).toBeGreaterThanOrEqual(3);
  });

  it("treats OR prerequisite groups as alternatives within a single group", () => {
    const courses = [
      course("BASE", 3),
      course("ALT1", 3),
      course("ALT2", 3),
      course("TARGET", 3, ["BASE"], [["ALT1", "ALT2"]]),
    ];
    const result = generatePlan(
      courses,
      input(courses, { completedCourses: ["BASE", "ALT1"] })
    );

    const scheduled = result.semesters.flatMap((s) => s.courses);
    expect(scheduled).toContain("TARGET");
  });

  it("respects minimum completed-unit standing requirements", () => {
    const courses = [
      course("A", 3),
      course("B", 3),
      course("C", 3),
      course("D", 3),
      course("UPPER", 3, [], [], [], "F/S", 12),
    ];
    const result = generatePlan(courses, input(courses, {
      targetGraduation: "Spring 2027",
      unitsPerSemester: 6,
      minUnitsPerSemester: 3,
    }));

    const upperIdx = result.semesters.findIndex((s) => s.courses.includes("UPPER"));
    expect(upperIdx).toBeGreaterThan(1);
  });

  it("prioritizes gateway prerequisites that unlock multiple later courses", () => {
    const courses = [
      course("GATEWAY", 3),
      course("NEXT 1", 3, ["GATEWAY"]),
      course("NEXT 2", 3, ["GATEWAY"]),
      course("NEXT 3", 3, ["GATEWAY"]),
      course("STANDALONE 1", 3),
      course("STANDALONE 2", 3),
    ];

    const result = generatePlan(courses, input(courses, {
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2026",
      unitsPerSemester: 6,
      minUnitsPerSemester: 6,
    }));

    expect(result.semesters[0]?.courses).toContain("GATEWAY");
  });

  it("balances independent coursework toward full-time loads when possible", () => {
    const courses = Array.from({ length: 16 }, (_, i) => course(`C${i + 1}`, 3));
    const result = generatePlan(courses, input(courses, {
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2027",
      unitsPerSemester: 15,
      minUnitsPerSemester: 12,
    }));

    const activeSems = result.semesters.filter((s) => s.courses.length > 0);
    expect(activeSems).toHaveLength(4);
    for (const sem of activeSems) {
      expect(sem.total_units).toBeGreaterThanOrEqual(12);
      expect(sem.total_units).toBeLessThanOrEqual(15);
    }
  });

  it("prioritizes transfer first-year catch-up courses early", () => {
    const courses = [
      course("CECS 325", 3, ["CECS 274", "CECS 277"], [], [], "F/S", 0, "upper"),
      course("CECS 341", 3, ["CECS 225"], [], [], "F/S", 0, "upper"),
      course("MATH 123", 4, ["MATH 122"], [], [], "F/S", 0, "math"),
      course("PHYS 151", 4, [], [], ["MATH 122"], "F/S", 0, "support"),
      course("ENGR 350", 3, [], [], [], "F/S", 60, "upper"),
    ];

    const result = generatePlan(courses, {
      completedCourses: ["CECS 274", "CECS 277", "CECS 225", "MATH 122"],
      majorRequirements: major(courses.map((c) => c.id)),
      selectedElectives: [],
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2027",
      unitsPerSemester: 15,
      minUnitsPerSemester: 9,
      firstYearCourses: ["MATH 123", "PHYS 151"],
    });

    const semesterIndex = (id: string) =>
      result.semesters.findIndex((s) => s.courses.includes(id));

    expect(semesterIndex("MATH 123")).toBeGreaterThanOrEqual(0);
    expect(semesterIndex("MATH 123")).toBeLessThan(2);
    expect(semesterIndex("PHYS 151")).toBeGreaterThanOrEqual(0);
    expect(semesterIndex("PHYS 151")).toBeLessThan(2);
  });

  it("keeps earlier-stage coursework ahead of upper-division work when pacing across multiple semesters", () => {
    const priorCredits = Array.from({ length: 30 }, (_, i) => course(`DONE ${i + 1}`, 3));
    const schedulableCourses = [
      course("GE 101", 3, [], [], [], "F/S", 0, "ge"),
      course("MATH 122", 4, [], [], [], "F/S", 0, "math"),
      course("CECS 174", 3, [], [], [], "F/S", 0, "core"),
      course("PHYS 151", 4, [], [], [], "F/S", 0, "support"),
      course("UPPER 300", 3, [], [], [], "F/S", 0, "upper"),
      course("ELECT 400", 3, [], [], [], "F/S", 0, "elective"),
      course("GE UD 301", 3, [], [], [], "F/S", 60, "ge-upper"),
      course("CAP 491", 3, [], [], [], "F/S", 90, "capstone"),
    ];
    const courses = [...priorCredits, ...schedulableCourses];

    const result = generatePlan(courses, input(courses, {
      completedCourses: priorCredits.map((course) => course.id),
      majorRequirements: major(schedulableCourses.map((course) => course.id)),
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2027",
      unitsPerSemester: 8,
      minUnitsPerSemester: 6,
    }));

    const semesterIndex = (id: string) =>
      result.semesters.findIndex((s) => s.courses.includes(id));

    expect(semesterIndex("MATH 122")).toBeLessThanOrEqual(semesterIndex("UPPER 300"));
    expect(semesterIndex("CECS 174")).toBeLessThanOrEqual(semesterIndex("ELECT 400"));
    expect(semesterIndex("GE 101")).toBeLessThanOrEqual(semesterIndex("GE UD 301"));
    expect(semesterIndex("CAP 491")).toBeGreaterThanOrEqual(semesterIndex("UPPER 300"));
  });

  it("finishes earlier than the target window when requirements fit sooner", () => {
    const courses = Array.from({ length: 12 }, (_, i) => course(`C${i + 1}`, 3));
    const result = generatePlan(courses, input(courses, {
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2028", // 6 available semesters
      unitsPerSemester: 12,
      minUnitsPerSemester: 6,
    }));

    const activeSems = result.semesters.filter((s) => s.courses.length > 0);
    expect(activeSems).toHaveLength(3);
    expect(activeSems[2]?.term).toBe("Fall 2026");
  });

  it("never schedules a semester beyond the requested target term", () => {
    const courses = Array.from({ length: 24 }, (_, i) => course(`C${i + 1}`, 3));
    const result = generatePlan(courses, input(courses, {
      currentSemester: "Fall 2026",
      targetGraduation: "Spring 2030",
      unitsPerSemester: 12,
      minUnitsPerSemester: 12,
    }));

    const activeSems = result.semesters.filter((s) => s.courses.length > 0);
    const allowedTerms = new Set([
      "Fall 2026",
      "Spring 2027",
      "Fall 2027",
      "Spring 2028",
      "Fall 2028",
      "Spring 2029",
      "Fall 2029",
      "Spring 2030",
    ]);
    expect(activeSems.every((semester) => allowedTerms.has(semester.term))).toBe(true);
    expect(activeSems.map((s) => s.term)).not.toContain("Fall 2030");
  });

  it("compacts valid courses out of a weak trailing semester", () => {
    const transferCredits = Array.from({ length: 8 }, (_, i) => course(`T${i + 1}`, 3));
    const requiredCourses = [
      course("CECS 174", 3),
      course("MATH 122", 4),
      course("CECS 225", 3, ["CECS 174"]),
      course("CECS 228", 3, ["CECS 174", "MATH 122"]),
      course("CECS 277", 3, ["CECS 174"]),
      course("CECS 323", 3, ["CECS 228", "CECS 277"], [], [], "F/S", 0, "elective"),
      course("ENGR 361", 3, ["MATH 122"], [], [], "F/S", 30, "upper"),
      course("FILLER 1", 3),
      course("FILLER 2", 3),
      course("FILLER 3", 3),
      course("FILLER 4", 3),
      course("FILLER 5", 3),
      course("FILLER 6", 3),
      course("FILLER 7", 3),
    ];
    const courses = [...transferCredits, ...requiredCourses];

    const result = generatePlan(courses, input(requiredCourses, {
      completedCourses: transferCredits.map((course) => course.id),
      majorRequirements: major(requiredCourses.map((course) => course.id)),
      currentSemester: "Fall 2025",
      targetGraduation: "Spring 2028",
      unitsPerSemester: 15,
      minUnitsPerSemester: 12,
    }));

    const activeSems = result.semesters.filter((s) => s.courses.length > 0);
    const lastSemester = activeSems[activeSems.length - 1];
    expect(activeSems.length).toBeLessThanOrEqual(4);
    expect(lastSemester?.total_units ?? 0).toBeGreaterThanOrEqual(12);
  });
});
