"use client";

import { useState } from "react";
import { useProgressStore } from "@/stores/progressStore";

const LOWER_GE = [
  "GE-A1", "GE-A2",
  "GE-C1", "GE-C2",
  "GE-D1", "GE-D2",
  "GE-F",
];

const UPPER_GE = ["GE-UD-D"];

const LOWER_DIV_CORE = [
  "CECS 105", "CECS 174", "CECS 225", "CECS 228", "CECS 229",
  "CECS 274", "CECS 277", "ENGR 101", "ENGR 102",
  "MATH 122", "MATH 123",
];

const SCIENCE = ["PHYS 151", "CHEM 111A", "BIOL Elective"];

type GroupKey = "lowerGE" | "upperGE" | "lowerCore" | "science";

const GROUPS: { key: GroupKey; label: string; ids: string[] }[] = [
  { key: "lowerGE", label: "Lower GE", ids: LOWER_GE },
  { key: "upperGE", label: "Upper GE", ids: UPPER_GE },
  { key: "lowerCore", label: "Lower Core", ids: LOWER_DIV_CORE },
  { key: "science", label: "Science", ids: SCIENCE },
];

export default function DevTools() {
  const completed = useProgressStore((s) => s.completed);
  const setCompleted = useProgressStore((s) => s.setCompleted);
  const [snapshot, setSnapshot] = useState<string[] | null>(null);

  const saveSnapshot = () => {
    setSnapshot([...completed]);
  };

  const handleReset = () => {
    saveSnapshot();
    setCompleted([]);
  };

  const handleUndo = () => {
    if (snapshot) {
      setCompleted(snapshot);
      setSnapshot(null);
    }
  };

  const toggleGroup = (ids: string[]) => {
    saveSnapshot();
    const allDone = ids.every((id) => completed.has(id));
    const next = new Set(completed);
    if (allDone) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    setCompleted([...next]);
  };

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-mono text-yellow-600 uppercase tracking-widest mr-1">DEV</span>

      {GROUPS.map(({ key, label, ids }) => {
        const allDone = ids.every((id) => completed.has(id));
        return (
          <button
            key={key}
            onClick={() => toggleGroup(ids)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
              allDone
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/60"
                : "bg-zinc-900/40 text-zinc-500 border-zinc-800/50 hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {allDone ? "✓ " : ""}{label}
          </button>
        );
      })}

      <div className="w-px h-4 bg-zinc-800 mx-0.5" />

      <button
        onClick={handleReset}
        className="px-2 py-1 rounded text-[10px] font-mono bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-950/60 transition-colors"
      >
        Reset All
      </button>
      <button
        onClick={handleUndo}
        disabled={!snapshot}
        className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
          snapshot
            ? "bg-yellow-950/40 text-yellow-400 border-yellow-900/50 hover:bg-yellow-950/60"
            : "bg-zinc-900/30 text-zinc-700 border-zinc-800/50 cursor-not-allowed"
        }`}
      >
        Undo
      </button>
      <span className="text-[9px] font-mono text-zinc-700 ml-1">
        {completed.size}
      </span>
    </div>
  );
}
