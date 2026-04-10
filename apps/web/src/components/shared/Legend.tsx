"use client";

import { categoryColors } from "@/lib/colors";
import { useCourseStore } from "@/stores/courseStore";

export default function Legend() {
  const viewMode = useCourseStore((s) => s.viewMode);

  // Only show categories relevant to current view
  const visibleCategories = viewMode === "major"
    ? ["math", "core", "upper", "elective", "capstone"]
    : Object.keys(categoryColors);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px]">
      <div className="flex items-center gap-2.5">
        <span className="text-zinc-600 font-mono uppercase tracking-widest">Status</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-900/80 border border-emerald-500/80" />
          <span className="text-zinc-500">Done</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-950/60 border border-sky-500/70" />
          <span className="text-zinc-500">Available</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800/80 border border-zinc-700" />
          <span className="text-zinc-500">Locked</span>
        </span>
      </div>
      <span className="text-zinc-800">|</span>
      <div className="flex items-center gap-2.5">
        <span className="text-zinc-600 font-mono uppercase tracking-widest">Border</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm border-[1.5px] border-zinc-300" />
          <span className="text-zinc-500">Required</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm border border-zinc-700/60" style={{ borderStyle: "dashed" }} />
          <span className="text-zinc-500">Elective</span>
        </span>
      </div>
      <span className="text-zinc-800">|</span>
      <div className="flex items-center gap-2.5">
        <span className="text-zinc-600 font-mono uppercase tracking-widest">Category</span>
        {visibleCategories.map((key) => {
          const val = categoryColors[key];
          if (!val) return null;
          return (
            <span
              key={key}
              className="flex items-center gap-1 rounded-full border px-2 py-1"
              style={{ borderColor: `${val.border}55`, backgroundColor: `${val.bg}` }}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: val.bg, border: `1px solid ${val.border}` }}
              />
              <span style={{ color: val.color }}>{val.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
