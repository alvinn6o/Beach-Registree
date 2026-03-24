"use client";

import { useState, useEffect } from "react";
import { useProgressStore, LOWER_GE_COURSES, UPPER_GE_COURSES, LOWER_CORE_COURSES } from "@/stores/progressStore";

const GROUPS = [
  { id: "lower-ge", label: "Lower GE", courses: LOWER_GE_COURSES, description: "17 lower-division General Education courses" },
  { id: "upper-ge", label: "Upper GE", courses: UPPER_GE_COURSES, description: "3 upper-division GE courses (taken after 60 units)" },
  { id: "lower-core", label: "Lower Core", courses: LOWER_CORE_COURSES, description: "Lower-division CECS, MATH, and ENGR courses" },
] as const;

export default function QuickSelect() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const completed = useProgressStore((s) => s.completed);
  const bulkToggle = useProgressStore((s) => s.bulkToggle);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1">
      {GROUPS.map(({ id, label, courses, description }) => {
        const doneCount = courses.filter((c) => completed.has(c)).length;
        const allDone = doneCount === courses.length;

        return (
          <button
            key={id}
            onClick={() => bulkToggle([...courses])}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              allDone
                ? "bg-emerald-900/25 text-emerald-400 border-emerald-800/50"
                : doneCount > 0
                ? "bg-emerald-900/10 text-emerald-500/70 border-emerald-900/30"
                : "text-zinc-600 border-beach-border hover:text-zinc-400 hover:border-zinc-700"
            }`}
            title={`${description}\n${doneCount}/${courses.length} completed — click to ${allDone ? "unmark all" : "mark all complete"}`}
          >
            {allDone && <span className="mr-0.5">✓</span>}
            {label}
            {!allDone && doneCount > 0 && (
              <span className="ml-1 text-[9px] opacity-60">{doneCount}/{courses.length}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
