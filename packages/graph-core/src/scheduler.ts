import type { Course, SchedulerInput, PlanResult, SemesterPlan } from "./types";
import { isPrereqMet } from "./dag";

function parseTerm(term: string): { season: "F" | "S"; year: number } {
  const parts = term.split(" ");
  const season = parts[0] === "Fall" ? "F" : "S";
  const year = parseInt(parts[1], 10);
  return { season, year };
}

function nextTerm(term: string): string {
  const { season, year } = parseTerm(term);
  if (season === "F") return `Spring ${year + 1}`;
  return `Fall ${year}`;
}

function termIndex(term: string): number {
  const { season, year } = parseTerm(term);
  return year * 2 + (season === "F" ? 0 : 1);
}

function generateTerms(from: string, to: string): string[] {
  const terms: string[] = [];
  let current = from;
  const endIdx = termIndex(to);
  while (termIndex(current) <= endIdx) {
    terms.push(current);
    current = nextTerm(current);
  }
  return terms;
}

function criticalPathDepth(
  courseId: string,
  courseMap: Map<string, Course>,
  completedSet: Set<string>,
  memo: Map<string, number> = new Map()
): number {
  if (completedSet.has(courseId)) return 0;
  if (memo.has(courseId)) return memo.get(courseId)!;

  const course = courseMap.get(courseId);
  if (!course) return 0;

  const allPrereqs = [
    ...course.prerequisites,
    ...course.prerequisites_or.flat(),
  ];

  const unfinished = allPrereqs.filter((p) => !completedSet.has(p));
  if (unfinished.length === 0) {
    memo.set(courseId, 1);
    return 1;
  }

  const depth =
    1 +
    Math.max(
      ...unfinished.map((p) =>
        criticalPathDepth(p, courseMap, completedSet, memo)
      )
    );
  memo.set(courseId, depth);
  return depth;
}

function downstreamCount(
  courseId: string,
  courses: Course[],
  memo: Map<string, number> = new Map()
): number {
  if (memo.has(courseId)) return memo.get(courseId)!;

  let count = 0;
  for (const c of courses) {
    const allPrereqs = [...c.prerequisites, ...c.prerequisites_or.flat()];
    if (allPrereqs.includes(courseId)) {
      count += 1 + downstreamCount(c.id, courses, memo);
    }
  }
  memo.set(courseId, count);
  return count;
}

export function generatePlan(
  courses: Course[],
  input: SchedulerInput
): PlanResult {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const completedSet = new Set(input.completedCourses);

  // Step 1: Determine remaining courses
  // NOTE: We always include ALL required courses regardless of viewMode.
  // viewMode only affects the graph display, not what gets scheduled.
  // Support courses (ENGR 350, ENGR 101/102, etc.) are required for the major
  // even though they have a "support" category.
  const allRequired: string[] = [];
  for (const req of input.majorRequirements.requirements) {
    if (req.type === "all") {
      allRequired.push(...req.courses);
    } else if (req.type === "choose" && req.count !== undefined) {
      // Use selectedElectives that belong to this group
      const picked = input.selectedElectives.filter((id) =>
        req.courses.includes(id)
      );
      if (picked.length >= req.count) {
        // Enough selected — use the selected ones
        allRequired.push(...picked);
      } else {
        // Not enough selected — fill gaps with defaults (first N courses in group)
        const defaults = req.courses
          .filter((id) => courseMap.has(id))
          .slice(0, req.count);
        allRequired.push(...defaults);
      }
    }
  }
  // Add any selectedElectives not already covered above (deduplication below)
  for (const id of input.selectedElectives) {
    if (!allRequired.includes(id)) allRequired.push(id);
  }

  const remaining = allRequired.filter(
    (id) => !completedSet.has(id) && courseMap.has(id)
  );

  // Step 2: Generate terms
  const terms = generateTerms(input.currentSemester, input.targetGraduation);

  // Step 3: Priority scoring
  const cpMemo = new Map<string, number>();
  const dsMemo = new Map<string, number>();

  const firstYearSet = new Set(input.firstYearCourses ?? []);

  function priority(courseId: string, termSeason: "F" | "S", termIdx: number): number {
    const course = courseMap.get(courseId)!;
    const cp = criticalPathDepth(courseId, courseMap, completedSet, cpMemo);
    const ds = downstreamCount(courseId, courses, dsMemo);
    const isReq = input.majorRequirements.requirements.some(
      (r) => r.type === "all" && r.courses.includes(courseId)
    )
      ? 1
      : 0;
    // Prefer scheduling in the semester the course is typically offered
    const preferredSemester =
      course.semester_offered === "F/S" || course.semester_offered === termSeason
        ? 0.5
        : -1;
    // First-year required courses get a massive boost in the first 2 semesters
    const firstYearBoost = firstYearSet.has(courseId) && termIdx < 2 ? 20 : 0;

    return 3 * cp + 2 * ds + 1 * isReq + preferredSemester + firstYearBoost;
  }

  // Step 4: Semester assignment
  // Strategy: pack courses as early as possible (up to max units per semester)
  // so students can graduate early when prerequisites allow it.
  // Empty trailing semesters are trimmed at the end.
  const scheduled = new Set(input.completedCourses);
  const semesters: SemesterPlan[] = [];
  const unscheduled = new Set(remaining);
  const minUnits = input.minUnitsPerSemester || 12;
  const maxUnits = input.unitsPerSemester;

  for (let termIdx = 0; termIdx < terms.length; termIdx++) {
    const term = terms[termIdx];
    const { season } = parseTerm(term);

    const eligible = [...unscheduled].filter((id) => {
      const course = courseMap.get(id);
      if (!course) return false;
      return isPrereqMet(course, scheduled);
    });

    eligible.sort((a, b) => priority(b, season, termIdx) - priority(a, season, termIdx));

    const semesterCourses: string[] = [];
    const addedThisSemester = new Set<string>();
    let units = 0;

    for (const id of eligible) {
      if (addedThisSemester.has(id)) continue;
      const course = courseMap.get(id)!;

      // Determine unscheduled corequisites that must accompany this course
      const pendingCoreqs = (course.corequisites ?? []).filter(
        (cid) => !scheduled.has(cid) && !addedThisSemester.has(cid) && courseMap.has(cid)
      );
      const coreqUnits = pendingCoreqs.reduce((sum, cid) => {
        return sum + (courseMap.get(cid)?.units ?? 0);
      }, 0);

      if (units + course.units + coreqUnits <= maxUnits) {
        semesterCourses.push(id);
        addedThisSemester.add(id);
        units += course.units;
        // Co-schedule corequisites immediately
        for (const cid of pendingCoreqs) {
          if (unscheduled.has(cid)) {
            semesterCourses.push(cid);
            addedThisSemester.add(cid);
            units += courseMap.get(cid)!.units;
          }
        }
      }
    }

    const warnings: string[] = [];
    if (units < minUnits && semesterCourses.length > 0) {
      warnings.push(`Only ${units} units — below minimum (${minUnits})`);
    }

    semesters.push({
      term,
      courses: semesterCourses,
      total_units: units,
      warnings,
    });

    for (const id of semesterCourses) {
      scheduled.add(id);
      unscheduled.delete(id);
    }

    // If all courses are scheduled, stop adding semesters
    if (unscheduled.size === 0) break;
  }

  // Trim trailing empty semesters (keep at least one)
  while (semesters.length > 1 && semesters[semesters.length - 1].courses.length === 0) {
    semesters.pop();
  }

  // Step 5: Validation with detailed infeasibility reporting
  const errors: string[] = [];
  const allWarnings: string[] = [];

  if (unscheduled.size > 0) {
    for (const id of unscheduled) {
      const course = courseMap.get(id);
      if (!course) {
        errors.push(`${id}: Course data not found in catalog.`);
        continue;
      }
      // Figure out WHY it couldn't be scheduled
      const missingPrereqs = course.prerequisites.filter(
        (p) => !scheduled.has(p) && !completedSet.has(p)
      );
      const unmetOrPrereqs = course.prerequisites_or.length > 0 &&
        !course.prerequisites_or.some((group) =>
          group.every((p) => scheduled.has(p) || completedSet.has(p))
        );

      const reasons: string[] = [];
      if (missingPrereqs.length > 0) {
        reasons.push(`prerequisites not met: ${missingPrereqs.join(", ")}`);
      }
      if (unmetOrPrereqs) {
        reasons.push(`OR prerequisites not satisfied`);
      }
      if (reasons.length === 0) {
        reasons.push(`no room in any semester within unit limit (${input.unitsPerSemester}u max)`);
      }

      errors.push(`${id} (${course.name}): ${reasons.join("; ")}`);
    }

    // Add summary
    const cpMemoValidation = new Map<string, number>();
    const critPath = Math.max(
      ...[...unscheduled].map((id) =>
        criticalPathDepth(id, courseMap, completedSet, cpMemoValidation)
      )
    );
    const availableSemesters = terms.length;
    if (critPath > availableSemesters) {
      allWarnings.push(
        `Critical path requires at least ${critPath} semesters, but only ${availableSemesters} remain. Consider extending your target graduation.`
      );
    }
    allWarnings.push(
      `${unscheduled.size} course(s) could not be scheduled. Try increasing units per semester, extending graduation target, or adjusting elective choices.`
    );
  }

  // Check for semesters below minimum
  const minUnitsCheck = input.minUnitsPerSemester || 12;
  for (const sem of semesters) {
    if (sem.courses.length > 0 && sem.total_units < minUnitsCheck) {
      allWarnings.push(
        `${sem.term}: ${sem.total_units} units is below the minimum of ${minUnitsCheck} — you may lose full-time status.`
      );
    }
  }

  const allReqMet = unscheduled.size === 0;

  return {
    semesters,
    validation: {
      all_requirements_met: allReqMet,
      graduation_on_target: allReqMet,
      errors,
      warnings: allWarnings,
    },
  };
}
