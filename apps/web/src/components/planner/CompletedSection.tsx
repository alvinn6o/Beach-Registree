"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { categoryColors } from "@/lib/colors";
import type { Course } from "graph-core";

function CompletedCard({ course }: { course: Course }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${course.id}::completed`,
      data: { courseId: course.id, fromZone: "completed" },
    });

  const toggleCompleted = useProgressStore((s) => s.toggleCompleted);
  const cat = categoryColors[course.category] ?? categoryColors.core;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group px-3 py-2 rounded-xl border border-green-800/30 bg-green-950/20 hover:border-green-700/40 cursor-grab active:cursor-grabbing transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[11px] font-semibold text-green-400/80">
          {course.id}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-zinc-600 bg-beach-card px-1.5 py-0.5 rounded">
            {course.units}u
          </span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-red-950/40"
            title="Unmark as completed"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleCompleted(course.id);
            }}
          >
            ×
          </button>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 truncate leading-snug">
        {course.name}
      </p>
    </div>
  );
}

export default function CompletedSection() {
  const { isOver, setNodeRef } = useDroppable({
    id: "completed",
    data: { zone: "completed" },
  });

  const getCourse = useCourseStore((s) => s.getCourse);
  const completed = useProgressStore((s) => s.completed);
  const plan = usePlannerStore((s) => s.plan);

  const scheduledIds = new Set(plan?.semesters.flatMap((s) => s.courses) ?? []);

  const completedCourses = [...completed]
    .filter((id) => !scheduledIds.has(id))
    .map((id) => getCourse(id))
    .filter((c): c is Course => c !== undefined);

  return (
    <div
      ref={setNodeRef}
      className={`p-4 border-t border-beach-border transition-all duration-200 ${
        isOver ? "bg-green-950/10 border-green-800/30" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-500/50" />
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Completed
        </h3>
        <span className="text-[10px] font-mono text-zinc-700 bg-beach-card px-1.5 py-0.5 rounded">
          {completedCourses.length}
        </span>
        <span className="text-[10px] font-mono text-zinc-700 ml-1">
          — drag courses here to mark complete, or drag out to reschedule
        </span>
      </div>

      {completedCourses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {completedCourses.map((course) => (
            <CompletedCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div
          className={`py-4 rounded-xl border border-dashed transition-colors ${
            isOver ? "border-green-600/40 bg-green-950/5" : "border-zinc-800"
          }`}
        >
          <p className="text-center text-[10px] font-mono text-zinc-700">
            {isOver
              ? "Drop to mark as completed"
              : "Drag semester courses here to mark as completed"}
          </p>
        </div>
      )}
    </div>
  );
}
