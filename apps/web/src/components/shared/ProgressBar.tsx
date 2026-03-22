"use client";

import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";

export default function ProgressBar() {
  const major = useCourseStore((s) => s.major);
  const viewMode = useCourseStore((s) => s.viewMode);
  const completed = useProgressStore((s) => s.completed);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);

  // Count required courses based on view mode
  const allRequired: string[] = [];
  for (const req of major.requirements) {
    if (req.type === "all") {
      // In major mode, skip GE and support courses
      if (viewMode === "major") {
        const nonGe = req.courses.filter(
          (id) => !id.startsWith("GE-") && !["PHYS 151", "PHYS 152", "ENGR 350"].includes(id)
        );
        allRequired.push(...nonGe);
      } else {
        allRequired.push(...req.courses);
      }
    }
    if (req.type === "choose") {
      allRequired.push(
        ...selectedElectives.filter((id) => req.courses.includes(id))
      );
    }
  }

  const totalRequired = allRequired.length;
  const completedRequired = allRequired.filter((id) =>
    completed.has(id)
  ).length;
  const percent =
    totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const totalUnits = allRequired.reduce((sum, id) => {
    const courses = useCourseStore.getState().allCourses;
    const c = courses.find((c) => c.id === id);
    return sum + (c?.units ?? 0);
  }, 0);

  const completedUnits = allRequired
    .filter((id) => completed.has(id))
    .reduce((sum, id) => {
      const courses = useCourseStore.getState().allCourses;
      const c = courses.find((c) => c.id === id);
      return sum + (c?.units ?? 0);
    }, 0);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden max-w-48">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-mono text-zinc-400">
        {completedRequired}/{totalRequired} courses · {completedUnits}/{totalUnits}u · {percent}%
      </span>
    </div>
  );
}
