"use client";

import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { categoryColors } from "@/lib/colors";

interface CoursePanelProps {
  courseId: string;
  onClose: () => void;
}

export default function CoursePanel({ courseId, onClose }: CoursePanelProps) {
  const getCourse = useCourseStore((s) => s.getCourse);
  const allCourses = useCourseStore((s) => s.allCourses);
  const completed = useProgressStore((s) => s.completed);
  const toggleCompleted = useProgressStore((s) => s.toggleCompleted);
  const getStatusFn = useCourseStore((s) => s.getStatus);
  const getPathToFn = useCourseStore((s) => s.getPathTo);
  const getDownstreamFn = useCourseStore((s) => s.getDownstream);

  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const toggleElective = useProgressStore((s) => s.toggleElective);

  const course = getCourse(courseId);
  if (!course) return null;

  const status = getStatusFn(courseId, completed);
  const path = getPathToFn(courseId);
  const downstream = getDownstreamFn(courseId);
  const catColor = categoryColors[course.category] || categoryColors.core;
  const isElective = course.category === "elective";
  const isInElectives = selectedElectives.includes(courseId);

  // Courses that directly list this course as a prerequisite (AND or OR)
  const requiredFor = allCourses.filter(
    (c) =>
      c.prerequisites.includes(courseId) ||
      c.prerequisites_or.some((group) => group.includes(courseId))
  );

  const prereqCourses = course.prerequisites
    .map((id) => getCourse(id))
    .filter(Boolean);

  const prereqOrCourses = course.prerequisites_or
    .map((group) => group.map((id) => getCourse(id)).filter(Boolean))
    .filter((group) => group.length > 0);

  const semesterLabel =
    course.semester_offered === "F/S"
      ? "Fall & Spring"
      : course.semester_offered === "F"
        ? "Fall only"
        : "Spring only";

  return (
    <div className="w-80 bg-beach-card border-l border-beach-border h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-beach-border">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider"
            style={{ backgroundColor: catColor.bg, color: catColor.color, border: `1px solid ${catColor.border}` }}
          >
            {catColor.label}
          </span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm">
            &times;
          </button>
        </div>
        <h2 className="font-mono text-base font-semibold text-zinc-100 mb-0.5">
          {course.id}
        </h2>
        <p className="text-sm text-zinc-500">{course.name}</p>
      </div>

      {/* Status & Actions */}
      <div className="p-5 border-b border-beach-border">
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`text-[10px] font-mono px-2 py-1 rounded-md ${
              status === "completed"
                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50"
                : status === "available"
                  ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
                  : "bg-zinc-900 text-zinc-600 border border-zinc-800"
            }`}
          >
            {status.toUpperCase()}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{course.units}u</span>
          <span className="text-[10px] text-zinc-600 font-mono">{semesterLabel}</span>
          {course.minUnitsCompleted && (
            <span className="text-[10px] text-amber-400/80 font-mono">
              {course.minUnitsCompleted}+ units
            </span>
          )}
        </div>

        <button
          onClick={() => toggleCompleted(courseId)}
          className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${
            status === "completed"
              ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/30"
              : status === "available"
                ? "bg-zinc-100 text-zinc-900 hover:bg-white"
                : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
          }`}
          disabled={status === "locked"}
        >
          {status === "completed" ? "Mark Incomplete" : status === "available" ? "Mark Complete" : "Locked"}
        </button>

        {isElective && (
          <button
            onClick={() => toggleElective(courseId)}
            className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all mt-2 ${
              isInElectives
                ? "bg-purple-900/20 text-purple-400 border border-purple-800/40 hover:bg-purple-900/30"
                : "text-zinc-500 border border-beach-border hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {isInElectives ? "In My Plan" : "Add to Plan"}
          </button>
        )}
      </div>

      {/* Description */}
      <div className="p-5 border-b border-beach-border">
        <h3 className="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-widest">Description</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{course.description}</p>
      </div>

      {/* Prerequisites */}
      {(prereqCourses.length > 0 || prereqOrCourses.length > 0) && (
        <div className="p-5 border-b border-beach-border">
          <h3 className="text-[10px] font-mono text-zinc-600 mb-2.5 uppercase tracking-widest">Prerequisites</h3>
          <div className="space-y-1.5">
            {prereqCourses.map((pc) => {
              if (!pc) return null;
              const pStatus = getStatusFn(pc.id, completed);
              return (
                <div key={pc.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    pStatus === "completed" ? "bg-emerald-500" : pStatus === "available" ? "bg-blue-500" : "bg-zinc-700"
                  }`} />
                  <span className="font-mono text-zinc-400">{pc.id}</span>
                  <span className="text-zinc-600 truncate">{pc.name}</span>
                </div>
              );
            })}
            {prereqOrCourses.length > 0 && (
              <div className="mt-2">
                <span className="text-[9px] font-mono text-zinc-600 uppercase">+ one of:</span>
                {prereqOrCourses.map((group, gi) => (
                  <div key={gi} className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {group.map((pc, pi) => {
                      if (!pc) return null;
                      const pStatus = getStatusFn(pc.id, completed);
                      return (
                        <span key={pc.id} className="flex items-center gap-1 text-xs">
                          {pi > 0 && <span className="text-[9px] text-zinc-700 font-mono">or</span>}
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            pStatus === "completed" ? "bg-emerald-500" : pStatus === "available" ? "bg-blue-500" : "bg-zinc-700"
                          }`} />
                          <span className="font-mono text-zinc-400">{pc.id}</span>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required For — courses that need this as a prerequisite */}
      {requiredFor.length > 0 && (
        <div className="p-5 border-b border-beach-border">
          <h3 className="text-[10px] font-mono text-zinc-600 mb-2.5 uppercase tracking-widest">Required For</h3>
          <div className="space-y-1.5">
            {requiredFor.map((uc) => {
              const uStatus = getStatusFn(uc.id, completed);
              return (
                <div key={uc.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    uStatus === "completed" ? "bg-emerald-500" : uStatus === "available" ? "bg-amber-500" : "bg-zinc-700"
                  }`} />
                  <span className="font-mono text-zinc-400">{uc.id}</span>
                  <span className="text-zinc-600 truncate">{uc.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Path info */}
      <div className="p-5">
        <h3 className="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-widest">Dependency Chain</h3>
        <div className="flex gap-6 text-xs">
          <div>
            <span className="text-zinc-600">Upstream </span>
            <span className="font-mono text-amber-400">{path.size - 1}</span>
          </div>
          <div>
            <span className="text-zinc-600">Downstream </span>
            <span className="font-mono text-blue-400">{downstream.size - 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
