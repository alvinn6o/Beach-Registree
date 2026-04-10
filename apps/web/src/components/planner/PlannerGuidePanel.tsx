"use client";

import { assessPlanHealth } from "graph-core";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";

function getNextStep(params: {
  completedCount: number;
  selectedElectivesCount: number;
  hasPlan: boolean;
  hardIssues: number;
  warningIssues: number;
}) {
  const { completedCount, selectedElectivesCount, hasPlan, hardIssues, warningIssues } = params;

  if (completedCount === 0) {
    return {
      label: "Start by marking completed classes",
      detail: "Students often lose time because the system cannot tell what is already done. Mark completed courses first for a trustworthy plan.",
    };
  }

  if (selectedElectivesCount === 0) {
    return {
      label: "Choose electives or a focus area",
      detail: "A planner without your intended electives cannot produce a meaningful graduation path.",
    };
  }

  if (!hasPlan) {
    return {
      label: "Generate a first draft plan",
      detail: "Draft early, then refine. This reduces last-minute registration pressure when classes fill quickly.",
    };
  }

  if (hardIssues > 0) {
    return {
      label: "Fix rule blockers in the current plan",
      detail: "Blocked plans usually come from prerequisites, missing requirements, or standing gates that need to be moved later.",
    };
  }

  if (warningIssues > 0) {
    return {
      label: "Review load and timeline tradeoffs",
      detail: "The plan works, but a lighter or longer semester pattern may still need a student or advisor decision.",
    };
  }

  return {
    label: "Compare scenarios and prepare to register",
    detail: "Use saved scenarios to compare balanced workload, faster graduation, or transfer catch-up before final enrollment.",
  };
}

export default function PlannerGuidePanel() {
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const completed = useProgressStore((state) => state.completed);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const minUnitsPerSemester = useProgressStore((state) => state.minUnitsPerSemester);

  const report = plan
    ? assessPlanHealth({
        courses,
        plan,
        completedCourseIds: [...completed],
        majorRequirements: major,
        selectedElectives,
        preferredUnits,
        minUnitsPerSemester,
      })
    : null;

  const nextStep = getNextStep({
    completedCount: completed.size,
    selectedElectivesCount: selectedElectives.length,
    hasPlan: Boolean(plan),
    hardIssues: report?.hardIssueCount ?? 0,
    warningIssues: report?.warningCount ?? 0,
  });

  return (
    <div className="border-b border-beach-border/60 px-4 py-4 bg-gradient-to-r from-sky-950/10 via-transparent to-amber-950/10">
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
        <div className="rounded-2xl border border-sky-900/30 bg-beach-card/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-sky-300/70">
            Next Best Step
          </p>
          <p className="mt-2 text-sm text-zinc-100">{nextStep.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{nextStep.detail}</p>
        </div>

        <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
            Why students struggle
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Common pain points are not knowing what comes next, not trusting which tool is official, and rushing when classes fill.
          </p>
        </div>

        <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
            What this planner does
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            It makes prerequisite order visible, builds a draft path, and gives a clearer starting point before official enrollment.
          </p>
        </div>
      </div>
    </div>
  );
}
