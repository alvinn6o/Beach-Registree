"use client";

import { DndContext, DragEndEvent, pointerWithin, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import { validatePlan } from "graph-core";
import type { ValidationError } from "graph-core";
import SemesterColumn from "./SemesterColumn";
import PlannerControls from "./PlannerControls";
import ViabilityChecker from "./ViabilityChecker";
import CompletedSection from "./CompletedSection";
import CoursePoolSection from "./CoursePoolSection";

export default function SemesterPlanner() {
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
      if (overTerm) {
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-beach-border flex-shrink-0">
        <PlannerControls />
      </div>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
        autoScroll={{ acceleration: 15, threshold: { x: 0.2, y: 0.15 } }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Scrollable content area: semesters + completed + pool */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {plan ? (
              <div className="overflow-x-auto p-4 border-b border-beach-border/50">
                <div className="flex gap-4 min-w-max">
                  {plan.semesters.map((sem) => (
                    <SemesterColumn
                      key={sem.term}
                      semester={sem}
                      errors={errors.filter((e) => e.semester === sem.term)}
                    />
                  ))}

                  {/* Add / Remove Semester controls */}
                  <div className="flex flex-col items-center justify-center gap-2 min-w-[120px]">
                    <button
                      onClick={addSemester}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-mono
                        bg-blue-600/20 text-blue-400 border border-blue-500/30
                        hover:bg-blue-600/30 hover:border-blue-500/50 transition-colors"
                      title="Add another semester to extend your plan"
                    >
                      <span className="text-lg leading-none">+</span> Add Semester
                    </button>
                    {plan.semesters.length > 1 && (
                      <button
                        onClick={removeLastSemester}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                          bg-zinc-800/50 text-zinc-500 border border-beach-border
                          hover:bg-red-900/20 hover:text-red-400 hover:border-red-500/30 transition-colors
                          disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={plan.semesters[plan.semesters.length - 1]?.courses.length > 0}
                        title={
                          plan.semesters[plan.semesters.length - 1]?.courses.length > 0
                            ? "Move or remove all courses from the last semester first"
                            : "Remove the last empty semester"
                        }
                      >
                        <span className="text-sm leading-none">−</span> Remove Last
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-b border-beach-border/50">
                <p className="text-zinc-500 mb-2">No plan generated yet.</p>
                <p className="text-zinc-600 text-sm">
                  Mark your completed courses in the Graph view, then generate a plan.
                </p>
              </div>
            )}

            {/* Completed courses section */}
            <CompletedSection />

            {/* Remaining course pool */}
            <CoursePoolSection />
          </div>

          {/* Viability checker pinned at bottom */}
          {plan && <ViabilityChecker />}
        </div>
      </DndContext>
    </div>
  );
}
