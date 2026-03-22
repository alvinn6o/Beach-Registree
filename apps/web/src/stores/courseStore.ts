"use client";

import { create } from "zustand";
import type { Course, MajorRequirements, Edge, ViewMode } from "graph-core";
import { buildEdges, computeLayers, getStatus, getPathTo, getDownstream, detectCycles } from "graph-core";
import cecsCoursesData from "../../../../data/csulb/cecs_courses.json";
import mathCoursesData from "../../../../data/csulb/math_courses.json";
import geCoursesData from "../../../../data/csulb/ge_courses.json";
import majorData from "../../../../data/csulb/majors/cs_bs.json";

const MAJOR_CATEGORIES = new Set(["math", "core", "upper", "elective", "capstone"]);

const allCourses: Course[] = [
  ...(cecsCoursesData as Course[]),
  ...(mathCoursesData as Course[]),
  ...(geCoursesData as Course[]),
];

// Cycle detection — runs once at module init; logs errors so the app still loads
const _cycles = detectCycles(allCourses);
if (_cycles.length > 0) {
  console.error(
    `[courseStore] Prerequisite cycle(s) detected! Fix the data before deploying.\n` +
      _cycles.map((c) => c.join(" → ")).join("\n")
  );
}

interface CourseStore {
  courses: Course[];
  allCourses: Course[];
  major: MajorRequirements;
  edges: Edge[];
  layers: Map<string, number>;
  maxLayer: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  getCourse: (id: string) => Course | undefined;
  getEdges: () => Edge[];
  getStatus: (id: string, completed: Set<string>) => "completed" | "available" | "locked";
  getPathTo: (id: string) => Set<string>;
  getDownstream: (id: string) => Set<string>;
  getFilteredCourses: () => Course[];
  getFilteredEdges: () => Edge[];
}

// Filter courses for graph display based on view mode
function filterCourses(courses: Course[], mode: ViewMode): Course[] {
  if (mode === "all") {
    // Show everything including GE placeholders
    return courses;
  }
  // Major view: only major-relevant categories, exclude GE placeholders
  return courses.filter((c) => MAJOR_CATEGORIES.has(c.category));
}

export const useCourseStore = create<CourseStore>()((set, get) => {
  return {
    courses: filterCourses(allCourses, "major"),
    allCourses,
    major: majorData as MajorRequirements,
    edges: buildEdges(filterCourses(allCourses, "major")),
    layers: computeLayers(filterCourses(allCourses, "major")),
    maxLayer: Math.max(...computeLayers(filterCourses(allCourses, "major")).values(), 0),
    viewMode: "major" as ViewMode,

    setViewMode: (mode) => {
      const filtered = filterCourses(allCourses, mode);
      const newEdges = buildEdges(filtered);
      const newLayers = computeLayers(filtered);
      const newMaxLayer = Math.max(...newLayers.values(), 0);
      set({
        viewMode: mode,
        courses: filtered,
        edges: newEdges,
        layers: newLayers,
        maxLayer: newMaxLayer,
      });
    },

    getCourse: (id) => allCourses.find((c) => c.id === id),
    getEdges: () => get().edges,
    getStatus: (id, completed) => getStatus(id, allCourses, completed),
    getPathTo: (id) => getPathTo(id, allCourses),
    getDownstream: (id) => getDownstream(id, allCourses),

    getFilteredCourses: () => {
      const mode = get().viewMode;
      return filterCourses(allCourses, mode);
    },
    getFilteredEdges: () => {
      const mode = get().viewMode;
      return buildEdges(filterCourses(allCourses, mode));
    },
  };
});
