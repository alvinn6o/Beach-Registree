"use client";

import { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { categoryColors } from "@/lib/colors";
import { buildCourseRationale } from "@/lib/planner";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import type { Course } from "graph-core";

interface CourseCardProps {
  course: Course;
  semester: string;
  hasError?: boolean;
  errorMessage?: string;
  onSelect?: (id: string | null) => void;
  isSelected?: boolean;
}

export default function CourseCard({
  course,
  semester,
  hasError,
  errorMessage,
  onSelect,
  isSelected,
}: CourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${course.id}::${semester}`,
      data: { courseId: course.id, fromSemester: semester },
    });

  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const getCourse = useCourseStore((s) => s.getCourse);
  const allCourses = useCourseStore((s) => s.allCourses);
  const plan = usePlannerStore((s) => s.plan);
  const removeCourse = usePlannerStore((s) => s.removeCourse);
  const completed = useProgressStore((s) => s.completed);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const cat = categoryColors[course.category] || categoryColors.core;

  const prereqCourses = course.prerequisites
    .map((id) => {
      const c = getCourse(id);
      return c ? `${c.id} — ${c.name}` : id;
    });

  const prereqOrLabels = course.prerequisites_or
    .map((group) => group.map((id) => {
      const c = getCourse(id);
      return c ? c.id : id;
    }).join(" or "))
    .filter((s) => s.length > 0);

  // Courses that list this course as a prerequisite
  const requiredForCourses = allCourses.filter(
    (c) =>
      c.prerequisites.includes(course.id) ||
      c.prerequisites_or.some((group) => group.includes(course.id))
  ).map((c) => `${c.id} — ${c.name}`);

  const semesterLabel =
    course.semester_offered === "F/S"
      ? "Fall & Spring"
      : course.semester_offered === "F"
        ? "Fall only"
        : "Spring only";
  const standingLabel = course.minUnitsCompleted
    ? `${course.minUnitsCompleted}+ completed units required`
    : null;
  const rationale = plan
    ? buildCourseRationale(
        course.id,
        semester,
        plan.semesters,
        allCourses,
        [...completed]
      )
    : [];

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setShowTooltip(true), 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowTooltip(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative overflow-hidden rounded-2xl border cursor-grab active:cursor-grabbing transition-all duration-200 ${
        hasError
          ? "border-red-500/30 bg-red-950/20"
          : isSelected
            ? "border-blue-500/50 bg-gradient-to-br from-blue-950/30 to-[#11151d] shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            : "border-beach-border/60 bg-gradient-to-br from-beach-dark/95 to-[#11151d] hover:border-zinc-600 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
      }`}
      onPointerDown={(e) => { pointerDownPos.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && onSelect) {
          onSelect(isSelected ? null : course.id);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${cat.color}, transparent)` }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <span
                className="font-mono text-[11px] font-semibold tracking-wide"
                style={{ color: cat.color }}
              >
                {course.id}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-mono uppercase tracking-[0.18em]"
                style={{ backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
              >
                {cat.label}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-zinc-300 line-clamp-2">
              {course.name}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-beach-card px-2 py-1 text-[9px] font-mono text-zinc-400 border border-beach-border/60">
              {course.units}u
            </span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-red-950/40"
            title="Remove from semester"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              removeCourse(course.id, semester);
            }}
          >
            ×
          </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2">
            {rationale.length > 0 && (
              <span className="text-[9px] font-mono text-zinc-600">hover for details</span>
            )}
          </div>
        </div>
        {hasError && (
          <div className="mt-2 flex justify-center">
            <span className="rounded-full border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-[8px] font-mono uppercase tracking-[0.16em] text-red-300">
              blocked
            </span>
          </div>
        )}
        {hasError && errorMessage && (
          <p className="mt-2 text-center text-[9px] leading-tight text-red-300/85 line-clamp-2">{errorMessage}</p>
        )}
      </div>

      {/* Hover tooltip */}
      {showTooltip && !isDragging && (
        <div
          className="absolute z-50 left-full ml-3 top-0 w-72 bg-[#181a24] border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/50 p-3.5 pointer-events-none"
          style={{ minWidth: "240px" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
            >
              {cat.label}
            </span>
            <span className="text-[9px] font-mono text-zinc-600">{semesterLabel}</span>
            {standingLabel && (
              <span className="text-[9px] font-mono text-amber-400/80">{standingLabel}</span>
            )}
          </div>

          <h4 className="font-mono text-xs font-semibold text-zinc-200 mb-0.5">
            {course.id}
          </h4>
          <p className="text-[11px] text-zinc-400 mb-2">{course.name}</p>

          {course.description && (
            <p className="text-[10px] text-zinc-500 leading-relaxed mb-2 line-clamp-3">
              {course.description}
            </p>
          )}

          {(prereqCourses.length > 0 || prereqOrLabels.length > 0) && (
            <div>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Prerequisites</p>
              <div className="space-y-0.5">
                {prereqCourses.map((label, i) => (
                  <p key={i} className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                    {label}
                  </p>
                ))}
                {prereqOrLabels.map((label, i) => (
                  <p key={`or-${i}`} className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-600">+</span> {label}
                  </p>
                ))}
              </div>
            </div>
          )}

          {prereqCourses.length === 0 && prereqOrLabels.length === 0 && (
            <p className="text-[9px] text-zinc-600 font-mono">No prerequisites</p>
          )}

          {requiredForCourses.length > 0 && (
            <div className="mt-2">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Required For</p>
              <div className="space-y-0.5">
                {requiredForCourses.slice(0, 5).map((label, i) => (
                  <p key={i} className="text-[10px] text-amber-400/80 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {label}
                  </p>
                ))}
                {requiredForCourses.length > 5 && (
                  <p className="text-[9px] text-zinc-600 font-mono">+{requiredForCourses.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {rationale.length > 0 && (
            <div className="mt-2">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Why Here</p>
              <div className="space-y-0.5">
                {rationale.map((reason) => (
                  <p key={reason} className="text-[10px] text-sky-300/80 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-sky-400 flex-shrink-0" />
                    {reason}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
