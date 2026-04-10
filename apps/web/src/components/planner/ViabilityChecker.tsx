"use client";

import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import { assessPlanHealth } from "graph-core";

interface ViabilityCheckerProps {
  compact?: boolean;
}

const STATUS_STYLES = {
  "on-track": {
    label: "ON TRACK",
    badge: "bg-green-900/50 text-green-400",
    background: "bg-green-950/20",
    body: "text-green-600",
  },
  "needs-review": {
    label: "NEEDS REVIEW",
    badge: "bg-amber-900/50 text-amber-300",
    background: "bg-amber-950/20",
    body: "text-amber-400",
  },
  blocked: {
    label: "BLOCKED",
    badge: "bg-red-900/50 text-red-400",
    background: "bg-red-950/20",
    body: "text-red-300",
  },
} as const;

export default function ViabilityChecker({ compact = false }: ViabilityCheckerProps) {
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const completed = useProgressStore((state) => state.completed);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const minUnitsPerSemester = useProgressStore((state) => state.minUnitsPerSemester);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const major = useCourseStore((state) => state.major);

  if (!plan) return null;

  const report = assessPlanHealth({
    courses,
    plan,
    completedCourseIds: [...completed],
    majorRequirements: major,
    selectedElectives,
    preferredUnits,
    minUnitsPerSemester,
  });

  const status = STATUS_STYLES[report.status];
  const topIssues = report.issues.slice(0, compact ? 1 : report.issues.length);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2 border-t border-beach-border text-sm ${status.background}`}
      >
        <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${status.badge}`}>
          {status.label}
        </span>
        {report.status !== "on-track" ? (
          <span className="text-zinc-400 text-xs">
            {report.hardIssueCount} hard / {report.warningCount} warning
          </span>
        ) : (
          <span className="text-green-600 text-xs font-mono">
            All requirements scheduled · {report.totalSemesters} semesters ({report.activeSemesters} active)
          </span>
        )}
        <span className="ml-auto text-xs font-mono text-zinc-500">
          {report.completedUnits}u done · {report.plannedUnits}u planned ·{" "}
          <span className="text-zinc-400">{report.totalRequiredUnits}u total</span>
        </span>
      </div>
    );
  }

  return (
    <div className="border-t border-beach-border">
      <div className={`flex items-center gap-3 px-4 py-2.5 ${status.background}`}>
        <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${status.badge}`}>
          {status.label}
        </span>
        <span className="text-xs text-zinc-400 font-mono">
          {report.totalSemesters} semesters ({report.activeSemesters} active) · {report.scheduledCourses} courses scheduled
        </span>
        <span className="ml-auto text-xs font-mono text-zinc-500">
          {report.completedUnits}u done · {report.plannedUnits}u planned · {report.totalRequiredUnits}u total
        </span>
      </div>

      {topIssues.length > 0 && (
        <div className="max-h-48 overflow-y-auto divide-y divide-beach-border">
          {topIssues.map((issue) => (
            <div key={`${issue.code}-${issue.message}`} className="px-4 py-2.5">
              <p className={`text-xs mb-1 ${issue.severity === "hard" ? "text-red-300" : "text-amber-300"}`}>
                {issue.message}
              </p>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400 font-mono">Fix: </span>
                {issue.fix}
              </p>
            </div>
          ))}
        </div>
      )}

      {report.status === "on-track" && (
        <div className={`px-4 py-2 text-xs font-mono ${status.body}`}>
          All requirements are scheduled. This plan is on track for advising review.
        </div>
      )}
    </div>
  );
}
