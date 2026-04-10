"use client";

import { useState } from "react";
import { buildSemesterInsights } from "@/lib/planInsights";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";

const TONE_STYLES = {
  light: "border-amber-900/30 bg-amber-950/10 text-amber-300",
  balanced: "border-blue-900/30 bg-blue-950/10 text-blue-300",
  heavy: "border-orange-900/30 bg-orange-950/10 text-orange-300",
} as const;

interface PlanInsightsPanelProps {
  embedded?: boolean;
}

export default function PlanInsightsPanel(props: PlanInsightsPanelProps) {
  return <PlanInsightsPanelInner {...props} />;
}

export function PlanInsightsPanelInner({ embedded = false }: PlanInsightsPanelProps = {}) {
  const [expanded, setExpanded] = useState(false);
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const minUnitsPerSemester = useProgressStore((state) => state.minUnitsPerSemester);

  if (!plan) return null;

  const insights = buildSemesterInsights(
    plan.semesters,
    courses,
    minUnitsPerSemester
  );

  if (insights.length === 0) return null;

  const isExpanded = embedded || expanded;

  return (
    <div className={`${embedded ? "p-5" : "border-b border-beach-border/50 px-4 py-3"}`}>
      {!embedded && (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="w-full flex items-center gap-2 text-left"
        >
          <span className={`text-zinc-600 font-mono text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▶
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-500/60" />
          <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Why This Plan Looks This Way
          </h3>
          <span className="text-[10px] font-mono text-zinc-700 bg-beach-card px-1.5 py-0.5 rounded">
            optional
          </span>
          <span className="text-[10px] text-zinc-700 ml-1">
            {expanded ? "hide rationale" : "show rationale"}
          </span>
        </button>
      )}

      {!embedded && !expanded && (
        <p className="mt-2 text-[11px] text-zinc-600">
          Optional explanation for how the scheduler balanced prerequisite progress, standing rules, and unit load.
        </p>
      )}

      {isExpanded && (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.term}
              className={`rounded-xl border p-3 ${TONE_STYLES[insight.tone]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  {insight.term}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider">
                  {insight.tone}
                </span>
              </div>

              <p className="text-xs leading-relaxed mb-2">
                {insight.summary}
              </p>

              <div className="space-y-1">
                {insight.highlights.map((highlight) => (
                  <p key={highlight} className="text-[11px] text-zinc-400 leading-relaxed">
                    {highlight}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
