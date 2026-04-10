import { getDownstream } from "graph-core";
import type { Course, SemesterPlan } from "graph-core";

export interface SemesterInsight {
  term: string;
  tone: "light" | "balanced" | "heavy";
  summary: string;
  highlights: string[];
}

export function buildSemesterInsights(
  semesters: SemesterPlan[],
  courses: Course[],
  minUnitsPerSemester: number
): SemesterInsight[] {
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  return semesters
    .filter((semester) => semester.courses.length > 0)
    .map((semester) => {
      const activeCourses = semester.courses
        .map((id) => courseMap.get(id))
        .filter((course): course is Course => course !== undefined);

      const unlocking = [...activeCourses]
        .map((course) => ({
          course,
          downstream: getDownstream(course.id, courses).size - 1,
        }))
        .filter(({ downstream }) => downstream > 0)
        .sort((a, b) => b.downstream - a.downstream)
        .slice(0, 2)
        .map(({ course, downstream }) => `${course.id} unlocks ${downstream} later course${downstream === 1 ? "" : "s"}`);

      const standing = activeCourses
        .filter((course) => (course.minUnitsCompleted ?? 0) > 0)
        .map((course) => `${course.id} lands here after the ${course.minUnitsCompleted}-unit threshold`);

      const foundations = activeCourses
        .filter((course) => ["core", "math", "support"].includes(course.category))
        .slice(0, 2)
        .map((course) => `${course.id} builds prerequisite momentum`);

      const geWrap = activeCourses
        .filter((course) => course.category === "ge" || course.category === "ge-upper")
        .slice(0, 2)
        .map((course) => `${course.id} covers remaining GE progress`);

      const highlights = [...unlocking, ...standing, ...foundations, ...geWrap]
        .filter((value, index, array) => array.indexOf(value) === index)
        .slice(0, 3);

      const tone =
        semester.total_units < minUnitsPerSemester
          ? "light"
          : semester.total_units > Math.max(15, minUnitsPerSemester + 3)
            ? "heavy"
            : "balanced";

      const summary =
        tone === "light"
          ? `Lighter semester at ${semester.total_units} units. It still prioritizes courses that keep the plan moving.`
          : tone === "heavy"
            ? `Heavier semester at ${semester.total_units} units to preserve prerequisite progress and timeline.`
            : `Balanced full-time semester at ${semester.total_units} units with prerequisite progress preserved.`;

      return {
        term: semester.term,
        tone,
        summary,
        highlights: highlights.length > 0
          ? highlights
          : ["This semester mainly balances remaining requirements against unit targets."],
      };
    });
}
