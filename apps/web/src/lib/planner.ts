import { getDownstream, resolveRequirementCourses, validateCoursePlacement } from "graph-core";
import type { Course, MajorRequirements, SemesterPlan, ValidationError } from "graph-core";

export interface PlacementHint {
  earliestValidTerm: string | null;
  blockingErrors: ValidationError[];
}

export function getPlacementHint(
  courseId: string,
  semesters: SemesterPlan[],
  courses: Course[],
  completedCourses: string[]
): PlacementHint {
  let firstErrors: ValidationError[] = [];

  for (const semester of semesters) {
    const errors = validateCoursePlacement(
      courseId,
      semester.term,
      courses,
      semesters,
      completedCourses
    );
    if (errors.length === 0) {
      return { earliestValidTerm: semester.term, blockingErrors: [] };
    }
    if (firstErrors.length === 0) {
      firstErrors = errors;
    }
  }

  return {
    earliestValidTerm: null,
    blockingErrors: firstErrors,
  };
}

export function summarizePlacementErrors(errors: ValidationError[]): string {
  return [...new Set(errors.map((error) => error.message))].join("; ");
}

function getUnitsBeforeSemester(
  targetTerm: string,
  semesters: SemesterPlan[],
  courses: Course[],
  completedCourses: string[]
): number {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  let units = completedCourses.reduce((sum, id) => sum + (courseMap.get(id)?.units ?? 0), 0);

  for (const semester of semesters) {
    if (semester.term === targetTerm) break;
    units += semester.courses.reduce(
      (sum, id) => sum + (courseMap.get(id)?.units ?? 0),
      0
    );
  }

  return units;
}

export function buildCourseRationale(
  courseId: string,
  semesterTerm: string,
  semesters: SemesterPlan[],
  courses: Course[],
  completedCourses: string[]
): string[] {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return [];

  const reasons: string[] = [];
  const placement = getPlacementHint(courseId, semesters, courses, completedCourses);
  if (placement.earliestValidTerm === semesterTerm) {
    reasons.push("Earliest valid term after prerequisites.");
  }

  const downstream = getDownstream(courseId, courses).size - 1;
  if (downstream > 0) {
    reasons.push(`Unlocks ${downstream} later course${downstream === 1 ? "" : "s"}.`);
  }

  if ((course.minUnitsCompleted ?? 0) > 0) {
    const unitsBefore = getUnitsBeforeSemester(
      semesterTerm,
      semesters,
      courses,
      completedCourses
    );
    if (unitsBefore >= (course.minUnitsCompleted ?? 0)) {
      reasons.push(`Placed after the ${course.minUnitsCompleted}-unit standing gate.`);
    }
  }

  if (["core", "math", "support"].includes(course.category)) {
    reasons.push("Keeps major prerequisite momentum moving.");
  } else if (course.category === "upper" || course.category === "capstone") {
    reasons.push("Supports upper-division progress toward graduation.");
  } else if (course.category === "ge" || course.category === "ge-upper") {
    reasons.push("Balances remaining GE progress without blocking the major path.");
  }

  return [...new Set(reasons)].slice(0, 3);
}

export interface RecoverySuggestion {
  courseId: string;
  title: string;
  blockers: string[];
  actions: string[];
}

function unique(strings: string[]): string[] {
  return [...new Set(strings.filter(Boolean))];
}

export function buildBlockedCourseRecoverySuggestions(
  semesters: SemesterPlan[],
  courses: Course[],
  completedCourses: string[],
  major: MajorRequirements,
  selectedElectives: string[],
  preferredUnits: number
): RecoverySuggestion[] {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const scheduledIds = new Set([
    ...completedCourses,
    ...semesters.flatMap((semester) => semester.courses),
  ]);
  const required = resolveRequirementCourses(
    major,
    [...selectedElectives, ...completedCourses, ...semesters.flatMap((semester) => semester.courses)],
    new Set(courseMap.keys()),
    { fillDefaultsForChoose: false }
  ).allRequired;

  const blocked: RecoverySuggestion[] = [];

  for (const courseId of required) {
    if (scheduledIds.has(courseId)) continue;
    const course = courseMap.get(courseId);
    if (!course) continue;

    const hint = getPlacementHint(courseId, semesters, courses, completedCourses);
    const blockers = unique(hint.blockingErrors.map((error) => error.message));
    const actions: string[] = [];

    const missingAnd = course.prerequisites.filter((id) => !scheduledIds.has(id));
    if (missingAnd.length > 0) {
      actions.push(`Complete or schedule prerequisite${missingAnd.length === 1 ? "" : "s"} first: ${missingAnd.join(", ")}.`);
    }

    const missingOr = course.prerequisites_or
      .map((group) => group.filter((id) => !scheduledIds.has(id)))
      .filter((group) => group.length > 0);
    for (const group of missingOr) {
      actions.push(`Choose and complete one prerequisite option from: ${group.join(" / ")}.`);
    }

    if ((course.minUnitsCompleted ?? 0) > 0) {
      actions.push(`Place ${course.id} after you reach ${course.minUnitsCompleted} completed units.`);
    }

    if (hint.earliestValidTerm) {
      actions.push(`Earliest currently valid term is ${hint.earliestValidTerm}.`);
    } else {
      actions.push("Extend the draft by adding another semester if the current timeline has no valid opening.");
    }

    if (blockers.some((blocker) => blocker.toLowerCase().includes("would exceed 21 units"))) {
      actions.push(`Reduce semester load or raise your preferred cap above ${preferredUnits} units if appropriate.`);
    }

    blocked.push({
      courseId,
      title: `${course.id} needs recovery planning`,
      blockers: blockers.length > 0 ? blockers : ["No open valid semester under current assumptions."],
      actions: unique(actions).slice(0, 4),
    });
  }

  return blocked.slice(0, 6);
}

export interface TransferAssumptionSummary {
  assumedCompletedCount: number;
  unresolvedEntryRequirements: string[];
  preferredSciencePath: string | null;
  warnings: string[];
}

export function buildTransferAssumptionSummary(
  completedCourses: string[],
  requiredAfterEntry: string[],
  autoCompletedCourses: string[],
  preferredSciencePath: string | null
): TransferAssumptionSummary {
  const completedSet = new Set(completedCourses);
  const unresolvedEntryRequirements = requiredAfterEntry.filter((id) => {
    if (id === "PHYS 151" || id === "CHEM 111A") {
      if (preferredSciencePath && id !== preferredSciencePath) return false;
    }
    return !completedSet.has(id);
  });

  const warnings = [
    "Transfer mode is a planning shortcut, not an articulation audit.",
    "Use ASSIST and official transfer credit posting to verify every assumed course equivalency.",
  ];

  if (unresolvedEntryRequirements.includes("MATH 123")) {
    warnings.push("MATH 123 is still unresolved and should be treated as an early post-transfer priority.");
  }

  if (
    !preferredSciencePath &&
    unresolvedEntryRequirements.includes("PHYS 151") &&
    unresolvedEntryRequirements.includes("CHEM 111A")
  ) {
    warnings.push("A physical science path is still unresolved; choose whether you are planning around PHYS 151 or CHEM 111A.");
  }

  return {
    assumedCompletedCount: autoCompletedCourses.filter((id) => completedSet.has(id)).length,
    unresolvedEntryRequirements,
    preferredSciencePath,
    warnings: unique(warnings),
  };
}
