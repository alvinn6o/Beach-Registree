import type { Course, SchedulerInput, PlanResult, SemesterPlan } from "./types";
import { getCompletedUnits, isCourseEligible, isPrereqMet, isStandingMet } from "./dag";
import { resolveRequirementCourses } from "./requirements";
import { validatePlan } from "./validator";

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
  return year * 2 + (season === "S" ? 0 : 1);
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

  const andDepths = course.prerequisites
    .filter((p) => !completedSet.has(p))
    .map((p) => criticalPathDepth(p, courseMap, completedSet, memo));
  const orDepths = course.prerequisites_or.map((group) => {
    const remaining = group.filter((p) => !completedSet.has(p));
    if (remaining.length === 0) return 0;
    return Math.min(
      ...remaining.map((p) => criticalPathDepth(p, courseMap, completedSet, memo))
    );
  });

  const prerequisiteDepth = Math.max(0, ...andDepths, ...orDepths);
  if (prerequisiteDepth === 0) {
    memo.set(courseId, 1);
    return 1;
  }

  const depth = 1 + prerequisiteDepth;
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

function inferCourseLevel(course: Course): number | null {
  const match = course.id.match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : null;
}

function academicPhasePreference(course: Course): number {
  const level = inferCourseLevel(course);

  if (course.category === "capstone") return 0.95;
  if (course.minUnitsCompleted && course.minUnitsCompleted >= 90) return 0.9;
  if (course.minUnitsCompleted && course.minUnitsCompleted >= 60) return 0.72;
  if (course.category === "ge-upper") return 0.65;
  if (course.category === "upper") return 0.62;
  if (course.category === "elective") return 0.58;
  // GE courses should be scheduled in the first ~40% of the plan (discovery years)
  if (course.category === "ge") return 0.12;
  if (course.category === "support") return level && level >= 300 ? 0.55 : 0.20;
  if (course.category === "math") return level && level >= 300 ? 0.48 : 0.15;
  if (course.category === "core") return level && level >= 300 ? 0.5 : 0.18;

  return 0.5;
}

function academicPhaseScore(course: Course, termIdx: number, totalTerms: number): number {
  if (totalTerms <= 1) return 0;

  const preference = academicPhasePreference(course);
  const progress = termIdx / Math.max(totalTerms - 1, 1);
  const distance = Math.abs(progress - preference);

  if (distance <= 0.1) return 8;
  if (distance <= 0.2) return 4;
  if (distance <= 0.3) return 1;
  if (distance <= 0.45) return -2;
  return -6;
}

function sumUnits(courseIds: Iterable<string>, courseMap: Map<string, Course>): number {
  let total = 0;
  for (const id of courseIds) {
    total += courseMap.get(id)?.units ?? 0;
  }
  return total;
}

function minTermsToTakeCourse(
  courseId: string,
  courseMap: Map<string, Course>,
  completedSet: Set<string>,
  completedUnits: number,
  maxUnitsPerSemester: number,
  memo: Map<string, number> = new Map()
): number {
  if (completedSet.has(courseId)) return 0;
  if (memo.has(courseId)) return memo.get(courseId)!;

  const course = courseMap.get(courseId);
  if (!course) return 0;

  const prereqTerms = criticalPathDepth(courseId, courseMap, completedSet);
  const standingGap = Math.max(
    0,
    (course.minUnitsCompleted ?? 0) - completedUnits
  );
  const standingTermsBeforeEligible =
    standingGap === 0 ? 0 : Math.ceil(standingGap / Math.max(maxUnitsPerSemester, 1));

  const minTerms = Math.max(prereqTerms, standingTermsBeforeEligible + 1);
  memo.set(courseId, minTerms);
  return minTerms;
}

function estimateTermsNeeded(
  unscheduledIds: Iterable<string>,
  courseMap: Map<string, Course>,
  completedSet: Set<string>,
  completedUnits: number,
  maxUnitsPerSemester: number
): number {
  const ids = [...unscheduledIds];
  if (ids.length === 0) return 0;

  const unitBound = Math.ceil(sumUnits(ids, courseMap) / Math.max(maxUnitsPerSemester, 1));
  const termMemo = new Map<string, number>();
  const chainBound = Math.max(
    ...ids.map((id) =>
      minTermsToTakeCourse(
        id,
        courseMap,
        completedSet,
        completedUnits,
        maxUnitsPerSemester,
        termMemo
      )
    )
  );

  return Math.max(unitBound, chainBound);
}

function buildPendingCoreqBundle(
  courseId: string,
  courseMap: Map<string, Course>,
  unscheduled: Set<string>,
  alreadyAdded: Set<string>
): string[] {
  const bundle: string[] = [];
  const stack = [courseId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id) || alreadyAdded.has(id)) continue;
    const course = courseMap.get(id);
    if (!course) continue;

    seen.add(id);
    bundle.push(id);

    for (const coreqId of course.corequisites ?? []) {
      if (unscheduled.has(coreqId) && !alreadyAdded.has(coreqId)) {
        stack.push(coreqId);
      }
    }
  }

  return bundle;
}

function canScheduleBundleNow(
  bundle: string[],
  courseMap: Map<string, Course>,
  completedSet: Set<string>,
  completedUnits: number
): boolean {
  const bundleSet = new Set(bundle);

  for (const id of bundle) {
    const course = courseMap.get(id);
    if (!course) return false;
    if (!isPrereqMet(course, completedSet)) return false;
    if (!isStandingMet(course, completedUnits)) return false;

    const missingCoreqs = (course.corequisites ?? []).filter(
      (coreqId) => !completedSet.has(coreqId) && !bundleSet.has(coreqId)
    );
    if (missingCoreqs.length > 0) return false;
  }

  return true;
}

function cloneSemesters(semesters: SemesterPlan[]): SemesterPlan[] {
  return semesters.map((semester) => ({
    term: semester.term,
    courses: [...semester.courses],
    total_units: semester.total_units,
    warnings: [...semester.warnings],
  }));
}

function refreshSemesterTotals(
  semesters: SemesterPlan[],
  courseMap: Map<string, Course>,
  minUnitsPerSemester: number
) {
  for (const semester of semesters) {
    semester.total_units = sumUnits(semester.courses, courseMap);
    semester.warnings = [];
    if (
      semester.courses.length > 0 &&
      semester.total_units < minUnitsPerSemester
    ) {
      semester.warnings.push(
        `Only ${semester.total_units} units — below minimum (${minUnitsPerSemester})`
      );
    }
  }
}

function buildSameSemesterCoreqBundle(
  courseId: string,
  semesterCourseIds: Set<string>,
  courseMap: Map<string, Course>
): string[] {
  const bundle: string[] = [];
  const stack = [courseId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id) || !semesterCourseIds.has(id)) continue;
    const course = courseMap.get(id);
    if (!course) continue;

    seen.add(id);
    bundle.push(id);

    for (const coreqId of course.corequisites ?? []) {
      if (semesterCourseIds.has(coreqId)) {
        stack.push(coreqId);
      }
    }
  }

  return bundle;
}

function compactSemestersLeft(params: {
  semesters: SemesterPlan[];
  courses: Course[];
  completedCourses: string[];
  courseMap: Map<string, Course>;
  maxUnitsPerSemester: number;
}) {
  const { courses, completedCourses, courseMap, maxUnitsPerSemester } = params;
  let semesters = cloneSemesters(params.semesters);
  while (true) {
    let fromIdx = semesters.length - 1;
    while (fromIdx > 0 && semesters[fromIdx].courses.length === 0) {
      fromIdx--;
    }
    if (fromIdx <= 0) break;

    let trial = cloneSemesters(semesters);
    let couldEliminate = true;

    while (trial[fromIdx].courses.length > 0) {
      const sourceIds = new Set(trial[fromIdx].courses);
      const bundle = buildSameSemesterCoreqBundle(
        trial[fromIdx].courses[0],
        sourceIds,
        courseMap
      );
      const bundleUnits = sumUnits(bundle, courseMap);

      const targetOrder = Array.from({ length: fromIdx }, (_, idx) => idx).sort(
        (a, b) => trial[a].total_units - trial[b].total_units || a - b
      );

      let movedBundle = false;
      for (const toIdx of targetOrder) {
        if (trial[toIdx].total_units + bundleUnits > maxUnitsPerSemester) {
          continue;
        }

        const next = cloneSemesters(trial);
        next[fromIdx].courses = next[fromIdx].courses.filter((id) => !bundle.includes(id));
        next[toIdx].courses = [...next[toIdx].courses, ...bundle];
        refreshSemesterTotals(next, courseMap, 0);

        const errors = validatePlan(courses, next, completedCourses, 0);
        if (errors.length === 0) {
          trial = next;
          movedBundle = true;
          break;
        }
      }

      if (!movedBundle) {
        couldEliminate = false;
        break;
      }
    }

    if (!couldEliminate || trial[fromIdx].courses.length > 0) {
      break;
    }

    semesters = trial;
    while (
      semesters.length > 1 &&
      semesters[semesters.length - 1].courses.length === 0
    ) {
      semesters.pop();
    }
  }

  while (
    semesters.length > 1 &&
    semesters[semesters.length - 1].courses.length === 0
  ) {
    semesters.pop();
  }

  return semesters;
}

function planSpread(semesters: SemesterPlan[]): number {
  const active = semesters.filter((semester) => semester.courses.length > 0);
  if (active.length <= 1) return 0;

  const loads = active.map((semester) => semester.total_units);
  return Math.max(...loads) - Math.min(...loads);
}

function planUnderloadPenalty(semesters: SemesterPlan[], minUnitsPerSemester: number): number {
  if (minUnitsPerSemester <= 0) return 0;

  return semesters.reduce((sum, semester) => {
    if (semester.courses.length === 0) return sum;
    return sum + Math.max(0, minUnitsPerSemester - semester.total_units);
  }, 0);
}

function rebalanceSemesterLoads(params: {
  semesters: SemesterPlan[];
  courses: Course[];
  completedCourses: string[];
  courseMap: Map<string, Course>;
  maxUnitsPerSemester: number;
  minUnitsPerSemester: number;
}) {
  const {
    semesters: initialSemesters,
    courses,
    completedCourses,
    courseMap,
    maxUnitsPerSemester,
    minUnitsPerSemester,
  } = params;

  let semesters = cloneSemesters(initialSemesters);
  let improved = true;

  while (improved) {
    improved = false;
    const activeIndices = semesters
      .map((semester, index) => ({ semester, index }))
      .filter(({ semester }) => semester.courses.length > 0);

    if (activeIndices.length <= 1) break;

    const currentSpread = planSpread(semesters);
    const currentPenalty = planUnderloadPenalty(semesters, minUnitsPerSemester);
    if (currentSpread <= 6 && currentPenalty === 0) break;

    const heaviest = [...activeIndices].sort(
      (a, b) => b.semester.total_units - a.semester.total_units || a.index - b.index
    )[0];
    if (!heaviest) break;

    let bestPlan: SemesterPlan[] | null = null;
    let bestSpread = currentSpread;
    let bestPenalty = currentPenalty;

    const sourceIds = new Set(heaviest.semester.courses);
    for (const courseId of heaviest.semester.courses) {
      if (!sourceIds.has(courseId)) continue;
      const bundle = buildSameSemesterCoreqBundle(courseId, sourceIds, courseMap);
      const bundleUnits = sumUnits(bundle, courseMap);

      const targets = activeIndices
        .filter(({ index }) => index !== heaviest.index)
        .sort((a, b) => a.semester.total_units - b.semester.total_units || a.index - b.index);

      for (const target of targets) {
        if (target.semester.total_units + bundleUnits > maxUnitsPerSemester) {
          continue;
        }

        const next = cloneSemesters(semesters);
        next[heaviest.index].courses = next[heaviest.index].courses.filter(
          (id) => !bundle.includes(id)
        );
        next[target.index].courses = [...next[target.index].courses, ...bundle];
        refreshSemesterTotals(next, courseMap, minUnitsPerSemester);

        const errors = validatePlan(courses, next, completedCourses, 0);
        if (errors.length > 0) continue;

        const nextSpread = planSpread(next);
        const nextPenalty = planUnderloadPenalty(next, minUnitsPerSemester);
        const improves =
          nextPenalty < bestPenalty ||
          (nextPenalty === bestPenalty && nextSpread < bestSpread);

        if (improves) {
          bestPlan = next;
          bestSpread = nextSpread;
          bestPenalty = nextPenalty;
        }
      }
    }

    if (bestPlan) {
      semesters = bestPlan;
      improved = true;
    }
  }

  return semesters;
}

export function generatePlan(
  courses: Course[],
  input: SchedulerInput
): PlanResult {
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const completedSet = new Set(input.completedCourses);
  const initiallyCompletedUnits = getCompletedUnits(courses, completedSet);

  // Step 1: Determine remaining courses
  // NOTE: We always include ALL required courses regardless of viewMode.
  // viewMode only affects the graph display, not what gets scheduled.
  // Support courses (ENGR 350, ENGR 101/102, etc.) are required for the major
  // even though they have a "support" category.
  const { allRequired } = resolveRequirementCourses(
    input.majorRequirements,
    input.selectedElectives,
    new Set(courseMap.keys())
  );

  const remaining = allRequired.filter(
    (id) => !completedSet.has(id) && courseMap.has(id)
  );

  // Step 2: Generate terms
  // Instead of being hard-bounded by targetGraduation, estimate how many terms
  // we actually need and extend if the target is too short.
  const requestedTerms = generateTerms(input.currentSemester, input.targetGraduation);
  const estimatedNeeded = estimateTermsNeeded(
    remaining,
    courseMap,
    completedSet,
    initiallyCompletedUnits,
    input.unitsPerSemester
  );
  // Ensure we have enough terms — extend past target if necessary
  let terms = requestedTerms;
  if (estimatedNeeded > terms.length) {
    let lastTerm = terms[terms.length - 1];
    while (terms.length < estimatedNeeded + 2) {
      lastTerm = nextTerm(lastTerm);
      terms.push(lastTerm);
    }
  }

  // Step 3: Priority scoring
  const cpMemo = new Map<string, number>();
  const dsMemo = new Map<string, number>();

  const firstYearSet = new Set(input.firstYearCourses ?? []);

  const totalTerms = terms.length;

  function priority(
    courseId: string,
    termIdx: number,
    scheduledSnapshot: Set<string>,
    completedUnitsSnapshot: number,
    availableTerms: number
  ): number {
    const course = courseMap.get(courseId)!;
    const cp = criticalPathDepth(courseId, courseMap, scheduledSnapshot, cpMemo);
    const ds = downstreamCount(courseId, courses, dsMemo);
    const phaseScore = academicPhaseScore(course, termIdx, totalTerms);
    const isReq = input.majorRequirements.requirements.some(
      (r) => r.type === "all" && r.courses.includes(courseId)
    )
      ? 1
      : 0;
    const minTerms = minTermsToTakeCourse(
      courseId,
      courseMap,
      scheduledSnapshot,
      completedUnitsSnapshot,
      maxUnits
    );
    const slack = Math.max(0, availableTerms - minTerms);
    const urgencyBoost = slack <= 1 ? 14 : slack === 2 ? 7 : slack === 3 ? 3 : 0;
    // First-year required courses get a massive boost in the first 2 semesters
    const firstYearBoost = firstYearSet.has(courseId) && termIdx < 2 ? 20 : 0;
    // GE courses get a boost in early semesters (first 40% of plan) to reflect
    // the real pattern where students complete GEs during discovery years 1-2
    const geEarlyBoost =
      (course.category === "ge" || course.category === "math") &&
      termIdx < Math.ceil(totalTerms * 0.4)
        ? 10
        : 0;

    return (
      4 * cp +
      3 * ds +
      2 * isReq +
      urgencyBoost +
      firstYearBoost +
      geEarlyBoost +
      phaseScore
    );
  }

  // Step 4: Semester assignment
  // Strategy:
  // 1. satisfy hard constraints
  // 2. finish as early as possible within the unit cap
  // 3. smooth load inside that shortest feasible horizon
  const scheduled = new Set(input.completedCourses);
  const semesters: SemesterPlan[] = [];
  const unscheduled = new Set(remaining);
  const minUnits = input.minUnitsPerSemester || 12;
  const maxUnits = input.unitsPerSemester;
  let completedUnits = initiallyCompletedUnits;

  for (let termIdx = 0; termIdx < terms.length; termIdx++) {
    const term = terms[termIdx];
    const remainingTerms = terms.length - termIdx;
    const remainingUnits = sumUnits(unscheduled, courseMap);
    const shortestFeasibleHorizon = Math.max(
      1,
      Math.min(
        remainingTerms,
        estimateTermsNeeded(
          unscheduled,
          courseMap,
          scheduled,
          completedUnits,
          maxUnits
        )
      )
    );
    const averageLoad =
      shortestFeasibleHorizon > 0
        ? Math.ceil(remainingUnits / shortestFeasibleHorizon)
        : remainingUnits;
    const targetUnits = Math.min(
      maxUnits,
      Math.max(Math.min(minUnits, remainingUnits), averageLoad)
    );

    const eligible = [...unscheduled].filter((id) => {
      const course = courseMap.get(id);
      if (!course) return false;
      return isCourseEligible(course, scheduled, completedUnits);
    });

    eligible.sort(
      (a, b) =>
        priority(b, termIdx, scheduled, completedUnits, shortestFeasibleHorizon) -
        priority(a, termIdx, scheduled, completedUnits, shortestFeasibleHorizon)
    );

    const semesterCourses: string[] = [];
    const addedThisSemester = new Set<string>();
    let units = 0;

    while (unscheduled.size > addedThisSemester.size) {
      const completedNextTerm = new Set([...scheduled, ...addedThisSemester]);
      const remainingNextTerm = [...unscheduled].filter((id) => !addedThisSemester.has(id));
      const futureTermsNeededNow = estimateTermsNeeded(
        remainingNextTerm,
        courseMap,
        completedNextTerm,
        completedUnits + units,
        maxUnits
      );
      const needsMoreToHitTarget = units < targetUnits;
      const needsMoreToPreserveEarliestFinish =
        futureTermsNeededNow > Math.max(0, shortestFeasibleHorizon - 1);

      if (!needsMoreToHitTarget && !needsMoreToPreserveEarliestFinish) {
        break;
      }

      let bestCandidate:
        | {
            bundle: string[];
            projectedUnits: number;
            futureTermsNeeded: number;
            overshoot: number;
            gap: number;
            score: number;
            mustTake: number;
          }
        | null = null;

      for (const id of eligible) {
        if (addedThisSemester.has(id)) continue;

        const bundle = buildPendingCoreqBundle(id, courseMap, unscheduled, addedThisSemester);
        if (bundle.length === 0) continue;
        if (!canScheduleBundleNow(bundle, courseMap, scheduled, completedUnits)) continue;

        const bundleUnits = sumUnits(bundle, courseMap);
        const projectedUnits = units + bundleUnits;
        if (projectedUnits > maxUnits) continue;

        const completedAfterAdd = new Set([
          ...scheduled,
          ...addedThisSemester,
          ...bundle,
        ]);
        const remainingAfterAdd = [...unscheduled].filter(
          (courseId) => !addedThisSemester.has(courseId) && !bundle.includes(courseId)
        );
        const futureTermsNeeded = estimateTermsNeeded(
          remainingAfterAdd,
          courseMap,
          completedAfterAdd,
          completedUnits + projectedUnits,
          maxUnits
        );
        const overshoot = Math.max(0, projectedUnits - targetUnits);
        const gap = Math.abs(targetUnits - projectedUnits);
        const score = priority(
          id,
          termIdx,
          scheduled,
          completedUnits,
          shortestFeasibleHorizon
        );
        const mustTake =
          minTermsToTakeCourse(
            id,
            courseMap,
            scheduled,
            completedUnits,
            maxUnits
          ) >= shortestFeasibleHorizon
            ? 1
            : 0;

        const candidate = {
          bundle,
          projectedUnits,
          futureTermsNeeded,
          overshoot,
          gap,
          score,
          mustTake,
        };

        if (
          !bestCandidate ||
          candidate.futureTermsNeeded < bestCandidate.futureTermsNeeded ||
          (candidate.futureTermsNeeded === bestCandidate.futureTermsNeeded &&
            candidate.mustTake > bestCandidate.mustTake) ||
          (candidate.futureTermsNeeded === bestCandidate.futureTermsNeeded &&
            candidate.mustTake === bestCandidate.mustTake &&
            candidate.overshoot < bestCandidate.overshoot) ||
          (candidate.futureTermsNeeded === bestCandidate.futureTermsNeeded &&
            candidate.mustTake === bestCandidate.mustTake &&
            candidate.overshoot === bestCandidate.overshoot &&
            candidate.gap < bestCandidate.gap) ||
          (candidate.futureTermsNeeded === bestCandidate.futureTermsNeeded &&
            candidate.mustTake === bestCandidate.mustTake &&
            candidate.overshoot === bestCandidate.overshoot &&
            candidate.gap === bestCandidate.gap &&
            candidate.score > bestCandidate.score)
        ) {
          bestCandidate = candidate;
        }
      }

      if (!bestCandidate) break;

      for (const id of bestCandidate.bundle) {
        if (!addedThisSemester.has(id)) {
          semesterCourses.push(id);
          addedThisSemester.add(id);
        }
      }
      units = bestCandidate.projectedUnits;
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
      completedUnits += courseMap.get(id)?.units ?? 0;
    }

    // If all courses are scheduled, stop adding semesters
    if (unscheduled.size === 0) break;
  }

  const compactedSemesters = compactSemestersLeft({
    semesters,
    courses,
    completedCourses: input.completedCourses,
    courseMap,
    maxUnitsPerSemester: maxUnits,
  });
  const rebalancedSemesters = rebalanceSemesterLoads({
    semesters: compactedSemesters,
    courses,
    completedCourses: input.completedCourses,
    courseMap,
    maxUnitsPerSemester: maxUnits,
    minUnitsPerSemester: minUnits,
  });
  refreshSemesterTotals(rebalancedSemesters, courseMap, minUnits);

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
        !course.prerequisites_or.every((group) =>
          group.some((p) => scheduled.has(p) || completedSet.has(p))
        );
      const missingStanding =
        (course.minUnitsCompleted ?? 0) > completedUnits
          ? course.minUnitsCompleted
          : null;

      const reasons: string[] = [];
      if (missingPrereqs.length > 0) {
        reasons.push(`prerequisites not met: ${missingPrereqs.join(", ")}`);
      }
      if (unmetOrPrereqs) {
        reasons.push(`OR prerequisites not satisfied`);
      }
      if (missingStanding !== null) {
        reasons.push(`requires ${missingStanding} completed units`);
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
  for (const sem of rebalancedSemesters) {
    if (sem.courses.length > 0 && sem.total_units < minUnitsCheck) {
      allWarnings.push(
        `${sem.term}: ${sem.total_units} units is below the minimum of ${minUnitsCheck} — you may lose full-time status.`
      );
    }
  }

  const allReqMet = unscheduled.size === 0;

  return {
    semesters: rebalancedSemesters,
    validation: {
      all_requirements_met: allReqMet,
      graduation_on_target: allReqMet,
      errors,
      warnings: allWarnings,
    },
  };
}
