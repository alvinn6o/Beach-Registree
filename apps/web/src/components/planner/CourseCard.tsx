"use client";

import { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { categoryColors } from "@/lib/colors";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import type { Course } from "graph-core";

interface CourseCardProps {
  course: Course;
  semester: string;
  hasError?: boolean;
  errorMessage?: string;
}

export default function CourseCard({
  course,
  semester,
  hasError,
  errorMessage,
}: CourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${course.id}::${semester}`,
      data: { courseId: course.id, fromSemester: semester },
    });

  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getCourse = useCourseStore((s) => s.getCourse);
  const allCourses = useCourseStore((s) => s.allCourses);
  const removeCourse = usePlannerStore((s) => s.removeCourse);

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
      className={`group relative px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 ${
        hasError
          ? "border-red-500/30 bg-red-950/20"
          : "border-beach-border/60 bg-beach-dark/80 hover:border-zinc-700 hover:bg-beach-dark"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="font-mono text-[11px] font-semibold"
          style={{ color: cat.color }}
        >
          {course.id}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-zinc-600 bg-beach-card px-1.5 py-0.5 rounded">
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
      <p className="text-[10px] text-zinc-500 truncate leading-snug">{course.name}</p>
      {hasError && (
        <p className="text-[9px] text-red-400/80 mt-1 leading-tight">{errorMessage}</p>
      )}

      {/* Hover tooltip */}
      {showTooltip && !isDragging && (
        <div
          className="absolute z-50 left-full ml-2 top-0 w-64 bg-[#181a24] border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/50 p-3.5 pointer-events-none"
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
        </div>
      )}
    </div>
  );
}
