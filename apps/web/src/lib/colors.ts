export const categoryColors: Record<string, { color: string; bg: string; border: string; label: string }> = {
  math: {
    color: "#fb923c",
    bg: "#2e1407",
    border: "#c2410c",
    label: "Math",
  },
  core: {
    color: "#38bdf8",
    bg: "#08263a",
    border: "#0284c7",
    label: "CS Core",
  },
  upper: {
    color: "#fde68a",
    bg: "#332205",
    border: "#d97706",
    label: "Upper Division",
  },
  elective: {
    color: "#c084fc",
    bg: "#251138",
    border: "#9333ea",
    label: "Electives",
  },
  capstone: {
    color: "#fb7185",
    bg: "#3b1019",
    border: "#e11d48",
    label: "Capstone",
  },
  ge: {
    color: "#cbd5e1",
    bg: "#1b2431",
    border: "#64748b",
    label: "General Ed",
  },
  "ge-upper": {
    color: "#f9a8d4",
    bg: "#341326",
    border: "#db2777",
    label: "Upper GE",
  },
  support: {
    color: "#34d399",
    bg: "#0b2d23",
    border: "#059669",
    label: "Support",
  },
};

export const statusColors = {
  completed: { fill: "#166534", border: "#22c55e", text: "#bbf7d0" },
  planned: { fill: "#422006", border: "#eab308", text: "#fef08a" },
  available: { fill: "#1e3a5f", border: "#3b82f6", text: "#bfdbfe" },
  locked: { fill: "#27272a", border: "#3f3f46", text: "#71717a" },
} as const;

// Semantic highlight colors used in the graph canvas
export const graphColors = {
  // Edge / node highlight when tracing prerequisite path (amber)
  highlight: "#fbbf24",
  // Edge / node highlight for downstream courses (blue)
  downstream: "#60a5fa",
  // Default (dim) edge color
  edgeDefault: "#2a2d3a",
  // Completed node background and secondary text
  completedBg: "#0f2918",
  completedSubtext: "#6ee7b7",
  // Planned node background and secondary text (bright yellow)
  plannedBg: "#1a1700",
  plannedSubtext: "#fde047",
  // Canvas background gradient stops
  bgTop: "#0c0e14",
  bgBottom: "#111320",
  // Units badge background
  badgeBg: "#111320",
} as const;
