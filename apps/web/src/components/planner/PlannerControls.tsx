"use client";

import { useCallback, useState } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCourseStore } from "@/stores/courseStore";
import { generatePlan } from "graph-core";
import { DEFAULT_UNITS, MIN_UNITS, MAX_UNITS } from "@/lib/constants";
import type { StudentYear } from "@/stores/progressStore";

/** Returns the NEXT upcoming semester (not the current one in progress).
 *  If we're in Spring 2026, planning starts from Fall 2026.
 *  If we're in Summer 2026, planning starts from Fall 2026.
 *  If we're in Fall 2026, planning starts from Spring 2027.
 */
function getNextSemester(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1=Jan … 12=Dec
  const year = now.getFullYear();
  if (month <= 7) return `Fall ${year}`;       // Spring/Summer → plan starts Fall
  return `Spring ${year + 1}`;                  // Fall → plan starts next Spring
}

function getGraduationTerms(currentSemester: string): string[] {
  const [season, yearStr] = currentSemester.split(" ");
  let year = parseInt(yearStr, 10);
  let isFall = season === "Fall" || season === "Summer";

  const terms: string[] = [];
  // Generate enough terms for any year-level (up to 12 for safety)
  terms.push(isFall ? `Fall ${year}` : `Spring ${year}`);
  for (let i = 0; i < 11; i++) {
    if (isFall) {
      year++;
      isFall = false;
    } else {
      isFall = true;
    }
    terms.push(isFall ? `Fall ${year}` : `Spring ${year}`);
  }
  return terms;
}

const CURRENT_SEMESTER = getNextSemester();
const ALL_TERMS = getGraduationTerms(CURRENT_SEMESTER);

const YEAR_SEMESTER_COUNT: Record<StudentYear, number> = {
  Freshman: 8,
  Sophomore: 6,
  Junior: 4,
  Senior: 2,
};

const YEAR_OPTIONS: { value: StudentYear; label: string }[] = [
  { value: "Freshman", label: "Freshman (8 sem)" },
  { value: "Sophomore", label: "Sophomore (6 sem)" },
  { value: "Junior", label: "Junior (4 sem)" },
  { value: "Senior", label: "Senior (2 sem)" },
];

export default function PlannerControls() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const courses = useCourseStore((s) => s.courses);
  const allCourses = useCourseStore((s) => s.allCourses);
  const major = useCourseStore((s) => s.major);
  const viewMode = useCourseStore((s) => s.viewMode);
  const completed = useProgressStore((s) => s.completed);
  const targetGraduation = useProgressStore((s) => s.targetGraduation);
  const preferredUnits = useProgressStore((s) => s.preferredUnits);
  const minUnitsPerSemester = useProgressStore((s) => s.minUnitsPerSemester);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const studentYear = useProgressStore((s) => s.studentYear);
  const isTransferStudent = useProgressStore((s) => s.isTransferStudent);
  const setTargetGraduation = useProgressStore((s) => s.setTargetGraduation);
  const setPreferredUnits = useProgressStore((s) => s.setPreferredUnits);
  const setMinUnitsPerSemester = useProgressStore((s) => s.setMinUnitsPerSemester);
  const setStudentYear = useProgressStore((s) => s.setStudentYear);
  const plan = usePlannerStore((s) => s.plan);
  const setPlan = usePlannerStore((s) => s.setPlan);
  const clearPlan = usePlannerStore((s) => s.clearPlan);

  // Compute effective target graduation based on student year selection
  // Always ensure graduation lands on a Spring semester
  const effectiveTarget = (() => {
    if (!studentYear) return targetGraduation;
    const idx = YEAR_SEMESTER_COUNT[studentYear] - 1;
    const target = ALL_TERMS[idx];
    // If target is Fall, advance to the next Spring (graduation is always Spring)
    if (target && target.startsWith("Fall") && idx + 1 < ALL_TERMS.length) {
      return ALL_TERMS[idx + 1];
    }
    return target;
  })();

  const handleGenerate = useCallback(() => {
    // Always use allCourses so GE + support courses get scheduled regardless of viewMode
    const coursesToUse = allCourses;
    // First-year course requirements (must be completed within first 2 semesters)
    const firstYearCourses = isTransferStudent
      ? ["MATH 123"] // Transfer: MATH 123 + science (handled by elective selection)
      : ["CECS 174", "MATH 122"]; // Freshman: CECS 174 + MATH 122
    const result = generatePlan(coursesToUse, {
      completedCourses: [...completed],
      majorRequirements: major,
      selectedElectives,
      currentSemester: CURRENT_SEMESTER,
      targetGraduation: effectiveTarget,
      unitsPerSemester: preferredUnits,
      minUnitsPerSemester,
      viewMode,
      firstYearCourses,
    });
    setPlan(result);
  }, [courses, allCourses, major, viewMode, completed, effectiveTarget, preferredUnits, minUnitsPerSemester, selectedElectives, isTransferStudent, setPlan]);

  // NOTE: We intentionally do NOT auto-regenerate the plan when viewMode changes.
  // The plan uses allCourses regardless of viewMode, and regenerating would
  // discard any manual adjustments the user made (drag-and-drop, etc.).

  const terms = ALL_TERMS;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Student Year Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-mono text-zinc-500">Year:</label>
        <select
          value={studentYear ?? ""}
          onChange={(e) => setStudentYear((e.target.value as StudentYear) || null)}
          className="bg-beach-card border border-beach-border rounded px-2 py-1 text-sm font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">Any</option>
          {YEAR_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Graduation — hidden when year is set (auto-computed) */}
      {!studentYear && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-zinc-500">Target:</label>
          <select
            value={targetGraduation}
            onChange={(e) => setTargetGraduation(e.target.value)}
            className="bg-beach-card border border-beach-border rounded px-2 py-1 text-sm font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* When year is selected, show computed target */}
      {studentYear && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-zinc-600">→</span>
          <span className="text-xs font-mono text-zinc-400">{effectiveTarget}</span>
        </div>
      )}

      {/* Advanced settings (collapsed by default) */}
      {showAdvanced && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-zinc-500">Min units:</label>
            <input
              type="range"
              min={6}
              max={15}
              value={minUnitsPerSemester}
              onChange={(e) => setMinUnitsPerSemester(Number(e.target.value))}
              className="w-16 accent-amber-500"
            />
            <span className="text-sm font-mono text-amber-400 w-6">
              {minUnitsPerSemester}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-zinc-500">Max units:</label>
            <input
              type="range"
              min={MIN_UNITS}
              max={MAX_UNITS}
              value={preferredUnits}
              onChange={(e) => setPreferredUnits(Number(e.target.value))}
              className="w-16 accent-blue-500"
            />
            <span className="text-sm font-mono text-zinc-300 w-6">
              {preferredUnits}
            </span>
            {preferredUnits > 18 && (
              <span className="text-[9px] text-orange-400 font-mono bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-800/30">
                Requires approval
              </span>
            )}
          </div>
        </>
      )}

      <button
        onClick={handleGenerate}
        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
      >
        Generate Plan
      </button>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="px-3 py-1.5 bg-zinc-800 text-zinc-500 rounded-lg text-xs font-mono hover:text-zinc-300 transition-colors border border-beach-border"
        title="Toggle advanced scheduling options"
      >
        {showAdvanced ? "Less ▲" : "Options ▼"}
      </button>

      <button
        onClick={clearPlan}
        className="px-4 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors border border-beach-border"
      >
        Reset
      </button>
    </div>
  );
}
