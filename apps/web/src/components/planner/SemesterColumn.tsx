"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { validateCoursePlacement } from "graph-core";
import CourseCard from "./CourseCard";
import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { getPlacementHint, summarizePlacementErrors } from "@/lib/planner";
import type { SemesterPlan, MajorRequirements } from "graph-core";
import type { ValidationError } from "graph-core";
import { getTrackAwareMajorRequirements } from "@/lib/trackRequirements";

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
  const selectedTrack = useProgressStore((s) => s.selectedTrack);
  const plan = usePlannerStore((s) => s.plan);
  const addCourse = usePlannerStore((s) => s.addCourse);
  const trackMajor = getTrackAwareMajorRequirements(major, selectedTrack);

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
  const completedList = [...completed];

  const isFall = semester.term.startsWith("Fall");
  const hasIssues = errors.length > 0;
  const isLight = totalUnits > 0 && totalUnits < 12;
  const isHeavy = totalUnits > 21;
  const needsApproval = totalUnits > 18 && totalUnits <= 21;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-[28px] border transition-all duration-200 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ${
        isOver
          ? "border-blue-500/50 bg-blue-950/10 shadow-lg shadow-blue-500/10"
          : hasIssues
            ? "border-red-500/20 bg-gradient-to-b from-beach-card to-[#11151d]"
            : "border-beach-border bg-gradient-to-b from-beach-card to-[#11151d]"
      }`}
    >
      {/* Header */}
      <div className={`rounded-t-[28px] border-b px-4 py-4 text-center transition-colors ${
        isFall
          ? "border-amber-900/20 bg-gradient-to-r from-amber-950/25 to-transparent"
          : "border-sky-900/20 bg-gradient-to-r from-sky-950/25 to-transparent"
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isFall ? "bg-amber-500/70" : "bg-sky-500/70"}`} />
            <div>
              <h3 className="font-mono text-xs font-semibold text-zinc-100 tracking-wide">
                {semester.term}
              </h3>
              <p className="mt-1 text-[10px] text-zinc-500">
                {semester.courses.length} course{semester.courses.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-mono font-medium ${
              isHeavy
                ? "border-red-900/40 bg-red-950/30 text-red-300"
                : needsApproval
                  ? "border-orange-900/40 bg-orange-950/30 text-orange-300"
                  : isLight
                    ? "border-amber-900/40 bg-amber-950/30 text-amber-300"
                    : "border-beach-border/60 bg-beach-dark/50 text-zinc-400"
            }`}
          >
            {totalUnits}u
          </span>
        </div>
      </div>

      <div className="px-3 pt-3">
        {(isLight || needsApproval || isHeavy) && semester.courses.length > 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {isLight && (
              <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-2.5 py-1 text-[9px] text-amber-300">
                Below full-time
              </span>
            )}
            {needsApproval && (
              <span className="rounded-full border border-orange-900/40 bg-orange-950/20 px-2.5 py-1 text-[9px] text-orange-300">
                Approval likely needed
              </span>
            )}
            {isHeavy && (
              <span className="rounded-full border border-red-900/40 bg-red-950/20 px-2.5 py-1 text-[9px] text-red-300">
                Over max load
              </span>
            )}
          </div>
        )}
      </div>

      {/* Course cards */}
      <div className="min-h-[160px] space-y-2 px-3 pb-3">
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
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-beach-dark/30 py-12 text-center">
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.18em]">Drop courses here</span>
          </div>
        )}
      </div>

      {/* Add course UI */}
      <div className="px-3 pb-3 mt-auto">
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
              className="w-full bg-beach-dark border border-beach-border rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-blue-500/50"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-40 left-0 right-0 top-full mt-2 bg-[#181a24] border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden">
                {suggestions.map((c) => {
                  const placementErrors = validateCoursePlacement(
                    c.id,
                    semester.term,
                    allCourses,
                    plan?.semesters ?? [],
                    completedList
                  );
                  const isBlocked = placementErrors.length > 0;
                  const satisfied = isGroupSatisfied(c.id, trackMajor, scheduledIds, completed);
                  const placementHint = getPlacementHint(
                    c.id,
                    plan?.semesters ?? [],
                    allCourses,
                    completedList
                  );
                  const reason = summarizePlacementErrors(placementErrors);
                  return (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2.5 transition-colors border-b border-zinc-800/50 last:border-0 ${
                      isBlocked ? "opacity-40 cursor-not-allowed" : satisfied ? "opacity-50" : "hover:bg-zinc-800/60"
                    }`}
                    title={
                      isBlocked
                        ? reason
                        : placementHint.earliestValidTerm && placementHint.earliestValidTerm !== semester.term
                          ? `Earliest valid term: ${placementHint.earliestValidTerm}`
                          : `${c.id} can be added to ${semester.term}`
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (isBlocked) return;
                      addCourse(c.id, semester.term, c.units);
                      setAdding(false);
                      setQuery("");
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-center">
                        <span className="font-mono text-[10px] text-blue-400">{c.id}</span>
                        <span className="ml-2 truncate text-[10px] text-zinc-500">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-600">· {c.units}u</span>
                        {isBlocked && <span className="text-[8px] text-red-400 ml-1">blocked</span>}
                        {satisfied && !isBlocked && <span className="text-[8px] text-green-500/60 ml-1">satisfied</span>}
                        {!isBlocked && !satisfied && placementHint.earliestValidTerm === semester.term && (
                          <span className="text-[8px] text-blue-400/70 ml-1">ready</span>
                        )}
                      </div>
                    </div>
                    {isBlocked && placementHint.earliestValidTerm && (
                      <span className="block text-[8px] text-amber-400/80 mt-1">Later: {placementHint.earliestValidTerm}</span>
                    )}
                    {isBlocked && !placementHint.earliestValidTerm && reason && (
                      <span className="block text-[8px] text-red-300/80 mt-1">{reason}</span>
                    )}
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
            className="w-full flex items-center justify-center gap-1 py-2.5 rounded-2xl border border-dashed border-zinc-800 text-[10px] font-mono text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors uppercase tracking-[0.18em]"
          >
            <span className="text-[13px] leading-none">+</span> Add course
          </button>
        )}
      </div>
    </div>
  );
}
