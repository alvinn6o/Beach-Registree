"use client";

import { create } from "zustand";

// GE placeholder courses aligned to the 2026-2027 CSULB CS worksheet.
// Lower-division science/math GE is double-counted by major requirements, so
// only standalone GE slots remain here.
export const LOWER_GE_COURSES = [
  "GE-A1", "GE-A2",
  "GE-C1", "GE-C2",
  "GE-D1", "GE-D2",
  "GE-F",
];

// Upper-division GE courses
export const UPPER_GE_COURSES = [
  "GE-UD-D",
];

// Lower-division core courses (CECS + MATH + support)
export const LOWER_CORE_COURSES = [
  "CECS 105", "CECS 174", "CECS 225", "CECS 228", "CECS 229",
  "CECS 274", "CECS 277",
  "ENGR 101", "ENGR 102",
  "MATH 122", "MATH 123",
];

export const TRANSFER_REQUIRED_AFTER_ENTRY = [
  "MATH 123",
  "PHYS 151",
  "CHEM 111A",
];

// Backwards compat alias
const TRANSFER_GE_COURSES = LOWER_GE_COURSES;

// Lower-division CECS/MATH courses assumed completed by transfer students
// NOTE: MATH 123 and science courses (PHYS 151, CHEM 111A) are NOT auto-completed
// because transfer students must complete "MATH 123 + PHYS 151 or CHEM 111A"
// within their first calendar year at CSULB.
const TRANSFER_LOWER_DIV_COURSES = [
  // Lower Division Core — completed before transfer
  // NOTE: CECS 229 is NOT auto-completed because transfer students
  // typically still need to take it at CSULB.
  "CECS 105", "CECS 174", "CECS 225", "CECS 228",
  "CECS 274", "CECS 277",
  "ENGR 101", "ENGR 102",
  "MATH 122",
  // CECS 229, MATH 123, PHYS 151/CHEM 111A, BIOL Elective — must still be completed
];

export const TRANSFER_AUTO_COMPLETED_COURSES = [
  ...TRANSFER_GE_COURSES,
  ...TRANSFER_LOWER_DIV_COURSES,
];

const ALL_TRANSFER_COURSES = [...TRANSFER_AUTO_COMPLETED_COURSES];
const TRANSFER_SCIENCE_OPTIONS = ["PHYS 151", "CHEM 111A"] as const;
export type TransferScienceChoice = (typeof TRANSFER_SCIENCE_OPTIONS)[number] | null;

export type StudentYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

interface ProgressStore {
  completed: Set<string>;
  targetGraduation: string;
  preferredUnits: number;
  selectedElectives: string[];
  selectedTrack: string | null;
  isTransferStudent: boolean;
  transferScienceChoice: TransferScienceChoice;
  transferScienceCompleted: boolean;
  transferMath123Completed: boolean;
  transferAutoCompletedIds: string[];
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
  clearSelectedElectives: () => void;
  setSelectedTrack: (trackId: string | null) => void;
  setTransferStudent: (value: boolean) => void;
  setTransferScienceChoice: (choice: TransferScienceChoice) => void;
  setTransferScienceCompleted: (value: boolean) => void;
  setTransferMath123Completed: (value: boolean) => void;
  setMinUnitsPerSemester: (units: number) => void;
  setStudentYear: (year: StudentYear | null) => void;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function computeTransferAutoCompletedIds(options: {
  transferScienceChoice: TransferScienceChoice;
  transferScienceCompleted: boolean;
  transferMath123Completed: boolean;
}): string[] {
  const next = [...ALL_TRANSFER_COURSES];
  if (options.transferMath123Completed) next.push("MATH 123");
  if (options.transferScienceCompleted && options.transferScienceChoice) {
    next.push(options.transferScienceChoice);
  }
  return uniqueIds(next);
}

function syncTransferSelectedElectives(
  selectedElectives: string[],
  transferScienceChoice: TransferScienceChoice
): string[] {
  const withoutScience = selectedElectives.filter(
    (id) => !TRANSFER_SCIENCE_OPTIONS.includes(id as (typeof TRANSFER_SCIENCE_OPTIONS)[number])
  );
  if (!transferScienceChoice) return withoutScience;
  return uniqueIds([...withoutScience, transferScienceChoice]);
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
  selectedElectives: loadFromStorage("bt_selected_electives", []),
  selectedTrack: loadFromStorage<string | null>("bt_selected_track", null),
  isTransferStudent: loadFromStorage("bt_transfer", false),
  transferScienceChoice: loadFromStorage<TransferScienceChoice>("bt_transfer_science_choice", null),
  transferScienceCompleted: loadFromStorage("bt_transfer_science_completed", false),
  transferMath123Completed: loadFromStorage("bt_transfer_math123_completed", false),
  transferAutoCompletedIds: loadFromStorage<string[]>("bt_transfer_auto_completed_ids", []),
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
    set((state) => {
      const next = state.isTransferStudent
        ? syncTransferSelectedElectives(electives, state.transferScienceChoice)
        : electives;
      saveToStorage("bt_selected_electives", next);
      return { selectedElectives: next };
    }),

  toggleElective: (id) =>
    set((state) => {
      const electives = state.selectedElectives.includes(id)
        ? state.selectedElectives.filter((e) => e !== id)
        : [...state.selectedElectives, id];
      saveToStorage("bt_selected_electives", electives);
      return { selectedElectives: electives };
    }),

  clearSelectedElectives: () =>
    set((state) => {
      const next = state.isTransferStudent
        ? syncTransferSelectedElectives([], state.transferScienceChoice)
        : [];
      saveToStorage("bt_selected_electives", next);
      saveToStorage("bt_selected_track", null);
      return { selectedElectives: next, selectedTrack: null };
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
        const autoIds = computeTransferAutoCompletedIds({
          transferScienceChoice: state.transferScienceChoice,
          transferScienceCompleted: state.transferScienceCompleted,
          transferMath123Completed: state.transferMath123Completed,
        });
        for (const id of autoIds) next.add(id);
        saveToStorage("bt_transfer_auto_completed_ids", autoIds);
        saveToStorage(
          "bt_selected_electives",
          syncTransferSelectedElectives(state.selectedElectives, state.transferScienceChoice)
        );
      } else {
        // Only remove courses that were auto-added by transfer assumptions
        for (const id of state.transferAutoCompletedIds) next.delete(id);
        saveToStorage("bt_transfer_auto_completed_ids", []);
      }
      saveToStorage("bt_completed", [...next]);
      // Transfer students default to 4 semesters (Junior)
      const studentYear = value ? "Junior" as StudentYear : state.studentYear;
      if (value) saveToStorage("bt_student_year", studentYear);
      return {
        isTransferStudent: value,
        completed: next,
        studentYear,
        selectedElectives: syncTransferSelectedElectives(
          state.selectedElectives,
          state.transferScienceChoice
        ),
        transferAutoCompletedIds: value
          ? computeTransferAutoCompletedIds({
              transferScienceChoice: state.transferScienceChoice,
              transferScienceCompleted: state.transferScienceCompleted,
              transferMath123Completed: state.transferMath123Completed,
            })
          : [],
      };
    }),

  setTransferScienceChoice: (choice) =>
    set((state) => {
      saveToStorage("bt_transfer_science_choice", choice);
      const selectedElectives = syncTransferSelectedElectives(
        state.selectedElectives,
        choice
      );
      saveToStorage("bt_selected_electives", selectedElectives);

      if (!state.isTransferStudent) {
        return { transferScienceChoice: choice, selectedElectives };
      }

      const previousAuto = new Set(state.transferAutoCompletedIds);
      const nextCompleted = new Set(state.completed);
      for (const id of previousAuto) nextCompleted.delete(id);

      const nextAuto = computeTransferAutoCompletedIds({
        transferScienceChoice: choice,
        transferScienceCompleted: state.transferScienceCompleted,
        transferMath123Completed: state.transferMath123Completed,
      });
      for (const id of nextAuto) nextCompleted.add(id);

      saveToStorage("bt_transfer_auto_completed_ids", nextAuto);
      saveToStorage("bt_completed", [...nextCompleted]);

      return {
        transferScienceChoice: choice,
        selectedElectives,
        completed: nextCompleted,
        transferAutoCompletedIds: nextAuto,
      };
    }),

  setTransferScienceCompleted: (value) =>
    set((state) => {
      saveToStorage("bt_transfer_science_completed", value);
      if (!state.isTransferStudent) {
        return { transferScienceCompleted: value };
      }

      const nextCompleted = new Set(state.completed);
      for (const id of state.transferAutoCompletedIds) nextCompleted.delete(id);

      const nextAuto = computeTransferAutoCompletedIds({
        transferScienceChoice: state.transferScienceChoice,
        transferScienceCompleted: value,
        transferMath123Completed: state.transferMath123Completed,
      });
      for (const id of nextAuto) nextCompleted.add(id);

      saveToStorage("bt_transfer_auto_completed_ids", nextAuto);
      saveToStorage("bt_completed", [...nextCompleted]);

      return {
        transferScienceCompleted: value,
        completed: nextCompleted,
        transferAutoCompletedIds: nextAuto,
      };
    }),

  setTransferMath123Completed: (value) =>
    set((state) => {
      saveToStorage("bt_transfer_math123_completed", value);
      if (!state.isTransferStudent) {
        return { transferMath123Completed: value };
      }

      const nextCompleted = new Set(state.completed);
      for (const id of state.transferAutoCompletedIds) nextCompleted.delete(id);

      const nextAuto = computeTransferAutoCompletedIds({
        transferScienceChoice: state.transferScienceChoice,
        transferScienceCompleted: state.transferScienceCompleted,
        transferMath123Completed: value,
      });
      for (const id of nextAuto) nextCompleted.add(id);

      saveToStorage("bt_transfer_auto_completed_ids", nextAuto);
      saveToStorage("bt_completed", [...nextCompleted]);

      return {
        transferMath123Completed: value,
        completed: nextCompleted,
        transferAutoCompletedIds: nextAuto,
      };
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
