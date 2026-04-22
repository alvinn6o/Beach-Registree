"use client";

import { useCallback } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useCourseStore } from "@/stores/courseStore";
import { generatePlan } from "graph-core";
import { MIN_UNITS, MAX_UNITS } from "@/lib/constants";
import type { StudentYear } from "@/stores/progressStore";
import {
  TRACK_SELECTION_MESSAGE,
  assessTrackAwarePlanHealth,
  getTrackAwareMajorRequirements,
  resolveTrackAwareRequirementCourses,
} from "@/lib/trackRequirements";

/** Returns the NEXT upcoming semester (not the current one in progress). */
function getNextSemester(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month <= 7) return `Fall ${year}`;
  return `Spring ${year + 1}`;
}

function getGraduationTerms(currentSemester: string): string[] {
  const [season, yearStr] = currentSemester.split(" ");
  let year = parseInt(yearStr, 10);
  let isFall = season === "Fall" || season === "Summer";

  const terms: string[] = [];
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
  const allCourses = useCourseStore((s) => s.allCourses);
  const major = useCourseStore((s) => s.major);
  const viewMode = useCourseStore((s) => s.viewMode);
  const completed = useProgressStore((s) => s.completed);
  const targetGraduation = useProgressStore((s) => s.targetGraduation);
  const preferredUnits = useProgressStore((s) => s.preferredUnits);
  const minUnitsPerSemester = useProgressStore((s) => s.minUnitsPerSemester);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const selectedTrack = useProgressStore((s) => s.selectedTrack);
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
  const trackMajor = getTrackAwareMajorRequirements(major, selectedTrack);
  const report = plan
    ? assessTrackAwarePlanHealth({
        courses: allCourses,
        plan,
        completedCourseIds: [...completed],
        majorRequirements: major,
        selectedElectives,
        selectedTrack,
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

  const effectiveTarget = (() => {
    if (!studentYear) return targetGraduation;
    const idx = YEAR_SEMESTER_COUNT[studentYear] - 1;
    const target = ALL_TERMS[idx];
    if (target && target.startsWith("Fall") && idx + 1 < ALL_TERMS.length) {
      return ALL_TERMS[idx + 1];
    }
    return target;
  })();

  const handleGenerate = useCallback(() => {
    if (!selectedTrack) return;
    const coursesToUse = allCourses;
    const resolved = resolveTrackAwareRequirementCourses(
      major,
      selectedTrack,
      selectedElectives,
      new Set(coursesToUse.map((course) => course.id))
    );
    const transferFirstYear = [
      "MATH 123",
      ...(transferScienceChoice
        ? [transferScienceChoice]
        : (resolved.byRequirement["Physical Science"] ?? []).slice(0, 1)),
    ];
    const firstYearCourses = isTransferStudent
      ? transferFirstYear
      : ["CECS 174", "MATH 122", "ENGR 101"];
    const result = generatePlan(coursesToUse, {
      completedCourses: [...completed],
      majorRequirements: trackMajor,
      selectedElectives,
      currentSemester: CURRENT_SEMESTER,
      targetGraduation: effectiveTarget,
      unitsPerSemester: preferredUnits,
      minUnitsPerSemester,
      viewMode,
      firstYearCourses,
    });
    setPlan(result);
    window.dispatchEvent(new Event("beach-plan-generated"));
  }, [
    allCourses,
    completed,
    effectiveTarget,
    isTransferStudent,
    major,
    minUnitsPerSemester,
    preferredUnits,
    selectedElectives,
    selectedTrack,
    setPlan,
    trackMajor,
    transferScienceChoice,
    viewMode,
  ]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] plan-setup-highlight">
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-400">
        Plan Setup
      </span>

      {/* Student Stage */}
      <label className="flex items-center gap-1.5 rounded-lg border border-beach-border/70 bg-beach-dark/50 px-2 py-1.5">
        <span className="text-[10px] font-mono text-zinc-500">Stage:</span>
        <select
          value={studentYear ?? ""}
          onChange={(e) => setStudentYear((e.target.value as StudentYear) || null)}
          className="bg-transparent text-[11px] text-zinc-200 focus:outline-none cursor-pointer"
        >
          <option value="">Auto</option>
          {YEAR_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {/* Graduation Target */}
      <label className="flex items-center gap-1.5 rounded-lg border border-beach-border/70 bg-beach-dark/50 px-2 py-1.5">
        <span className="text-[10px] font-mono text-zinc-500">Grad:</span>
        {!studentYear ? (
          <select
            value={targetGraduation}
            onChange={(e) => setTargetGraduation(e.target.value)}
            className="bg-transparent text-[11px] text-zinc-200 focus:outline-none cursor-pointer"
          >
            {ALL_TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[11px] text-blue-300">{effectiveTarget}</span>
        )}
      </label>

      {/* Units */}
      <label
        className="flex items-center gap-1.5 rounded-lg border border-beach-border/70 bg-beach-dark/50 px-2 py-1.5"
        title="Max credits per semester"
      >
        <span className="text-[10px] font-mono text-zinc-500">Max credits:</span>
        <input
          type="range"
          min={MIN_UNITS}
          max={MAX_UNITS}
          value={preferredUnits}
          onChange={(e) => setPreferredUnits(Number(e.target.value))}
          className="w-16 accent-blue-500"
        />
        <span className="text-[11px] font-mono text-zinc-300 w-7 text-right">
          {preferredUnits}u
        </span>
      </label>

      <label
        className="flex items-center gap-1.5 rounded-lg border border-beach-border/70 bg-beach-dark/50 px-2 py-1.5"
        title="Min credits per semester"
      >
        <span className="text-[10px] font-mono text-zinc-500">Min credits:</span>
        <input
          type="range"
          min={6}
          max={15}
          value={minUnitsPerSemester}
          onChange={(e) => setMinUnitsPerSemester(Number(e.target.value))}
          className="w-14 accent-amber-500"
        />
        <span className="text-[11px] font-mono text-zinc-300 w-7 text-right">
          {minUnitsPerSemester}u
        </span>
      </label>

      {statusLabel && (
        <span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusTone}`}>
          {statusLabel}
        </span>
      )}

      {!selectedTrack && (
        <span className="text-[10px] text-amber-300">
          {TRACK_SELECTION_MESSAGE}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {plan && (
          <button
            onClick={clearPlan}
            className="rounded-lg border border-beach-border px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={!selectedTrack}
          className="rounded-lg bg-zinc-100 px-4 py-1.5 text-[11px] font-semibold text-zinc-950 shadow-[0_4px_12px_rgba(255,255,255,0.08)] transition-all hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {plan ? "Regenerate" : "Generate Plan"}
        </button>
      </div>
    </div>
  );
}
