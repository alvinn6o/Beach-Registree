import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function loadJson<T>(relativePath: string): T {
  const filePath = path.resolve(import.meta.dirname, "../../..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

describe("CSULB data integrity", () => {
  it("does not reference missing course IDs from requirements or prerequisites", () => {
    const cecsCourses = loadJson<any[]>("data/csulb/cecs_courses.json");
    const mathCourses = loadJson<any[]>("data/csulb/math_courses.json");
    const geCourses = loadJson<any[]>("data/csulb/ge_courses.json");
    const major = loadJson<any>("data/csulb/majors/cs_bs.json");
    const tracks = loadJson<any[]>("data/csulb/cs_bs_tracks.json");

    const courses = [...cecsCourses, ...mathCourses, ...geCourses];
    const ids = new Set(courses.map((course) => course.id));

    const missingRefs: string[] = [];

    for (const course of courses) {
      const refs = [
        ...(course.prerequisites ?? []),
        ...((course.prerequisites_or ?? []).flat()),
        ...(course.corequisites ?? []),
      ];
      for (const ref of refs) {
        if (!ids.has(ref)) {
          missingRefs.push(`${course.id} -> ${ref}`);
        }
      }
    }

    for (const req of major.requirements) {
      for (const ref of req.courses) {
        if (!ids.has(ref)) {
          missingRefs.push(`major -> ${ref}`);
        }
      }
    }

    for (const track of tracks) {
      for (const ref of [...(track.required ?? []), ...track.electives]) {
        if (!ids.has(ref)) {
          missingRefs.push(`track:${track.id} -> ${ref}`);
        }
      }
    }

    expect(missingRefs).toEqual([]);
  });
});
