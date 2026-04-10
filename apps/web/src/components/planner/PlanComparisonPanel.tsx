"use client";

import { useMemo } from "react";
import { useCourseStore } from "@/stores/courseStore";
import type { SavedPlan } from "@/stores/savedPlansStore";
import type { PlanResult } from "graph-core";
import { assessTrackAwarePlanHealth } from "@/lib/trackRequirements";

interface PlanComparisonPanelProps {
  currentPlan: PlanResult;
  currentCompleted: string[];
  currentSelectedElectives: string[];
  currentSelectedTrack: string | null;
  comparePlan: SavedPlan;
}

const STATUS_LABELS = {
  "on-track": "On Track",
  "needs-review": "Needs Review",
  blocked: "Blocked",
} as const;

function endingTerm(plan: PlanResult): string {
  return plan.semesters.filter((semester) => semester.courses.length > 0).at(-1)?.term ?? "N/A";
}

export default function PlanComparisonPanel({
  currentPlan,
  currentCompleted,
  currentSelectedElectives,
  currentSelectedTrack,
  comparePlan,
}: PlanComparisonPanelProps) {
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const preferredUnits = 15;
  const minUnitsPerSemester = 12;

  const comparison = useMemo(() => {
    const current = assessTrackAwarePlanHealth({
      courses,
      plan: currentPlan,
      completedCourseIds: currentCompleted,
      majorRequirements: major,
      selectedElectives: currentSelectedElectives,
      selectedTrack: currentSelectedTrack,
      preferredUnits,
      minUnitsPerSemester,
    });
    const saved = assessTrackAwarePlanHealth({
      courses,
      plan: comparePlan.plan,
      completedCourseIds: comparePlan.completedCourses,
      majorRequirements: major,
      selectedElectives: comparePlan.selectedElectives,
      selectedTrack: comparePlan.selectedTrack ?? null,
      preferredUnits,
      minUnitsPerSemester,
    });

    const currentCourses = new Set(currentPlan.semesters.flatMap((semester) => semester.courses));
    const savedCourses = new Set(comparePlan.plan.semesters.flatMap((semester) => semester.courses));

    return {
      current,
      saved,
      onlyInCurrent: [...currentCourses].filter((id) => !savedCourses.has(id)),
      onlyInSaved: [...savedCourses].filter((id) => !currentCourses.has(id)),
    };
  }, [
    comparePlan.completedCourses,
    comparePlan.plan,
    comparePlan.selectedElectives,
    courses,
    currentCompleted,
    currentPlan,
    currentSelectedElectives,
    currentSelectedTrack,
    major,
  ]);

  const timelineDelta = comparison.current.activeSemesters - comparison.saved.activeSemesters;
  const hardDelta = comparison.current.hardIssueCount - comparison.saved.hardIssueCount;

  return (
    <div className="border-t border-beach-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
            Scenario Comparison
          </h3>
          <p className="mt-1 text-sm text-zinc-300">
            Current plan vs. <span className="text-zinc-100">{comparePlan.name}</span>
          </p>
          {comparePlan.notes && (
            <p className="mt-1 text-xs text-zinc-500">{comparePlan.notes}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-beach-border bg-beach-card/40 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Current</p>
          <p className="mt-1 text-sm text-zinc-200">
            {STATUS_LABELS[comparison.current.status]} · {endingTerm(currentPlan)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {comparison.current.activeSemesters} active semesters · {comparison.current.hardIssueCount} hard issues
          </p>
        </div>
        <div className="rounded-xl border border-beach-border bg-beach-card/40 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{comparePlan.name}</p>
          <p className="mt-1 text-sm text-zinc-200">
            {STATUS_LABELS[comparison.saved.status]} · {endingTerm(comparePlan.plan)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {comparison.saved.activeSemesters} active semesters · {comparison.saved.hardIssueCount} hard issues
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-beach-border bg-beach-card/40 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Decision notes</p>
          <div className="mt-2 space-y-2 text-xs text-zinc-300">
            <p>
              {timelineDelta === 0
                ? "Both scenarios use the same number of active semesters."
                : timelineDelta < 0
                  ? `Current plan is shorter by ${Math.abs(timelineDelta)} active semester${Math.abs(timelineDelta) === 1 ? "" : "s"}.`
                  : `Saved scenario is shorter by ${Math.abs(timelineDelta)} active semester${Math.abs(timelineDelta) === 1 ? "" : "s"}.`}
            </p>
            <p>
              {hardDelta === 0
                ? "Both scenarios have the same number of hard rule/completeness issues."
                : hardDelta < 0
                  ? `Current plan removes ${Math.abs(hardDelta)} hard issue${Math.abs(hardDelta) === 1 ? "" : "s"} compared with this scenario.`
                  : `Saved scenario removes ${Math.abs(hardDelta)} hard issue${Math.abs(hardDelta) === 1 ? "" : "s"} compared with the current plan.`}
            </p>
            <p>
              Current-only courses: {comparison.onlyInCurrent.slice(0, 5).join(", ") || "none"}.
            </p>
            <p>
              Scenario-only courses: {comparison.onlyInSaved.slice(0, 5).join(", ") || "none"}.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-beach-border bg-beach-card/40 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Stakeholder framing</p>
          <div className="mt-2 space-y-2 text-xs text-zinc-300">
            <p>Use this view to compare a conservative plan, a faster plan, or a transfer-adjusted plan side by side.</p>
            <p>For stakeholders, emphasize that the tool supports scenario review before enrollment rather than replacing official registration.</p>
            <p>Keep saved scenarios named by use case, not by date alone: “Balanced workload”, “Faster graduation”, “Transfer catch-up”.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
