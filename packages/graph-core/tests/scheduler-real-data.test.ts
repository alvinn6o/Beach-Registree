import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generatePlan, validatePlan } from "../src/index";
import type { Course, MajorRequirements } from "../src/types";

function loadJson<T>(relativePath: string): T {
  const filePath = path.resolve(import.meta.dirname, "../../..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

describe("scheduler real-data smoke tests", () => {
  it("produces a valid CSULB CS plan for a standard 8-term path when small starter courses are already complete", () => {
    const cecsCourses = loadJson<Course[]>("data/csulb/cecs_courses.json");
    const mathCourses = loadJson<Course[]>("data/csulb/math_courses.json");
    const geCourses = loadJson<Course[]>("data/csulb/ge_courses.json");
    const major = loadJson<MajorRequirements>("data/csulb/majors/cs_bs.json");

    const courses = [...cecsCourses, ...mathCourses, ...geCourses];
    const completed = ["ENGR 101", "ENGR 102"];
    const selectedElectives = [
      "CECS 323",
      "CECS 443",
      "CECS 470",
      "CECS 475",
      "CECS 456",
      "CECS 427",
    ];

    const result = generatePlan(courses, {
      completedCourses: completed,
      majorRequirements: major,
      selectedElectives,
      currentSemester: "Fall 2026",
      targetGraduation: "Spring 2030",
      unitsPerSemester: 15,
      minUnitsPerSemester: 12,
    });

    const validatorErrors = validatePlan(courses, result.semesters, completed, 12);
    const activeSemesters = result.semesters.filter((semester) => semester.courses.length > 0);

    expect(result.validation.errors).toEqual([]);
    expect(result.validation.all_requirements_met).toBe(true);
    expect(result.validation.graduation_on_target).toBe(true);
    expect(validatorErrors).toEqual([]);
    expect(activeSemesters).toHaveLength(8);
    expect(activeSemesters.map((semester) => semester.term)).toEqual([
      "Fall 2026",
      "Spring 2027",
      "Fall 2027",
      "Spring 2028",
      "Fall 2028",
      "Spring 2029",
      "Fall 2029",
      "Spring 2030",
    ]);
  });
});
