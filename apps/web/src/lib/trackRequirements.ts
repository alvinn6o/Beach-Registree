"use client";

import {
  assessPlanHealth,
  resolveRequirementCourses,
  type Course,
  type MajorRequirements,
  type PlanHealthIssue,
  type PlanHealthReport,
  type PlanResult,
  type ResolveRequirementOptions,
} from "graph-core";
import tracksData from "../../../../data/csulb/cs_bs_tracks.json";

export interface TrackDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  required?: string[];
  electives: string[];
}

export const TRACK_REQUIREMENT_NAME = "Focus Area (12 units)";
export const TRACK_COURSE_COUNT = 4;
export const TRACK_SELECTION_MESSAGE =
  "Select a focus-area track before generating or validating a plan.";

export const TRACKS = tracksData as TrackDefinition[];

export function getTrackById(trackId: string | null | undefined): TrackDefinition | null {
  if (!trackId) return null;
  return TRACKS.find((track) => track.id === trackId) ?? null;
}

export function getTrackLabel(trackId: string | null | undefined): string | null {
  return getTrackById(trackId)?.name ?? null;
}

export function getTrackCourses(trackId: string | null | undefined): string[] {
  const track = getTrackById(trackId);
  if (!track) return [];
  return [...(track.required ?? []), ...track.electives];
}

export function getTrackAwareMajorRequirements(
  major: MajorRequirements,
  trackId: string | null | undefined
): MajorRequirements {
  const trackCourses = getTrackCourses(trackId);

  return {
    ...major,
    requirements: major.requirements.map((requirement) => {
      if (requirement.name !== TRACK_REQUIREMENT_NAME) return requirement;
      return {
        ...requirement,
        count: TRACK_COURSE_COUNT,
        courses: trackCourses,
      };
    }),
  };
}

export function resolveTrackAwareRequirementCourses(
  major: MajorRequirements,
  trackId: string | null | undefined,
  candidateIds: string[],
  validCourseIds?: Set<string>,
  options?: ResolveRequirementOptions
) {
  return resolveRequirementCourses(
    getTrackAwareMajorRequirements(major, trackId),
    candidateIds,
    validCourseIds,
    options
  );
}

function getTrackSelectionIssue(): PlanHealthIssue {
  return {
    severity: "hard",
    code: "track",
    message: "A focus-area track is required: Machine Learning & AI, Cybersecurity, or Software Development.",
    fix: "Choose one track so the 12-unit focus area can be resolved correctly.",
  };
}

export function assessTrackAwarePlanHealth(params: {
  courses: Course[];
  plan: PlanResult;
  completedCourseIds: string[];
  majorRequirements: MajorRequirements;
  selectedElectives: string[];
  selectedTrack: string | null;
  preferredUnits: number;
  minUnitsPerSemester: number;
}): PlanHealthReport {
  const report = assessPlanHealth({
    courses: params.courses,
    plan: params.plan,
    completedCourseIds: params.completedCourseIds,
    majorRequirements: getTrackAwareMajorRequirements(
      params.majorRequirements,
      params.selectedTrack
    ),
    selectedElectives: params.selectedElectives,
    preferredUnits: params.preferredUnits,
    minUnitsPerSemester: params.minUnitsPerSemester,
  });

  if (params.selectedTrack) return report;

  return {
    ...report,
    status: "blocked",
    summary: TRACK_SELECTION_MESSAGE,
    hardIssueCount: report.hardIssueCount + 1,
    issues: [getTrackSelectionIssue(), ...report.issues],
  };
}
