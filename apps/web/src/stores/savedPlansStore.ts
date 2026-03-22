"use client";

import { create } from "zustand";
import type { PlanResult } from "graph-core";

export interface SavedPlan {
  id: string;
  name: string;
  savedAt: string; // ISO string
  plan: PlanResult;
  completedCourses: string[];
  selectedElectives: string[];
}

interface SavedPlansStore {
  savedPlans: Record<string, SavedPlan>;
  activePlanId: string | null;
  savePlan: (name: string, plan: PlanResult, completedCourses: string[], selectedElectives: string[]) => string;
  loadPlan: (id: string) => SavedPlan | null;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  setActivePlanId: (id: string | null) => void;
}

const STORAGE_KEY = "bt_saved_plans";
const ACTIVE_KEY = "bt_active_plan_id";

function loadSavedPlans(): Record<string, SavedPlan> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persist(plans: Record<string, SavedPlan>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {}
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export const useSavedPlansStore = create<SavedPlansStore>()((set, get) => ({
  savedPlans: loadSavedPlans(),
  activePlanId: loadActiveId(),

  savePlan: (name, plan, completedCourses, selectedElectives) => {
    const id = `plan_${Date.now()}`;
    const saved: SavedPlan = {
      id,
      name,
      savedAt: new Date().toISOString(),
      plan,
      completedCourses,
      selectedElectives,
    };
    set((state) => {
      const next = { ...state.savedPlans, [id]: saved };
      persist(next);
      localStorage.setItem(ACTIVE_KEY, id);
      return { savedPlans: next, activePlanId: id };
    });
    return id;
  },

  loadPlan: (id) => {
    const plan = get().savedPlans[id] ?? null;
    if (plan) {
      localStorage.setItem(ACTIVE_KEY, id);
      set({ activePlanId: id });
    }
    return plan;
  },

  deletePlan: (id) =>
    set((state) => {
      const next = { ...state.savedPlans };
      delete next[id];
      persist(next);
      const newActive = state.activePlanId === id ? null : state.activePlanId;
      if (newActive === null) localStorage.removeItem(ACTIVE_KEY);
      return { savedPlans: next, activePlanId: newActive };
    }),

  renamePlan: (id, name) =>
    set((state) => {
      if (!state.savedPlans[id]) return state;
      const next = {
        ...state.savedPlans,
        [id]: { ...state.savedPlans[id], name },
      };
      persist(next);
      return { savedPlans: next };
    }),

  setActivePlanId: (id) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    set({ activePlanId: id });
  },
}));
