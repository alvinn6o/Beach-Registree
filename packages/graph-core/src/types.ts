export interface Course {
  id: string;
  name: string;
  units: number;
  description: string;
  prerequisites: string[];
  prerequisites_or: string[][];
  corequisites: string[];
  semester_offered: "F" | "S" | "F/S";
  category: "math" | "core" | "upper" | "elective" | "capstone" | "ge" | "ge-upper" | "support";
  min_grade: string;
  notes: string;
}

export type CourseStatus = "completed" | "available" | "locked";

export type ViewMode = "major" | "all";

export interface Edge {
  source: string;
  target: string;
}

export interface MajorRequirement {
  name: string;
  type: "all" | "choose";
  count?: number;
  courses: string[];
}

export interface MajorRequirements {
  id: string;
  name: string;
  department: string;
  catalog_year: string;
  total_units_required: number;
  requirements: MajorRequirement[];
}

export const MAJOR_ONLY_CATEGORIES = ["math", "core", "upper", "elective", "capstone"] as const;
export const ALL_CATEGORIES = ["math", "core", "upper", "elective", "capstone", "ge", "ge-upper", "support"] as const;

export interface SchedulerInput {
  completedCourses: string[];
  majorRequirements: MajorRequirements;
  selectedElectives: string[];
  currentSemester: string;
  targetGraduation: string;
  unitsPerSemester: number;
  minUnitsPerSemester?: number;
  viewMode?: "major" | "all";
  firstYearCourses?: string[];
}

export interface SemesterPlan {
  term: string;
  courses: string[];
  total_units: number;
  warnings: string[];
}

export interface PlanResult {
  semesters: SemesterPlan[];
  validation: {
    all_requirements_met: boolean;
    graduation_on_target: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface UserProgress {
  major: string;
  catalog_year: string;
  target_graduation: string;
  completed_courses: string[];
  planned_electives: string[];
  preferred_units: number;
}
