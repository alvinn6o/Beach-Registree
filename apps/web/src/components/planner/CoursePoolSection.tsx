"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getPlacementHint, summarizePlacementErrors } from "@/lib/planner";
import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { categoryColors } from "@/lib/colors";
import { resolveRequirementCourses } from "graph-core";
import type { Course, MajorRequirements } from "graph-core";

/** Compute course IDs that belong to a satisfied "choose N" group but weren't chosen */
function getSatisfiedAlternatives(
  major: MajorRequirements,
  planned: Set<string>,
  completed: Set<string>,
  allCourseIds: Set<string>
): Set<string> {
  const faded = new Set<string>();
  const resolved = resolveRequirementCourses(
    major,
    [...completed, ...planned],
    allCourseIds
  );
  for (const req of major.requirements) {
    if (req.type !== "choose" || !req.count) continue;
    const chosen = resolved.byRequirement[req.name] ?? [];
    if (chosen.length >= req.count) {
      // Requirement satisfied — fade unchosen alternatives
      for (const id of req.courses) {
        if (!chosen.includes(id) && !planned.has(id) && !completed.has(id)) {
          faded.add(id);
        }
      }
    }
  }
  return faded;
}

const CATEGORY_LABELS: Record<string, string> = {
  math: "Mathematics",
  core: "CS Core",
  upper: "Upper Division",
  elective: "Electives",
  capstone: "Capstone",
  ge: "General Education",
  "ge-upper": "Upper GE",
  support: "Support Courses",
};

const CATEGORY_ORDER = [
  "math",
  "core",
  "upper",
  "elective",
  "capstone",
  "ge",
  "ge-upper",
  "support",
];

function PoolCard({
  course,
  isSatisfied,
  hint,
}: {
  course: Course;
  isSatisfied?: boolean;
  hint?: { earliestValidTerm: string | null; blockingReason: string };
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${course.id}::pool`,
      data: { courseId: course.id, fromZone: "pool" },
    });

  const cat = categoryColors[course.category] ?? categoryColors.core;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : isSatisfied ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-3 py-2 rounded-xl border transition-all duration-150 ${
        isSatisfied
          ? "border-beach-border/30 bg-beach-dark/40 cursor-default"
          : "border-beach-border/60 bg-beach-dark/80 hover:border-zinc-700 hover:bg-beach-dark cursor-grab active:cursor-grabbing"
      }`}
      title={
        isSatisfied
          ? `${course.id} — requirement already satisfied by another choice`
          : hint?.earliestValidTerm
            ? `${course.id} — earliest valid term: ${hint.earliestValidTerm}`
            : hint?.blockingReason
              ? `${course.id} — ${hint.blockingReason}`
              : `${course.id} — ${course.name} (${course.units}u)`
      }
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="font-mono text-[11px] font-semibold"
          style={{ color: isSatisfied ? `${cat.color}60` : cat.color }}
        >
          {course.id}
        </span>
        <div className="flex items-center gap-1">
          {isSatisfied && (
            <span className="text-[8px] font-mono text-green-500/60 bg-green-900/20 px-1 py-0.5 rounded border border-green-800/20">
              satisfied
            </span>
          )}
          {!isSatisfied && hint?.earliestValidTerm && (
            <span className="text-[8px] font-mono text-blue-400/70 bg-blue-950/20 px-1 py-0.5 rounded border border-blue-900/30">
              {hint.earliestValidTerm}
            </span>
          )}
          <span className="text-[9px] font-mono text-zinc-600 bg-beach-card px-1.5 py-0.5 rounded">
            {course.units}u
          </span>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 truncate leading-snug max-w-[120px]">
        {course.name}
      </p>
      {!isSatisfied && !hint?.earliestValidTerm && hint?.blockingReason && (
        <p className="text-[9px] text-red-300/75 mt-1 leading-tight line-clamp-2">
          {hint.blockingReason}
        </p>
      )}
    </div>
  );
}

export default function CoursePoolSection() {
  const [collapsed, setCollapsed] = useState(false);

  const major = useCourseStore((s) => s.major);
  const getCourse = useCourseStore((s) => s.getCourse);
  const allCourses = useCourseStore((s) => s.allCourses);
  const completed = useProgressStore((s) => s.completed);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const plan = usePlannerStore((s) => s.plan);

  const scheduledIds = new Set(plan?.semesters.flatMap((s) => s.courses) ?? []);
  const allCourseIds = new Set(allCourses.map((course) => course.id));

  // Determine which alternatives are already satisfied by planned/completed courses
  const satisfiedAlts = getSatisfiedAlternatives(major, scheduledIds, completed, allCourseIds);

  const resolvedRequirements = resolveRequirementCourses(
    major,
    [...selectedElectives, ...completed, ...scheduledIds],
    allCourseIds
  );
  const requiredIds = resolvedRequirements.allRequired;

  // Deduplicate and filter to unscheduled, uncompleted
  const poolCourses = [...new Set(requiredIds)]
    .filter((id) => !completed.has(id) && !scheduledIds.has(id))
    .map((id) => getCourse(id))
    .filter((c): c is Course => c !== undefined);
  const completedList = [...completed];
  const placementHints = new Map(
    poolCourses.map((course) => {
      const hint = getPlacementHint(
        course.id,
        plan?.semesters ?? [],
        allCourses,
        completedList
      );
      return [
        course.id,
        {
          earliestValidTerm: hint.earliestValidTerm,
          blockingReason: summarizePlacementErrors(hint.blockingErrors),
        },
      ];
    })
  );

  if (poolCourses.length === 0) return null;

  // Group by category, preserving defined order
  const grouped = new Map<string, Course[]>();
  for (const course of poolCourses) {
    const cat = course.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(course);
  }

  // Sort groups by canonical order, then alphabetically within each group
  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const totalUnits = poolCourses.reduce((sum, c) => sum + c.units, 0);

  return (
    <div className="p-4 border-t border-beach-border">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 mb-3 group w-full text-left"
      >
        <span
          className={`text-zinc-600 font-mono text-[10px] transition-transform ${collapsed ? "" : "rotate-90"}`}
        >
          ▶
        </span>
        <span className="w-2 h-2 rounded-full bg-zinc-600/50" />
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Remaining Courses
        </h3>
        <span className="text-[10px] font-mono text-zinc-700 bg-beach-card px-1.5 py-0.5 rounded">
          {poolCourses.length} courses
        </span>
        <span className="text-[10px] font-mono text-zinc-700 bg-beach-card px-1.5 py-0.5 rounded">
          {totalUnits}u
        </span>
        <span className="text-[10px] font-mono text-zinc-700 ml-1">
          — drag into semester columns
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-4">
          {sortedGroups.map(([cat, courses]) => (
            <div key={cat}>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
                <span className="text-zinc-700 ml-1.5 normal-case tracking-normal">
                  ({courses.length})
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <PoolCard
                    key={course.id}
                    course={course}
                    isSatisfied={satisfiedAlts.has(course.id)}
                    hint={placementHints.get(course.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
