"use client";

import { DndContext, DragEndEvent, pointerWithin, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import { validatePlan } from "graph-core";
import type { ValidationError } from "graph-core";
import SemesterColumn from "./SemesterColumn";
import PlannerControls from "./PlannerControls";
import AdvisorSummaryPanel from "./AdvisorSummaryPanel";
import PlannerDetailsDeck from "./PlannerDetailsDeck";
import CompletedSection from "./CompletedSection";
import CoursePoolSection from "./CoursePoolSection";

interface SemesterPlannerProps {
  onSelectCourse?: (id: string | null) => void;
  selectedCourse?: string | null;
}

export default function SemesterPlanner({ onSelectCourse, selectedCourse }: SemesterPlannerProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const plan = usePlannerStore((s) => s.plan);
  const moveCourse = usePlannerStore((s) => s.moveCourse);
  const removeCourse = usePlannerStore((s) => s.removeCourse);
  const addCourse = usePlannerStore((s) => s.addCourse);
  const addSemester = usePlannerStore((s) => s.addSemester);
  const removeLastSemester = usePlannerStore((s) => s.removeLastSemester);
  const lastActionError = usePlannerStore((s) => s.lastActionError);
  const clearLastActionError = usePlannerStore((s) => s.clearLastActionError);
  const allCourses = useCourseStore((s) => s.allCourses);
  const getCourse = useCourseStore((s) => s.getCourse);
  const completed = useProgressStore((s) => s.completed);
  const minUnitsPerSemester = useProgressStore((s) => s.minUnitsPerSemester);
  const toggleCompleted = useProgressStore((s) => s.toggleCompleted);

  const errors: ValidationError[] = plan
    ? validatePlan(allCourses, plan.semesters, [...completed], minUnitsPerSemester)
    : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const courseId = active.data.current.courseId as string;
    // Source zone: semester cards use fromSemester; pool/completed cards use fromZone
    const fromSemester = active.data.current.fromSemester as string | undefined;
    const fromZone = active.data.current.fromZone as string | undefined;

    // Destination: semester columns expose `term`; completed zone exposes `zone`
    const overTerm = over.data.current?.term as string | undefined;
    const overZone = over.data.current?.zone as string | undefined;

    const course = getCourse(courseId);
    if (!course) return;

    if (fromSemester) {
      // === Dragging FROM a semester column ===
      if (overZone === "completed") {
        // Semester → Completed: remove from plan, mark complete
        removeCourse(courseId, fromSemester);
        if (!completed.has(courseId)) toggleCompleted(courseId);
      } else if (overTerm && overTerm !== fromSemester) {
        // Semester → Semester: move between columns
        moveCourse(courseId, fromSemester, overTerm);
      }
    } else if (fromZone === "pool") {
      // === Dragging FROM the course pool ===
      if (overZone === "completed") {
        // Pool → Completed: mark complete directly
        if (!completed.has(courseId)) toggleCompleted(courseId);
      } else if (overTerm) {
        // Pool → Semester: add to that semester
        addCourse(courseId, overTerm, course.units);
      }
    } else if (fromZone === "completed") {
      // === Dragging FROM the completed section ===
      if (overTerm) {
        // Completed → Semester: add to semester, unmark complete
        addCourse(courseId, overTerm, course.units);
        if (completed.has(courseId)) toggleCompleted(courseId);
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-beach-border px-4 py-4">
        <PlannerControls />
        {lastActionError && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs text-red-300">
            {lastActionError}
            <button
              onClick={clearLastActionError}
              className="ml-3 text-red-400/70 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
        autoScroll={{ acceleration: 15, threshold: { x: 0.2, y: 0.15 } }}
      >
        <div>
          {plan ? (
            <div className="border-b border-beach-border/50 px-4 py-5">
              <div className="overflow-x-auto overflow-y-visible pb-2">
                <div className="flex min-w-max items-start gap-5">
                  {plan.semesters.map((sem) => (
                    <SemesterColumn
                      key={sem.term}
                      semester={sem}
                      errors={errors.filter((e) => e.semester === sem.term)}
                      onSelectCourse={onSelectCourse}
                      selectedCourse={selectedCourse}
                    />
                  ))}

                  <div className="flex min-w-[140px] flex-col items-center justify-center gap-2 self-stretch rounded-[28px] border border-dashed border-beach-border/80 bg-beach-card/25 px-4 py-6">
                    <button
                      onClick={addSemester}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-blue-500/30 bg-blue-600/15 px-4 py-2.5 text-sm font-mono text-blue-300 transition-colors hover:border-blue-400/50 hover:bg-blue-600/25"
                      title="Add another semester to extend your plan"
                    >
                      <span className="text-lg leading-none">+</span> Add
                    </button>
                    {plan.semesters.length > 1 && (
                      <button
                        onClick={removeLastSemester}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-beach-border px-3 py-2 text-xs font-mono text-zinc-500 transition-colors hover:border-red-500/30 hover:bg-red-900/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={plan.semesters[plan.semesters.length - 1]?.courses.length > 0}
                        title={
                          plan.semesters[plan.semesters.length - 1]?.courses.length > 0
                            ? "Move or remove all courses from the last semester first"
                            : "Remove the last empty semester"
                        }
                      >
                        <span className="text-sm leading-none">−</span> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-beach-border/50 px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">No plan yet.</p>
            </div>
          )}

          <CompletedSection />
          <CoursePoolSection />
          {plan && <AdvisorSummaryPanel />}
          <PlannerDetailsDeck />
        </div>
      </DndContext>
    </div>
  );
}
