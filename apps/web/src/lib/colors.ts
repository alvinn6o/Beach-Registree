export const categoryColors: Record<string, { color: string; bg: string; border: string; label: string }> = {
  math: {
    color: "#f97316",
    bg: "#431407",
    border: "#9a3412",
    label: "Math",
  },
  core: {
    color: "#60a5fa",
    bg: "#172554",
    border: "#1e40af",
    label: "CS Core",
  },
  upper: {
    color: "#facc15",
    bg: "#422006",
    border: "#a16207",
    label: "Upper Division",
  },
  elective: {
    color: "#a78bfa",
    bg: "#1e1b4b",
    border: "#4338ca",
    label: "Electives",
  },
  capstone: {
    color: "#f472b6",
    bg: "#4a0d29",
    border: "#9d174d",
    label: "Capstone",
  },
  ge: {
    color: "#94a3b8",
    bg: "#1e293b",
    border: "#475569",
    label: "General Ed",
  },
  "ge-upper": {
    color: "#e879f9",
    bg: "#3b0764",
    border: "#7e22ce",
    label: "Upper GE",
  },
  support: {
    color: "#2dd4bf",
    bg: "#042f2e",
    border: "#0f766e",
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
