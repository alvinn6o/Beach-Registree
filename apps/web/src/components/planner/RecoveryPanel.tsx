"use client";

import { useMemo, useState } from "react";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { buildBlockedCourseRecoverySuggestions } from "@/lib/planner";
import { getTrackAwareMajorRequirements } from "@/lib/trackRequirements";

interface RecoveryPanelProps {
  embedded?: boolean;
}

export default function RecoveryPanel({ embedded = false }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const completed = useProgressStore((state) => state.completed);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const selectedTrack = useProgressStore((state) => state.selectedTrack);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const trackMajor = getTrackAwareMajorRequirements(major, selectedTrack);

  const suggestions = useMemo(() => {
    if (!plan) return [];
    return buildBlockedCourseRecoverySuggestions(
      plan.semesters,
      courses,
      [...completed],
      trackMajor,
      selectedElectives,
      preferredUnits
    );
  }, [completed, courses, plan, preferredUnits, selectedElectives, trackMajor]);

  if (!plan || suggestions.length === 0) return null;

  const isExpanded = embedded || expanded;

  return (
    <div className={`${embedded ? "p-5" : "border-b border-beach-border/60 px-4 py-4"}`}>
      {!embedded && (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-2 text-left"
        >
          <span className={`text-zinc-600 font-mono text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▶
          </span>
          <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
            Recovery Guidance
          </h3>
          <span className="rounded-full border border-red-900/40 bg-red-950/20 px-2 py-0.5 text-[10px] font-mono text-red-300">
            {suggestions.length} blocked areas
          </span>
        </button>
      )}

      {!embedded && !expanded && (
        <p className="mt-2 text-xs text-zinc-500">
          Concrete next actions for required courses that still do not fit under the current draft.
        </p>
      )}

      {isExpanded && (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {suggestions.map((suggestion) => (
            <div key={suggestion.courseId} className="rounded-2xl border border-beach-border/70 bg-beach-card/40 p-3">
              <p className="text-sm text-zinc-100">{suggestion.title}</p>
              <div className="mt-2 space-y-1">
                {suggestion.blockers.map((blocker) => (
                  <p key={blocker} className="text-xs text-red-300">
                    {blocker}
                  </p>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {suggestion.actions.map((action) => (
                  <p key={action} className="text-xs text-zinc-400">
                    {action}
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
