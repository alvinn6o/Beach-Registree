import type { Course, SemesterPlan } from "./types";
import { isPrereqMet } from "./dag";

export interface ValidationError {
  type: "prereq" | "availability" | "units" | "completeness";
  course?: string;
  semester?: string;
  message: string;
}

export function validatePlan(
  courses: Course[],
  semesters: SemesterPlan[],
  completedCourses: string[],
  minUnitsPerSemester = 12
): ValidationError[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const errors: ValidationError[] = [];
  const scheduled = new Set(completedCourses);

  for (const sem of semesters) {
    for (const courseId of sem.courses) {
      const course = courseMap.get(courseId);
      if (!course) continue;

      // Check prerequisites (AND + OR)
      if (!isPrereqMet(course, scheduled)) {
        const missingAnd = course.prerequisites.filter(
          (p) => !scheduled.has(p)
        );
        const missingOrGroups = course.prerequisites_or.filter(
          (group) => !group.some((p) => scheduled.has(p))
        );
        const parts: string[] = [];
        if (missingAnd.length > 0) parts.push(missingAnd.join(", "));
        if (missingOrGroups.length > 0) {
          for (const group of missingOrGroups) {
            parts.push(`one of (${group.join(" / ")})`);
          }
        }
        errors.push({
          type: "prereq",
          course: courseId,
          semester: sem.term,
          message: `${courseId} missing prerequisite(s): ${parts.join("; ")}`,
        });
      }

      // Check semester availability (soft warning — catalog data is best-guess)
      // NOTE: We don't hard-block this since actual availability depends on
      // the university's scheduling each term. Kept as informational only.
      // if (course.semester_offered !== "F/S" && course.semester_offered !== termSeason) { ... }
    }

    // Check unit limits
    if (sem.total_units > 21) {
      errors.push({
        type: "units",
        semester: sem.term,
        message: `${sem.term} has ${sem.total_units} units (max 21)`,
      });
    }

    // Check minimum units
    if (sem.total_units < minUnitsPerSemester && sem.courses.length > 0) {
      errors.push({
        type: "units",
        semester: sem.term,
        message: `${sem.term} has only ${sem.total_units} units (minimum ${minUnitsPerSemester} for full-time)`,
      });
    }

    // Mark all courses in this semester as scheduled for next iteration
    for (const courseId of sem.courses) {
      scheduled.add(courseId);
    }
  }

  return errors;
}

export function validateCoursePlacement(
  courseId: string,
  targetSemester: string,
  courses: Course[],
  semesters: SemesterPlan[],
  completedCourses: string[]
): ValidationError[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const course = courseMap.get(courseId);
  if (!course) return [];

  const errors: ValidationError[] = [];

  // Collect all courses completed before this semester
  const prior = new Set(completedCourses);
  for (const sem of semesters) {
    if (sem.term === targetSemester) break;
    for (const id of sem.courses) {
      prior.add(id);
    }
  }

  if (!isPrereqMet(course, prior)) {
    const missingAnd = course.prerequisites.filter((p) => !prior.has(p));
    const missingOrGroups = course.prerequisites_or.filter(
      (group) => !group.some((p) => prior.has(p))
    );
    const parts: string[] = [];
    if (missingAnd.length > 0) parts.push(missingAnd.join(", "));
    if (missingOrGroups.length > 0) {
      for (const group of missingOrGroups) {
        parts.push(`one of (${group.join(" / ")})`);
      }
    }
    errors.push({
      type: "prereq",
      course: courseId,
      semester: targetSemester,
      message: `Missing prerequisite(s): ${parts.join("; ")}`,
    });
  }

  // NOTE: semester_offered check removed — catalog data is best-guess only

  // Check unit limits if added
  const targetSem = semesters.find((s) => s.term === targetSemester);
  if (targetSem) {
    const newTotal = targetSem.total_units + course.units;
    if (newTotal > 21) {
      errors.push({
        type: "units",
        semester: targetSemester,
        message: `Would exceed 21 units (${newTotal})`,
      });
    }
  }

  return errors;
}
