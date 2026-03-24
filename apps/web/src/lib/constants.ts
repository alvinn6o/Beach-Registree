export const NODE_W = 146;
export const NODE_H = 54;
export const LAYER_GAP = 110;
export const NODE_GAP = 16;
export const ROW_GAP = 12;
export const TOP_PAD = 70;
export const LEFT_PAD = 50;
export const MAX_PER_ROW = 8;

export const LAYER_LABELS = [
  "Lower Division — Entry",
  "Lower Division",
  "Lower Division — Advanced",
  "Upper Division — Core",
  "Upper Division",
  "Upper Division — Advanced",
  "Upper Division — Electives",
  "Capstone",
  "Layer 8",
  "Layer 9",
];

// Layer index where upper division starts (used for visual divider)
export const UPPER_DIV_START_LAYER = 3;

export const DEFAULT_UNITS = 15;
export const MIN_UNITS = 12;
export const MAX_UNITS = 21;
export const MIN_UNITS_PER_SEM = 12;

export const MAJOR_CATEGORIES = new Set(["math", "core", "upper", "elective", "capstone"]);
export const ALL_CATEGORIES = new Set(["math", "core", "upper", "elective", "capstone", "ge", "ge-upper", "support"]);
