import type { MajorRequirements } from "./types";

export interface ResolvedRequirements {
  allRequired: string[];
  byRequirement: Record<string, string[]>;
}

export interface ResolveRequirementOptions {
  fillDefaultsForChoose?: boolean;
}

export function resolveRequirementCourses(
  majorRequirements: MajorRequirements,
  candidateIds: string[],
  validCourseIds?: Set<string>,
  options: ResolveRequirementOptions = {}
): ResolvedRequirements {
  const uniqueCandidateIds = [...new Set(candidateIds)];
  const allRequired: string[] = [];
  const byRequirement: Record<string, string[]> = {};
  const usedChooseCourses = new Set<string>();
  const fillDefaultsForChoose = options.fillDefaultsForChoose ?? true;

  for (const req of majorRequirements.requirements) {
    if (req.type === "all") {
      byRequirement[req.name] = [...req.courses];
      allRequired.push(...req.courses);
      continue;
    }

    const requested = req.count ?? 0;
    const selected = uniqueCandidateIds.filter(
      (id) =>
        req.courses.includes(id) &&
        !usedChooseCourses.has(id) &&
        (!validCourseIds || validCourseIds.has(id))
    );
    const chosen = selected.slice(0, requested);

    if (fillDefaultsForChoose && chosen.length < requested) {
      const defaults = req.courses.filter(
        (id) =>
          !usedChooseCourses.has(id) &&
          !chosen.includes(id) &&
          (!validCourseIds || validCourseIds.has(id))
      );
      chosen.push(...defaults.slice(0, requested - chosen.length));
    }

    for (const id of chosen) {
      usedChooseCourses.add(id);
      allRequired.push(id);
    }
    byRequirement[req.name] = chosen;
  }

  return { allRequired, byRequirement };
}
