"use client";

import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";

export default function SelectionActions() {
  const clearPlan = usePlannerStore((s) => s.clearPlan);
  const completed = useProgressStore((s) => s.completed);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const clearCompleted = useProgressStore((s) => s.clearCompleted);
  const clearSelectedElectives = useProgressStore((s) => s.clearSelectedElectives);

  const hasCompleted = completed.size > 0;
  const hasElectiveSelections = selectedElectives.length > 0;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => {
          clearSelectedElectives();
          clearPlan();
        }}
        disabled={!hasElectiveSelections}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
          hasElectiveSelections
            ? "text-zinc-500 border-beach-border hover:text-zinc-300 hover:border-zinc-600"
            : "text-zinc-700 border-zinc-800 cursor-not-allowed"
        }`}
        title="Clear selected electives and track, then remove the generated plan"
      >
        Clear Picks
      </button>
      <button
        onClick={() => {
          clearCompleted();
          clearPlan();
        }}
        disabled={!hasCompleted}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
          hasCompleted
            ? "text-zinc-500 border-beach-border hover:text-zinc-300 hover:border-zinc-600"
            : "text-zinc-700 border-zinc-800 cursor-not-allowed"
        }`}
        title="Clear completed-course selections and remove the generated plan"
      >
        Clear Done
      </button>
    </div>
  );
}
