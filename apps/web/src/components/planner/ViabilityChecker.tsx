"use client";

import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import { validatePlan } from "graph-core";
import type { ValidationError } from "graph-core";

// viewMode no longer used for filtering requirements — all required courses
// are always checked regardless of view. Kept import for future use.

function getFix(error: ValidationError, maxUnits: number): string {
  switch (error.type) {
    case "prereq":
      return `Move ${error.course} to a later semester, or complete its prerequisites first.`;
    case "availability":
      return `Move ${error.course} to a semester when it's offered (check Fall/Spring availability).`;
    case "units":
      return `Remove a course from ${error.semester}, or increase your unit limit above ${maxUnits}.`;
    case "completeness":
      return "Add the missing course to an open semester, or extend your target graduation.";
    default:
      return "Review your plan and adjust accordingly.";
  }
}

interface ViabilityCheckerProps {
  compact?: boolean;
}

export default function ViabilityChecker({ compact = false }: ViabilityCheckerProps) {
  const plan = usePlannerStore((s) => s.plan);
  const courses = useCourseStore((s) => s.allCourses);
  const completed = useProgressStore((s) => s.completed);
  const preferredUnits = useProgressStore((s) => s.preferredUnits);
  const minUnitsPerSemester = useProgressStore((s) => s.minUnitsPerSemester);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const major = useCourseStore((s) => s.major);
  const viewMode = useCourseStore((s) => s.viewMode);

  if (!plan) return null;

  const validationErrors: ValidationError[] = validatePlan(
    courses,
    plan.semesters,
    [...completed],
    minUnitsPerSemester
  );

  // Check unscheduled required courses
  // Always check ALL required courses regardless of viewMode — support courses
  // (ENGR 350, ENGR 101/102, etc.) are required even in "major" view
  const scheduledIds = new Set([
    ...completed,
    ...plan.semesters.flatMap((s) => s.courses),
  ]);
  const allRequired: string[] = [];
  for (const req of major.requirements) {
    if (req.type === "all") {
      allRequired.push(...req.courses);
    }
    if (req.type === "choose" && req.count !== undefined) {
      // Use selected electives + completed + planned from this group
      const picked = [
        ...selectedElectives.filter((id) => req.courses.includes(id)),
        ...req.courses.filter((id) => completed.has(id)),
        ...req.courses.filter((id) => scheduledIds.has(id)),
      ];
      const unique = [...new Set(picked)];
      if (unique.length >= req.count) {
        allRequired.push(...unique.slice(0, req.count));
      } else {
        // Fallback: fill with defaults (first N in group)
        const defaults = req.courses.slice(0, req.count);
        allRequired.push(...defaults);
      }
    }
  }
  const unscheduledRequired = allRequired.filter((id) => !scheduledIds.has(id));

  // Check elective count per "choose N" requirement group
  // Count selected + completed + scheduled (not just selectedElectives)
  const electiveCountIssues: { type: string; message: string; fix: string }[] = [];
  for (const req of major.requirements) {
    if (req.type === "choose" && req.count !== undefined) {
      const satisfied = req.courses.filter(
        (id) => selectedElectives.includes(id) || completed.has(id) || scheduledIds.has(id)
      );
      const uniqueSatisfied = [...new Set(satisfied)];
      if (uniqueSatisfied.length < req.count) {
        electiveCountIssues.push({
          type: "electives",
          message: `"${req.name}": ${uniqueSatisfied.length} of ${req.count} required elective${req.count !== 1 ? "s" : ""} selected.`,
          fix: `Open the Prerequisite Graph and select ${req.count - uniqueSatisfied.length} more elective${req.count - uniqueSatisfied.length !== 1 ? "s" : ""} from this group.`,
        });
      }
    }
  }

  // Impossible target warning: are there still unscheduled required courses
  // that couldn't fit into the available semesters?
  const impossibleTarget = unscheduledRequired.length > 0 && plan.semesters.length > 0;
  // Also warn if total remaining units simply can't fit within available semesters
  const remainingRequired = allRequired.filter((id) => !completed.has(id));
  const remainingUnits = remainingRequired.reduce((sum, id) => {
    const c = courses.find((c) => c.id === id);
    return sum + (c?.units ?? 0);
  }, 0);
  const availableSemesters = plan.semesters.length;
  const maxFittableUnits = availableSemesters * preferredUnits;
  const unitOverflow = remainingUnits > maxFittableUnits;

  // Check total semesters vs 4-year target
  const activeSemesters = plan.semesters.filter((s) => s.courses.length > 0);
  const totalSemesters = plan.semesters.length;
  const tooManySemesters = totalSemesters > 8;

  // Combine all issues
  const allIssues: { type: string; message: string; fix: string }[] = [
    ...(unitOverflow && !impossibleTarget
      ? [
          {
            type: "impossible",
            message: `${remainingUnits} units remaining but only ${maxFittableUnits} units of capacity across ${availableSemesters} semesters at ${preferredUnits}u max.`,
            fix: `Increase max units per semester in Options, extend your graduation target, or mark more courses as completed.`,
          },
        ]
      : []),
    ...electiveCountIssues,
    ...validationErrors.map((e) => ({
      type: e.type,
      message: e.message,
      fix: getFix(e, preferredUnits),
    })),
    ...unscheduledRequired.map((id) => {
      const course = courses.find((c) => c.id === id);
      return {
        type: "completeness",
        message: `Required course ${id}${course ? ` (${course.name})` : ""} is not scheduled.`,
        fix: "Add this course to an open semester, or extend your target graduation date.",
      };
    }),
    ...(tooManySemesters
      ? [
          {
            type: "timeline",
            message: `Plan spans ${totalSemesters} semesters — over the 4-year (8 semester) target.`,
            fix: "Increase units per semester, or accept a longer graduation timeline.",
          },
        ]
      : []),
  ];

  const isViable = allIssues.length === 0;

  // Unit summary: completed + planned vs 120 total required
  const completedUnits = [...completed].reduce((sum, id) => {
    const c = courses.find((c) => c.id === id);
    return sum + (c?.units ?? 0);
  }, 0);
  const plannedUnits = plan.semesters.reduce((sum, s) => sum + s.total_units, 0);
  const totalRequired = major.total_units_required;

  if (compact) {
    // Compact inline banner for the planner bottom bar
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2 border-t border-beach-border text-sm ${
          isViable
            ? "bg-green-950/20"
            : "bg-red-950/20"
        }`}
      >
        <span
          className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${
            isViable
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {isViable ? "✓ VIABLE" : "✗ NOT VIABLE"}
        </span>
        {!isViable && (
          <span className="text-zinc-400 text-xs">
            {allIssues.length} issue{allIssues.length !== 1 ? "s" : ""} found
          </span>
        )}
        {isViable && (
          <span className="text-green-600 text-xs font-mono">
            All requirements satisfied · {totalSemesters} semesters ({activeSemesters.length} active)
          </span>
        )}
        <span className="ml-auto text-xs font-mono text-zinc-500">
          {completedUnits}u done · {plannedUnits}u planned ·{" "}
          <span className="text-zinc-400">{totalRequired}u total</span>
        </span>
      </div>
    );
  }

  // Full expanded view
  return (
    <div className="border-t border-beach-border">
      {/* Status header */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 ${
          isViable ? "bg-green-950/15" : "bg-red-950/15"
        }`}
      >
        <span
          className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${
            isViable
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {isViable ? "✓ VIABLE" : "✗ NOT VIABLE"}
        </span>
        <span className="text-xs text-zinc-400 font-mono">
          {totalSemesters} semesters ({activeSemesters.length} active) ·{" "}
          {plan.semesters.reduce((sum, s) => sum + s.courses.length, 0)} courses scheduled
        </span>
        <span className="ml-auto text-xs font-mono text-zinc-500">
          {completedUnits}u done · {plannedUnits}u planned · {totalRequired}u total
        </span>
      </div>

      {/* Issues list */}
      {allIssues.length > 0 && (
        <div className="max-h-48 overflow-y-auto divide-y divide-beach-border">
          {allIssues.map((issue, i) => (
            <div key={i} className="px-4 py-2.5">
              <p className="text-xs text-red-300 mb-1">{issue.message}</p>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400 font-mono">Fix: </span>
                {issue.fix}
              </p>
            </div>
          ))}
        </div>
      )}

      {isViable && (
        <div className="px-4 py-2 text-xs text-green-600 font-mono">
          All requirements satisfied. On track for graduation.
        </div>
      )}
    </div>
  );
}
