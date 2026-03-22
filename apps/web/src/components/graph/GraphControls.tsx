"use client";

import { useState } from "react";
import { useCourseStore } from "@/stores/courseStore";

interface GraphControlsProps {
  onSelectCourse: (id: string | null) => void;
}

export default function GraphControls({ onSelectCourse }: GraphControlsProps) {
  const [search, setSearch] = useState("");
  const courses = useCourseStore((s) => s.courses);

  const filtered =
    search.length > 0
      ? courses.filter(
          (c) =>
            c.id.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search courses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-64 px-3 py-2 bg-beach-card border border-beach-border rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
      />
      {filtered.length > 0 && search.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-beach-card border border-beach-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          {filtered.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelectCourse(c.id);
                setSearch("");
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2"
            >
              <span className="font-mono text-zinc-300">{c.id}</span>
              <span className="text-zinc-500 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
