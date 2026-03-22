import type { Course, CourseStatus, Edge } from "./types";

export function buildEdges(courses: Course[]): Edge[] {
  const edges: Edge[] = [];
  for (const c of courses) {
    for (const p of c.prerequisites) {
      edges.push({ source: p, target: c.id });
    }
    for (const group of c.prerequisites_or) {
      for (const p of group) {
        edges.push({ source: p, target: c.id });
      }
    }
  }
  return edges;
}

// Minimum layer for categories that shouldn't appear at layer 0 with freshman courses
const CATEGORY_MIN_LAYER: Partial<Record<string, number>> = {
  upper: 3,
  capstone: 5,
  ge: 0,       // Lower-div GE at entry level
  "ge-upper": 4,
};

export function computeLayers(courses: Course[]): Map<string, number> {
  const depth = new Map<string, number>();
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  function memo(id: string, visited: Set<string> = new Set()): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const c = courseMap.get(id);
    if (!c || c.prerequisites.length === 0) {
      // Apply minimum layer based on category so upper-div courses
      // don't appear alongside freshman entry-level courses
      const minLayer = (c && CATEGORY_MIN_LAYER[c.category]) ?? 0;
      depth.set(id, minLayer);
      return minLayer;
    }

    const allPrereqs = [
      ...c.prerequisites,
      ...c.prerequisites_or.flat(),
    ];
    const maxDepth = Math.max(
      ...allPrereqs.map((p) => memo(p, new Set(visited)))
    );
    const d = maxDepth + 1;
    // Enforce category minimum layer
    const minLayer = (c && CATEGORY_MIN_LAYER[c.category]) ?? 0;
    const finalD = Math.max(d, minLayer);
    depth.set(id, finalD);
    return finalD;
  }

  for (const c of courses) {
    memo(c.id);
  }

  return depth;
}

export function isPrereqMet(
  course: Course,
  completedSet: Set<string>
): boolean {
  for (const prereq of course.prerequisites) {
    if (!completedSet.has(prereq)) return false;
  }

  if (course.prerequisites_or.length > 0) {
    let satisfied = false;
    for (const group of course.prerequisites_or) {
      if (group.every((p) => completedSet.has(p))) {
        satisfied = true;
        break;
      }
    }
    if (!satisfied) return false;
  }

  return true;
}

export function getStatus(
  courseId: string,
  courses: Course[],
  completedSet: Set<string>
): CourseStatus {
  if (completedSet.has(courseId)) return "completed";
  const course = courses.find((c) => c.id === courseId);
  if (!course) return "locked";
  return isPrereqMet(course, completedSet) ? "available" : "locked";
}

export function getPathTo(
  courseId: string,
  courses: Course[],
  visited: Set<string> = new Set()
): Set<string> {
  if (visited.has(courseId)) return visited;
  visited.add(courseId);
  const course = courses.find((c) => c.id === courseId);
  if (course) {
    const allPrereqs = [
      ...course.prerequisites,
      ...course.prerequisites_or.flat(),
    ];
    for (const p of allPrereqs) {
      getPathTo(p, courses, visited);
    }
  }
  return visited;
}

export function getDownstream(
  courseId: string,
  courses: Course[],
  visited: Set<string> = new Set()
): Set<string> {
  if (visited.has(courseId)) return visited;
  visited.add(courseId);
  for (const c of courses) {
    const allPrereqs = [
      ...c.prerequisites,
      ...c.prerequisites_or.flat(),
    ];
    if (allPrereqs.includes(courseId)) {
      getDownstream(c.id, courses, visited);
    }
  }
  return visited;
}

export function detectCycles(courses: Course[]): string[][] {
  const cycles: string[][] = [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(id: string) {
    if (inStack.has(id)) {
      const cycleStart = path.indexOf(id);
      cycles.push(path.slice(cycleStart).concat(id));
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    inStack.add(id);
    path.push(id);

    const c = courseMap.get(id);
    if (c) {
      for (const p of c.prerequisites) {
        dfs(p);
      }
    }

    path.pop();
    inStack.delete(id);
  }

  for (const c of courses) {
    dfs(c.id);
  }

  return cycles;
}
