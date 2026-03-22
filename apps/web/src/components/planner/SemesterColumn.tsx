"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import CourseCard from "./CourseCard";
import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import type { SemesterPlan, MajorRequirements } from "graph-core";
import type { ValidationError } from "graph-core";

/** Check if a course belongs to a "choose N" group that's already satisfied */
function isGroupSatisfied(
  courseId: string,
  major: MajorRequirements,
  planned: Set<string>,
  completed: Set<string>
): boolean {
  for (const req of major.requirements) {
    if (req.type !== "choose" || !req.count) continue;
    if (!req.courses.includes(courseId)) continue;
    const chosen = req.courses.filter(
      (id) => planned.has(id) || completed.has(id)
    );
    if (chosen.length >= req.count && !planned.has(courseId) && !completed.has(courseId)) {
      return true;
    }
  }
  return false;
}

interface SemesterColumnProps {
  semester: SemesterPlan;
  errors: ValidationError[];
}

export default function SemesterColumn({ semester, errors }: SemesterColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: semester.term,
    data: { term: semester.term },
  });

  const getCourse = useCourseStore((s) => s.getCourse);
  const allCourses = useCourseStore((s) => s.allCourses);
  const major = useCourseStore((s) => s.major);
  const completed = useProgressStore((s) => s.completed);
  const plan = usePlannerStore((s) => s.plan);
  const addCourse = usePlannerStore((s) => s.addCourse);

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  // All course IDs already in the plan across all semesters
  const scheduledIds = new Set(plan?.semesters.flatMap((s) => s.courses) ?? []);

  const suggestions = query.trim().length >= 1
    ? allCourses
        .filter(
          (c) =>
            !scheduledIds.has(c.id) &&
            (c.id.toLowerCase().includes(query.toLowerCase()) ||
              c.name.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  const totalUnits = semester.courses.reduce((sum, id) => {
    const c = getCourse(id);
    return sum + (c?.units ?? 0);
  }, 0);

  const isFall = semester.term.startsWith("Fall");
  const hasIssues = errors.length > 0;
  const isLight = totalUnits > 0 && totalUnits < 12;
  const isHeavy = totalUnits > 21;
  const needsApproval = totalUnits > 18 && totalUnits <= 21;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-60 rounded-2xl border transition-all duration-200 ${
        isOver
          ? "border-blue-500/50 bg-blue-950/10 shadow-lg shadow-blue-500/5"
          : hasIssues
            ? "border-red-500/20 bg-beach-card"
            : "border-beach-border bg-beach-card"
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-2xl border-b transition-colors ${
        isFall
          ? "border-amber-900/20 bg-gradient-to-r from-amber-950/20 to-transparent"
          : "border-sky-900/20 bg-gradient-to-r from-sky-950/20 to-transparent"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFall ? "bg-amber-500/60" : "bg-sky-500/60"}`} />
            <h3 className="font-mono text-xs font-semibold text-zinc-300 tracking-wide">
              {semester.term}
            </h3>
          </div>
          <span
            className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
              isHeavy
                ? "text-red-400 bg-red-900/30"
                : needsApproval
                  ? "text-orange-400 bg-orange-900/30"
                  : isLight
                    ? "text-amber-400 bg-amber-900/30"
                    : "text-zinc-500"
            }`}
          >
            {totalUnits}u
          </span>
        </div>
      </div>

      {/* Course cards */}
      <div className="p-2 space-y-1.5 min-h-[100px]">
        {semester.courses.map((id) => {
          const course = getCourse(id);
          if (!course) return null;
          const courseErrors = errors.filter((e) => e.course === id);
          return (
            <CourseCard
              key={id}
              course={course}
              semester={semester.term}
              hasError={courseErrors.length > 0}
              errorMessage={courseErrors.map((e) => e.message).join("; ")}
            />
          );
        })}
        {semester.courses.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[10px] text-zinc-700 font-mono">Drop courses here</span>
          </div>
        )}
      </div>

      {/* Add course UI */}
      <div className="px-2 pb-2">
        {adding ? (
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setAdding(false); setQuery(""); }
              }}
              placeholder="Search course ID or name…"
              className="w-full bg-beach-dark border border-beach-border rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-blue-500/50"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-[#181a24] border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((c) => {
                  const wouldExceed = totalUnits + c.units > 21;
                  const satisfied = isGroupSatisfied(c.id, major, scheduledIds, completed);
                  return (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2 transition-colors border-b border-zinc-800/50 last:border-0 ${
                      wouldExceed ? "opacity-40 cursor-not-allowed" : satisfied ? "opacity-50" : "hover:bg-zinc-800/60"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (wouldExceed) return;
                      addCourse(c.id, semester.term, c.units);
                      setAdding(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-mono text-[10px] text-blue-400">{c.id}</span>
                    <span className="text-[10px] text-zinc-500 ml-2 truncate">{c.name}</span>
                    <span className="text-[9px] text-zinc-600 ml-1">· {c.units}u</span>
                    {wouldExceed && <span className="text-[8px] text-red-400 ml-1">exceeds 21u</span>}
                    {satisfied && !wouldExceed && <span className="text-[8px] text-green-500/60 ml-1">satisfied</span>}
                  </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => { setAdding(false); setQuery(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] font-mono text-zinc-700 hover:text-zinc-500 hover:border-zinc-700 transition-colors"
          >
            <span className="text-[13px] leading-none">+</span> Add course
          </button>
        )}
      </div>

      {/* Dynamic warnings */}
      {(isLight || needsApproval || isHeavy) && semester.courses.length > 0 && (
        <div className="px-3 pb-2.5 space-y-1">
          {isLight && (
            <p className="text-[10px] text-amber-500/80 leading-tight">
              Only {totalUnits} units — below full-time minimum (12)
            </p>
          )}
          {needsApproval && (
            <p className="text-[10px] text-orange-400/80 leading-tight flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full border border-orange-500/50 text-[8px] text-center leading-3 flex-shrink-0">!</span>
              {totalUnits} units — above 18 requires departmental approval
            </p>
          )}
          {isHeavy && (
            <p className="text-[10px] text-red-400/80 leading-tight">
              {totalUnits} units — exceeds maximum (21)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
