"use client";

import { create } from "zustand";

// GE placeholder courses (lower-division general education)
export const LOWER_GE_COURSES = [
  "GE-A1", "GE-A2", "GE-A3",
  "GE-B1", "GE-B2", "GE-B3", "GE-B4", "GE-B5",
  "GE-C1", "GE-C2", "GE-C3",
  "GE-D1", "GE-D2", "GE-D3", "GE-D4",
  "GE-E", "GE-F",
];

// Upper-division GE courses
export const UPPER_GE_COURSES = [
  "GE-UD-B", "GE-UD-C", "GE-UD-D",
];

// Lower-division core courses (CECS + MATH + support)
export const LOWER_CORE_COURSES = [
  "CECS 105", "CECS 174", "CECS 225", "CECS 228", "CECS 229",
  "CECS 274", "CECS 277",
  "ENGR 101", "ENGR 102",
  "MATH 122", "MATH 123",
];

// Backwards compat alias
const TRANSFER_GE_COURSES = LOWER_GE_COURSES;

// Lower-division CECS/MATH courses assumed completed by transfer students
// NOTE: MATH 123 and science courses (PHYS 151, CHEM 111A) are NOT auto-completed
// because transfer students must complete "MATH 123 + PHYS 151 or CHEM 111A"
// within their first calendar year at CSULB.
const TRANSFER_LOWER_DIV_COURSES = [
  // Lower Division Core — completed before transfer
  "CECS 105", "CECS 174", "CECS 225", "CECS 228", "CECS 229",
  "CECS 274", "CECS 277",
  "ENGR 101", "ENGR 102",
  "MATH 122",
  // MATH 123, PHYS 151, PHYS 152, CHEM 111A — must still be completed
];

const ALL_TRANSFER_COURSES = [...TRANSFER_GE_COURSES, ...TRANSFER_LOWER_DIV_COURSES];

export type StudentYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

interface ProgressStore {
  completed: Set<string>;
  targetGraduation: string;
  preferredUnits: number;
  selectedElectives: string[];
  selectedTrack: string | null;
  isTransferStudent: boolean;
  minUnitsPerSemester: number;
  studentYear: StudentYear | null;
  toggleCompleted: (id: string) => void;
  bulkToggle: (ids: string[]) => void;
  setCompleted: (ids: string[]) => void;
  clearCompleted: () => void;
  setTargetGraduation: (term: string) => void;
  setPreferredUnits: (units: number) => void;
  setSelectedElectives: (electives: string[]) => void;
  toggleElective: (id: string) => void;
  setSelectedTrack: (trackId: string | null) => void;
  setTransferStudent: (value: boolean) => void;
  setMinUnitsPerSemester: (units: number) => void;
  setStudentYear: (year: StudentYear | null) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const useProgressStore = create<ProgressStore>()((set, get) => ({
  completed: new Set<string>(loadFromStorage<string[]>("bt_completed", [])),
  targetGraduation: loadFromStorage("bt_target_grad", "Spring 2027"),
  preferredUnits: loadFromStorage("bt_preferred_units", 15),
  selectedElectives: loadFromStorage("bt_selected_electives", [
    "CECS 456",
    "CECS 451",
    "CECS 458",
    "CECS 457",
    "CECS 323",
    "CECS 475",
  ]),
  selectedTrack: loadFromStorage<string | null>("bt_selected_track", null),
  isTransferStudent: loadFromStorage("bt_transfer", false),
  minUnitsPerSemester: loadFromStorage("bt_min_units", 12),
  studentYear: loadFromStorage<StudentYear | null>("bt_student_year", null),

  toggleCompleted: (id) =>
    set((state) => {
      const next = new Set(state.completed);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveToStorage("bt_completed", [...next]);
      return { completed: next };
    }),

  bulkToggle: (ids) =>
    set((state) => {
      const next = new Set(state.completed);
      // If all are already completed, remove them; otherwise add all
      const allDone = ids.every((id) => next.has(id));
      if (allDone) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      saveToStorage("bt_completed", [...next]);
      return { completed: next };
    }),

  setCompleted: (ids) =>
    set(() => {
      saveToStorage("bt_completed", ids);
      return { completed: new Set(ids) };
    }),

  clearCompleted: () =>
    set(() => {
      saveToStorage("bt_completed", []);
      return { completed: new Set<string>() };
    }),

  setTargetGraduation: (term) =>
    set(() => {
      saveToStorage("bt_target_grad", term);
      return { targetGraduation: term };
    }),

  setPreferredUnits: (units) =>
    set(() => {
      saveToStorage("bt_preferred_units", units);
      return { preferredUnits: units };
    }),

  setSelectedElectives: (electives) =>
    set(() => {
      saveToStorage("bt_selected_electives", electives);
      return { selectedElectives: electives };
    }),

  toggleElective: (id) =>
    set((state) => {
      const electives = state.selectedElectives.includes(id)
        ? state.selectedElectives.filter((e) => e !== id)
        : [...state.selectedElectives, id];
      saveToStorage("bt_selected_electives", electives);
      return { selectedElectives: electives };
    }),

  setSelectedTrack: (trackId) =>
    set(() => {
      saveToStorage("bt_selected_track", trackId);
      return { selectedTrack: trackId };
    }),

  setTransferStudent: (value) =>
    set((state) => {
      saveToStorage("bt_transfer", value);
      const next = new Set(state.completed);
      if (value) {
        // Auto-complete all lower-division courses (GE + CECS/MATH/support)
        for (const id of ALL_TRANSFER_COURSES) next.add(id);
      } else {
        // Only remove courses that were auto-added by the transfer toggle
        for (const id of ALL_TRANSFER_COURSES) next.delete(id);
      }
      saveToStorage("bt_completed", [...next]);
      // Transfer students default to 4 semesters (Junior)
      const studentYear = value ? "Junior" as StudentYear : state.studentYear;
      if (value) saveToStorage("bt_student_year", studentYear);
      return { isTransferStudent: value, completed: next, studentYear };
    }),

  setMinUnitsPerSemester: (units) =>
    set(() => {
      saveToStorage("bt_min_units", units);
      return { minUnitsPerSemester: units };
    }),

  setStudentYear: (year) =>
    set(() => {
      saveToStorage("bt_student_year", year);
      return { studentYear: year };
    }),
}));
