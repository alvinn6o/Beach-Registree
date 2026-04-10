"use client";

import { useCallback, useState } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCourseStore } from "@/stores/courseStore";
import { assessPlanHealth, generatePlan, resolveRequirementCourses } from "graph-core";
import { MIN_UNITS, MAX_UNITS } from "@/lib/constants";
import type { StudentYear } from "@/stores/progressStore";
import TransferToggle from "@/components/shared/TransferToggle";

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
  { value: "Freshman", label: "Freshman" },
  { value: "Sophomore", label: "Sophomore" },
  { value: "Junior", label: "Junior" },
  { value: "Senior", label: "Senior" },
];

export default function PlannerControls() {
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const transferScienceChoice = useProgressStore((s) => s.transferScienceChoice);
  const setTargetGraduation = useProgressStore((s) => s.setTargetGraduation);
  const setPreferredUnits = useProgressStore((s) => s.setPreferredUnits);
  const setMinUnitsPerSemester = useProgressStore((s) => s.setMinUnitsPerSemester);
  const setStudentYear = useProgressStore((s) => s.setStudentYear);
  const plan = usePlannerStore((s) => s.plan);
  const setPlan = usePlannerStore((s) => s.setPlan);
  const clearPlan = usePlannerStore((s) => s.clearPlan);
  const completedCount = completed.size;
  const report = plan
    ? assessPlanHealth({
        courses: allCourses,
        plan,
        completedCourseIds: [...completed],
        majorRequirements: major,
        selectedElectives,
        preferredUnits,
        minUnitsPerSemester,
      })
    : null;
  const statusLabel = report
    ? report.status === "on-track"
      ? "On Track"
      : report.status === "needs-review"
        ? "Needs Review"
        : "Blocked"
    : null;
  const statusTone = report
    ? report.status === "on-track"
      ? "border-emerald-900/50 bg-emerald-950/25 text-emerald-200"
      : report.status === "needs-review"
        ? "border-amber-900/50 bg-amber-950/25 text-amber-200"
        : "border-red-900/50 bg-red-950/25 text-red-200"
    : "";

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
    const resolved = resolveRequirementCourses(
      major,
      selectedElectives,
      new Set(coursesToUse.map((course) => course.id))
    );
    const transferFirstYear = [
      "MATH 123",
      ...(transferScienceChoice
        ? [transferScienceChoice]
        : (resolved.byRequirement["Physical Science"] ?? []).slice(0, 1)),
    ];
    // First-year course requirements (must be completed within first 2 semesters)
    const firstYearCourses = isTransferStudent
      ? transferFirstYear
      : ["CECS 174", "MATH 122", "ENGR 101"];
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
    // Trigger post-plan survey (fires once, survey checks localStorage)
    window.dispatchEvent(new Event("beach-plan-generated"));
  }, [allCourses, major, viewMode, completed, effectiveTarget, preferredUnits, minUnitsPerSemester, selectedElectives, isTransferStudent, transferScienceChoice, setPlan]);

  // NOTE: We intentionally do NOT auto-regenerate the plan when viewMode changes.
  // The plan uses allCourses regardless of viewMode, and regenerating would
  // discard any manual adjustments the user made (drag-and-drop, etc.).

  const terms = ALL_TERMS;

  return (
    <div className="rounded-[28px] border border-beach-border/70 bg-gradient-to-br from-beach-card/90 via-beach-card/72 to-[#11161d] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.2)] plan-setup-highlight">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-400 animate-pulse">
          Plan Setup
        </p>

        {!plan && completedCount === 0 && (
          <p className="text-[11px] text-amber-400/80 max-w-sm leading-relaxed">
            Tip: Go to the <span className="font-semibold text-amber-300">Course Map</span> first to mark courses you&apos;ve already completed, then come back to generate your plan.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <TransferToggle />
          <span className="rounded-full border border-beach-border bg-beach-dark/70 px-3 py-1.5 text-zinc-400">
            {completedCount} complete
          </span>
          <span className="rounded-full border border-beach-border bg-beach-dark/70 px-3 py-1.5 text-zinc-400">
            {selectedElectives.length} custom picks
          </span>
          {plan && (
            <span className="rounded-full border border-blue-900/40 bg-blue-950/20 px-3 py-1.5 text-blue-300">
              Draft generated
            </span>
          )}
          {statusLabel && (
            <span className={`rounded-full border px-3 py-1.5 ${statusTone}`}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-beach-border/70 bg-beach-dark/35 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">Student stage</p>
          <div className="mt-2">
            <select
              value={studentYear ?? ""}
              onChange={(e) => setStudentYear((e.target.value as StudentYear) || null)}
              className="w-full rounded-xl border border-beach-border bg-beach-card px-3 py-2 text-center text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Estimate automatically</option>
              {YEAR_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-zinc-500">
              {studentYear
                ? `Target: ${effectiveTarget}`
                : "Optional timeline estimate"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-beach-border/70 bg-beach-dark/35 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">Graduation target</p>
          <div className="mt-2">
            {!studentYear ? (
              <select
                value={targetGraduation}
                onChange={(e) => setTargetGraduation(e.target.value)}
                className="w-full rounded-xl border border-beach-border bg-beach-card px-3 py-2 text-center text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              >
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 px-3 py-2 text-sm text-blue-200">
                {effectiveTarget}
              </div>
            )}
            <p className="mt-2 text-[11px] text-zinc-500">Shorter targets increase load.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-beach-border/70 bg-beach-dark/35 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">Unit strategy</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500">Target max: {preferredUnits}u</label>
              <input
                type="range"
                min={MIN_UNITS}
                max={MAX_UNITS}
                value={preferredUnits}
                onChange={(e) => setPreferredUnits(Number(e.target.value))}
                className="mt-2 w-full accent-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500">Full-time floor: {minUnitsPerSemester}u</label>
              <input
                type="range"
                min={6}
                max={15}
                value={minUnitsPerSemester}
                onChange={(e) => setMinUnitsPerSemester(Number(e.target.value))}
                className="mt-2 w-full accent-amber-500"
              />
            </div>
          </div>
          {preferredUnits > 18 && (
            <p className="mt-2 text-[11px] text-orange-300">
              19u+ may need approval.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={clearPlan}
          className="rounded-xl border border-beach-border px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          Clear
        </button>
        <button
          onClick={handleGenerate}
          className="rounded-2xl bg-zinc-100 px-10 py-3 text-sm font-semibold text-zinc-950 shadow-[0_10px_30px_rgba(255,255,255,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
        >
          Generate Plan
        </button>
        <button
          onClick={() => setShowAdvanced((value) => !value)}
          className="rounded-xl border border-beach-border px-3 py-2 text-xs font-mono text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          {showAdvanced ? "Less" : "More"}
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-beach-border/70 bg-beach-dark/40 p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">Assumptions</p>
            <div className="mt-2 space-y-2 text-xs text-zinc-400">
              <p>Term offering is advisory, not a blocker.</p>
              <p>Drafts favor prerequisite progress, major momentum, and balanced loads.</p>
              <p>Final enrollment still needs MyCSULB review.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-beach-border/70 bg-beach-dark/40 p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">Regenerate when</p>
            <div className="mt-2 space-y-2 text-xs text-zinc-400">
              <p>Completed courses, transfer status, load, or target changes.</p>
              <p>Dragging manually creates custom edits that regeneration will replace.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
