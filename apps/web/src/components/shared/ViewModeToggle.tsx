"use client";

import { useCourseStore } from "@/stores/courseStore";
import type { ViewMode } from "graph-core";

export default function ViewModeToggle() {
  const viewMode = useCourseStore((s) => s.viewMode);
  const setViewMode = useCourseStore((s) => s.setViewMode);

  return (
    <div className="flex items-center bg-beach-dark rounded-lg border border-beach-border p-0.5">
      <button
        onClick={() => setViewMode("major")}
        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
          viewMode === "major"
            ? "bg-zinc-800 text-zinc-200 shadow-sm"
            : "text-zinc-600 hover:text-zinc-400"
        }`}
      >
        Major
      </button>
      <button
        onClick={() => setViewMode("all")}
        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
          viewMode === "all"
            ? "bg-zinc-800 text-zinc-200 shadow-sm"
            : "text-zinc-600 hover:text-zinc-400"
        }`}
      >
        All Courses
      </button>
    </div>
  );
}
