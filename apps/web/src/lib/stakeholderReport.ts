import type { Course, PlanResult, PlanHealthReport } from "graph-core";

interface StakeholderReportInput {
  report: PlanHealthReport;
  plan: PlanResult;
  courses: Course[];
  majorName: string;
  isTransferStudent: boolean;
  selectedTrack: string | null;
}

function getSemesterCourseLines(plan: PlanResult, courses: Course[]): string[] {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  return plan.semesters
    .filter((semester) => semester.courses.length > 0)
    .map((semester) => {
      const labels = semester.courses
        .map((id) => {
          const course = courseMap.get(id);
          return course ? `${course.id} (${course.units}u)` : id;
        })
        .join(", ");
      return `- ${semester.term}: ${semester.total_units} units — ${labels}`;
    });
}

export function buildStakeholderReportText({
  report,
  plan,
  courses,
  majorName,
  isTransferStudent,
  selectedTrack,
}: StakeholderReportInput): string {
  const topIssues = report.issues.slice(0, 4);
  const lastActiveTerm =
    plan.semesters.filter((semester) => semester.courses.length > 0).at(-1)?.term ?? "N/A";
  const scenarioLabel = [
    isTransferStudent ? "Transfer-oriented" : "First-time/continuing student",
    selectedTrack ? `Track: ${selectedTrack}` : "No track selected",
  ].join(" · ");

  const issueBlock =
    topIssues.length > 0
      ? topIssues
          .map((issue) => `- ${issue.message}\n  Fix: ${issue.fix}`)
          .join("\n")
      : "- No major blockers or warnings were detected in the current draft.";

  const scheduleBlock = getSemesterCourseLines(plan, courses).join("\n");

  return [
    "# Beach RegisTree Stakeholder Brief",
    "",
    "## Product Position",
    `Beach RegisTree is a planning and advising support prototype for ${majorName}.`,
    "It is designed to reduce student confusion around prerequisite sequencing, graduation planning, and draft schedule building before official registration in MyCSULB.",
    "",
    "## Why This Matters",
    "- Students often do not know what to take next.",
    "- Planning, audit, and enrollment are split across separate tools.",
    "- Students make rushed choices when sections fill and registration opens.",
    "- Advisors spend time translating prerequisite chains that could be made visible.",
    "",
    "## Current Scenario",
    `- Scenario type: ${scenarioLabel}`,
    `- Plan status: ${report.status}`,
    `- Summary: ${report.summary}`,
    `- Active semesters: ${report.activeSemesters}`,
    `- Total semesters in draft: ${report.totalSemesters}`,
    `- Draft completion term: ${lastActiveTerm}`,
    `- Units: ${report.completedUnits} completed, ${report.plannedUnits} planned, ${report.totalRequiredUnits} minimum required`,
    "",
    "## Key Risks Or Review Points",
    issueBlock,
    "",
    "## Draft Semester Plan",
    scheduleBlock,
    "",
    "## Why This Prototype Is Useful",
    "- Makes prerequisite structure visible and easier to explain.",
    "- Produces a multi-semester draft faster than manual advising alone.",
    "- Surfaces rule blockers and load tradeoffs earlier.",
    "- Supports what-if scenario comparison before final registration.",
    "",
    "## Recommended Institutional Framing",
    "- Position as a planning/advising layer, not a registration replacement.",
    "- Pilot within a single department or program first.",
    "- Use alongside official audit and enrollment systems.",
    "- Focus early success metrics on clarity, student confidence, and avoided planning mistakes.",
    "",
    "## Recommended Next Steps",
    "- Strengthen transfer/articulation realism.",
    "- Add advisor-share/export workflow.",
    "- Add deeper blocked-course recovery guidance.",
    "- Define an official curriculum/rule update process.",
    "",
  ].join("\n");
}
