"use client";

import { create } from "zustand";
import type { SemesterPlan, PlanResult } from "graph-core";
import { validateCoursePlacement } from "graph-core";
import { useCourseStore } from "./courseStore";
import { useProgressStore } from "./progressStore";

function nextTerm(term: string): string {
  const parts = term.split(" ");
  const season = parts[0];
  const year = parseInt(parts[1], 10);
  if (season === "Fall") return `Spring ${year + 1}`;
  return `Fall ${year}`;
}

interface PlannerStore {
  plan: PlanResult | null;
  lastActionError: string | null;
  setPlan: (plan: PlanResult) => void;
  clearPlan: () => void;
  clearLastActionError: () => void;
  moveCourse: (
    courseId: string,
    fromTerm: string,
    toTerm: string
  ) => void;
  swapCourses: (
    courseA: string,
    fromTermA: string,
    courseB: string,
    fromTermB: string
  ) => void;
  removeCourse: (courseId: string, fromTerm: string) => void;
  addCourse: (courseId: string, toTerm: string, units: number) => void;
  addSemester: () => void;
  removeLastSemester: () => void;
}

function loadPlan(): PlanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("bt_plan");
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function savePlan(plan: PlanResult | null) {
  if (typeof window === "undefined") return;
  try {
    if (plan) {
      localStorage.setItem("bt_plan", JSON.stringify(plan));
    } else {
      localStorage.removeItem("bt_plan");
    }
  } catch {}
}

function recalcSemester(
  sem: SemesterPlan,
  getCourse: (id: string) => { units: number } | undefined,
  minUnits = 12
): SemesterPlan {
  const totalUnits = sem.courses.reduce((sum, id) => {
    const c = getCourse(id);
    return sum + (c?.units ?? 0);
  }, 0);

  const warnings: string[] = [];
  if (sem.courses.length > 0 && totalUnits < minUnits) {
    warnings.push(`Only ${totalUnits} units — below full-time minimum (${minUnits})`);
  }
  if (totalUnits > 18 && totalUnits <= 21) {
    warnings.push(`${totalUnits} units — above 18 requires departmental approval`);
  }
  if (totalUnits > 21) {
    warnings.push(`${totalUnits} units — exceeds maximum allowed (21)`);
  }

  return { ...sem, total_units: totalUnits, warnings };
}

/** Recalculate ALL semesters (used after moves to catch downstream prereq shifts) */
function recalcAllSemesters(
  semesters: SemesterPlan[],
  getCourse: (id: string) => { units: number } | undefined,
  minUnits: number
): SemesterPlan[] {
  return semesters.map((sem) => recalcSemester(sem, getCourse, minUnits));
}

/** Check if a course already exists in any semester */
function courseExistsInPlan(plan: PlanResult, courseId: string): boolean {
  return plan.semesters.some((sem) => sem.courses.includes(courseId));
}

export const usePlannerStore = create<PlannerStore>()((set, get) => ({
  plan: loadPlan(),
  lastActionError: null,

  setPlan: (plan) =>
    set(() => {
      savePlan(plan);
      return { plan, lastActionError: null };
    }),

  clearPlan: () =>
    set(() => {
      savePlan(null);
      return { plan: null, lastActionError: null };
    }),

  clearLastActionError: () =>
    set(() => ({ lastActionError: null })),

  moveCourse: (courseId, fromTerm, toTerm) =>
    set((state) => {
      if (!state.plan) return state;
      const getCourse = useCourseStore.getState().getCourse;
      const allCourses = useCourseStore.getState().allCourses;
      const completed = [...useProgressStore.getState().completed];
      const minUnits = useProgressStore.getState().minUnitsPerSemester;
      const semesters = state.plan.semesters.map((sem) => {
        if (sem.term === fromTerm) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c !== courseId),
          };
        }
        if (sem.term === toTerm) {
          // Prevent duplicate
          if (sem.courses.includes(courseId)) return sem;
          return {
            ...sem,
            courses: [...sem.courses, courseId],
          };
        }
        return sem;
      });
      const placementErrors = validateCoursePlacement(
        courseId,
        toTerm,
        allCourses,
        semesters,
        completed
      );
      if (placementErrors.length > 0) {
        return {
          ...state,
          lastActionError: placementErrors.map((e) => e.message).join("; "),
        };
      }
      const recalced = recalcAllSemesters(semesters, getCourse, minUnits);
      const newPlan = { ...state.plan, semesters: recalced };
      savePlan(newPlan);
      return { plan: newPlan, lastActionError: null };
    }),

  swapCourses: (courseA, fromTermA, courseB, fromTermB) =>
    set((state) => {
      if (!state.plan) return state;
      const getCourse = useCourseStore.getState().getCourse;
      const allCourses = useCourseStore.getState().allCourses;
      const completed = [...useProgressStore.getState().completed];
      const minUnits = useProgressStore.getState().minUnitsPerSemester;

      // Build swapped semesters: A goes to B's term, B goes to A's term
      const swappedSemesters = state.plan.semesters.map((sem) => {
        let courses = [...sem.courses];
        if (sem.term === fromTermA) {
          courses = courses.filter((c) => c !== courseA);
          if (!courses.includes(courseB)) courses.push(courseB);
        }
        if (sem.term === fromTermB) {
          courses = courses.filter((c) => c !== courseB);
          if (!courses.includes(courseA)) courses.push(courseA);
        }
        return { ...sem, courses };
      });

      // Validate both placements
      const errorsA = validateCoursePlacement(courseA, fromTermB, allCourses, swappedSemesters, completed);
      const errorsB = validateCoursePlacement(courseB, fromTermA, allCourses, swappedSemesters, completed);

      if (errorsA.length === 0 && errorsB.length === 0) {
        // Full swap is valid
        const recalced = recalcAllSemesters(swappedSemesters, getCourse, minUnits);
        const newPlan = { ...state.plan, semesters: recalced };
        savePlan(newPlan);
        return { plan: newPlan, lastActionError: null };
      }

      // Swap failed — try just placing A in B's semester, removing B
      const displaceSemesters = state.plan.semesters.map((sem) => {
        let courses = [...sem.courses];
        if (sem.term === fromTermA) {
          courses = courses.filter((c) => c !== courseA);
        }
        if (sem.term === fromTermB) {
          courses = courses.filter((c) => c !== courseB);
          if (!courses.includes(courseA)) courses.push(courseA);
        }
        return { ...sem, courses };
      });

      const displaceErrors = validateCoursePlacement(courseA, fromTermB, allCourses, displaceSemesters, completed);
      if (displaceErrors.length === 0) {
        const recalced = recalcAllSemesters(displaceSemesters, getCourse, minUnits);
        const newPlan = { ...state.plan, semesters: recalced };
        savePlan(newPlan);
        const bName = getCourse(courseB)?.name ?? courseB;
        return {
          plan: newPlan,
          lastActionError: `Swap not possible — ${courseB} (${bName}) was removed to the pool instead.`,
        };
      }

      // Neither works
      return {
        ...state,
        lastActionError: `Cannot place ${courseA} in ${fromTermB}: ${displaceErrors.map((e) => e.message).join("; ")}`,
      };
    }),

  removeCourse: (courseId, fromTerm) =>
    set((state) => {
      if (!state.plan) return state;
      const getCourse = useCourseStore.getState().getCourse;
      const minUnits = useProgressStore.getState().minUnitsPerSemester;
      const semesters = state.plan.semesters.map((sem) => {
        if (sem.term === fromTerm) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c !== courseId),
          };
        }
        return sem;
      });
      const recalced = recalcAllSemesters(semesters, getCourse, minUnits);
      const newPlan = { ...state.plan, semesters: recalced };
      savePlan(newPlan);
      return { plan: newPlan, lastActionError: null };
    }),

  addCourse: (courseId, toTerm, units) =>
    set((state) => {
      if (!state.plan) return state;
      // Prevent duplicate across entire plan
      if (courseExistsInPlan(state.plan, courseId)) return state;

      const getCourse = useCourseStore.getState().getCourse;
      const allCourses = useCourseStore.getState().allCourses;
      const completed = [...useProgressStore.getState().completed];
      const minUnits = useProgressStore.getState().minUnitsPerSemester;
      const semesters = state.plan.semesters.map((sem) => {
        if (sem.term === toTerm) {
          return {
            ...sem,
            courses: [...sem.courses, courseId],
          };
        }
        return sem;
      });
      const placementErrors = validateCoursePlacement(
        courseId,
        toTerm,
        allCourses,
        semesters,
        completed
      );
      if (placementErrors.length > 0) {
        return {
          ...state,
          lastActionError: placementErrors.map((e) => e.message).join("; "),
        };
      }
      const recalced = recalcAllSemesters(semesters, getCourse, minUnits);
      const newPlan = { ...state.plan, semesters: recalced };
      savePlan(newPlan);
      return { plan: newPlan, lastActionError: null };
    }),

  addSemester: () =>
    set((state) => {
      if (!state.plan) return state;
      const lastTerm = state.plan.semesters[state.plan.semesters.length - 1]?.term;
      if (!lastTerm) return state;
      const newTerm = nextTerm(lastTerm);
      const newSemester: SemesterPlan = {
        term: newTerm,
        courses: [],
        total_units: 0,
        warnings: [],
      };
      const newPlan = {
        ...state.plan,
        semesters: [...state.plan.semesters, newSemester],
      };
      savePlan(newPlan);
      return { plan: newPlan, lastActionError: null };
    }),

  removeLastSemester: () =>
    set((state) => {
      if (!state.plan || state.plan.semesters.length <= 1) return state;
      const last = state.plan.semesters[state.plan.semesters.length - 1];
      // Only allow removing if the last semester is empty
      if (last.courses.length > 0) return state;
      const newPlan = {
        ...state.plan,
        semesters: state.plan.semesters.slice(0, -1),
      };
      savePlan(newPlan);
      return { plan: newPlan, lastActionError: null };
    }),
}));
