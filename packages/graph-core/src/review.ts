import type { Course, MajorRequirements, PlanResult } from "./types";
import { resolveRequirementCourses } from "./requirements";
import { validatePlan } from "./validator";
import type { ValidationError } from "./validator";

export type PlanHealthStatus = "on-track" | "needs-review" | "blocked";
export type PlanHealthSeverity = "hard" | "warning";

export interface PlanHealthIssue {
  severity: PlanHealthSeverity;
  code: string;
  message: string;
  fix: string;
  semester?: string;
  course?: string;
}

export interface PlanHealthReport {
  status: PlanHealthStatus;
  summary: string;
  hardIssueCount: number;
  warningCount: number;
  issues: PlanHealthIssue[];
  totalSemesters: number;
  activeSemesters: number;
  scheduledCourses: number;
  completedUnits: number;
  plannedUnits: number;
  totalRequiredUnits: number;
  unscheduledRequiredCount: number;
  maxSemesterUnits: number;
  minActiveSemesterUnits: number | null;
}

interface AssessPlanHealthInput {
  courses: Course[];
  plan: PlanResult;
  completedCourseIds: string[];
  majorRequirements: MajorRequirements;
  selectedElectives: string[];
  preferredUnits: number;
  minUnitsPerSemester: number;
}

function getFix(error: ValidationError, preferredUnits: number): string {
  switch (error.type) {
    case "prereq":
      return `Move ${error.course} to a later semester, or complete its prerequisite chain first.`;
    case "availability":
      return `Treat the catalog offering as advisory only, then confirm the real department schedule before enrollment.`;
    case "standing":
      return `Move ${error.course} later, after you meet its completed-unit requirement.`;
    case "units":
      if (/minimum|full-time|has only/i.test(error.message)) {
        return "Add another course to that semester, or accept that it may be part-time.";
      }
      return `Remove a course from ${error.semester}, or raise your unit limit above ${preferredUnits}.`;
    case "completeness":
      return "Add the missing requirement to an open semester, or extend the plan.";
    default:
      return "Review the plan and adjust the schedule.";
  }
}

function toValidationIssue(
  error: ValidationError,
  preferredUnits: number
): PlanHealthIssue {
  const isUnderload =
    error.type === "units" && /minimum|full-time|has only/i.test(error.message);

  return {
    severity: isUnderload ? "warning" : "hard",
    code: error.type,
    message: error.message,
    fix: getFix(error, preferredUnits),
    semester: error.semester,
    course: error.course,
  };
}

function summarizeStatus(hardIssueCount: number, warningCount: number): string {
  if (hardIssueCount > 0) {
    return "The current plan is blocked by rule or completeness issues and needs changes before it is trustworthy.";
  }
  if (warningCount > 0) {
    return "The current plan is structurally valid, but it still needs review for load or timeline tradeoffs.";
  }
  return "The current plan is structurally sound and presentation-ready as an advising draft.";
}

export function assessPlanHealth({
  courses,
  plan,
  completedCourseIds,
  majorRequirements,
  selectedElectives,
  preferredUnits,
  minUnitsPerSemester,
}: AssessPlanHealthInput): PlanHealthReport {
  const validationIssues = validatePlan(
    courses,
    plan.semesters,
    completedCourseIds,
    minUnitsPerSemester
  ).map((error) => toValidationIssue(error, preferredUnits));

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const scheduledIds = new Set([
    ...completedCourseIds,
    ...plan.semesters.flatMap((semester) => semester.courses),
  ]);

  const candidateIds = [
    ...selectedElectives,
    ...completedCourseIds,
    ...plan.semesters.flatMap((semester) => semester.courses),
  ];

  const { allRequired, byRequirement } = resolveRequirementCourses(
    majorRequirements,
    candidateIds,
    new Set(courseMap.keys())
  );

  const issues: PlanHealthIssue[] = [...validationIssues];

  for (const requiredId of allRequired) {
    if (scheduledIds.has(requiredId)) continue;
    const course = courseMap.get(requiredId);
    issues.push({
      severity: "hard",
      code: "completeness",
      course: requiredId,
      message: `Required course ${requiredId}${course ? ` (${course.name})` : ""} is not scheduled.`,
      fix: "Add this course to an open semester or extend the plan.",
    });
  }

  for (const requirement of majorRequirements.requirements) {
    if (requirement.type !== "choose" || requirement.count === undefined) continue;
    const allocated = byRequirement[requirement.name] ?? [];
    if (allocated.length >= requirement.count) continue;
    issues.push({
      severity: "hard",
      code: "electives",
      message: `"${requirement.name}" has ${allocated.length} of ${requirement.count} required electives allocated.`,
      fix: `Select ${requirement.count - allocated.length} more course${requirement.count - allocated.length === 1 ? "" : "s"} from this requirement group.`,
    });
  }

  const activeSemesters = plan.semesters.filter((semester) => semester.courses.length > 0);
  const totalSemesters = plan.semesters.length;
  if (totalSemesters > 8) {
    issues.push({
      severity: "warning",
      code: "timeline",
      message: `Plan spans ${totalSemesters} semesters, which is longer than the standard 4-year (8 semester) target.`,
      fix: "Raise the unit cap, reduce delays in the prerequisite chain, or accept a longer timeline.",
    });
  }

  const completedUnits = completedCourseIds.reduce((sum, id) => {
    return sum + (courseMap.get(id)?.units ?? 0);
  }, 0);
  const plannedUnits = plan.semesters.reduce((sum, semester) => sum + semester.total_units, 0);
  if (completedUnits + plannedUnits > majorRequirements.total_units_required) {
    issues.push({
      severity: "warning",
      code: "unit-overage",
      message: `This path totals ${completedUnits + plannedUnits} units against a ${majorRequirements.total_units_required}-unit minimum.`,
      fix: "Confirm that the extra unit load is intentional and comes from the chosen requirement path.",
    });
  }

  const maxSemesterUnits = activeSemesters.length
    ? Math.max(...activeSemesters.map((semester) => semester.total_units))
    : 0;
  const minActiveSemesterUnits = activeSemesters.length
    ? Math.min(...activeSemesters.map((semester) => semester.total_units))
    : null;

  const hardIssueCount = issues.filter((issue) => issue.severity === "hard").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const status: PlanHealthStatus =
    hardIssueCount > 0 ? "blocked" : warningCount > 0 ? "needs-review" : "on-track";

  return {
    status,
    summary: summarizeStatus(hardIssueCount, warningCount),
    hardIssueCount,
    warningCount,
    issues,
    totalSemesters,
    activeSemesters: activeSemesters.length,
    scheduledCourses: plan.semesters.reduce(
      (sum, semester) => sum + semester.courses.length,
      0
    ),
    completedUnits,
    plannedUnits,
    totalRequiredUnits: majorRequirements.total_units_required,
    unscheduledRequiredCount: allRequired.filter((id) => !scheduledIds.has(id)).length,
    maxSemesterUnits,
    minActiveSemesterUnits,
  };
}
