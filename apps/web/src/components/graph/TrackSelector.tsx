"use client";

import { useState, useEffect } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import tracksData from "../../../../../data/csulb/cs_bs_tracks.json";

interface Track {
  id: string;
  name: string;
  description: string;
  color: string;
  required?: string[];
  electives: string[];
}

const tracks = tracksData as Track[];

export default function TrackSelector() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedTrack = useProgressStore((s) => s.selectedTrack);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const setSelectedTrack = useProgressStore((s) => s.setSelectedTrack);
  const setSelectedElectives = useProgressStore((s) => s.setSelectedElectives);
  const major = useCourseStore((s) => s.major);

  // Use null on SSR to avoid hydration mismatch with localStorage-persisted state
  const activeTrack = mounted ? selectedTrack : null;

  function handleSelect(trackId: string) {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    // Build set of courses belonging to the focus area requirement group
    const focusAreaCourses = new Set<string>(
      major.requirements
        .filter((r) => r.name.toLowerCase().includes("focus"))
        .flatMap((r) => r.courses)
    );

    if (selectedTrack === trackId) {
      // Deselect: remove this track's courses from selectedElectives
      const trackCourses = new Set([
        ...(track.required ?? []),
        ...track.electives,
      ]);
      setSelectedElectives(
        selectedElectives.filter((id) => !trackCourses.has(id))
      );
      setSelectedTrack(null);
      return;
    }

    // Remove any courses that belong to the previously selected track
    const oldTrack = tracks.find((t) => t.id === selectedTrack);
    let current = [...selectedElectives];
    if (oldTrack) {
      const oldCourses = new Set([
        ...(oldTrack.required ?? []),
        ...oldTrack.electives,
      ]);
      current = current.filter((id) => !oldCourses.has(id));
    }

    // Also remove any focus-area courses not in the new track (clean slate for focus area)
    current = current.filter((id) => !focusAreaCourses.has(id));

    setSelectedTrack(trackId);

    // Add track's required course(s) + enough electives to fill 4 for Focus Area
    const required = track.required ?? [];
    const electivesToFill = Math.max(0, 4 - required.length);
    const electives = track.electives.slice(0, electivesToFill);
    const toAdd = [...required, ...electives].filter(
      (id) => !current.includes(id)
    );
    setSelectedElectives([...current, ...toAdd]);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-mono text-zinc-500 mr-1">Track:</span>
      {tracks.map((track) => {
        const isActive = activeTrack === track.id;
        return (
          <button
            key={track.id}
            onClick={() => handleSelect(track.id)}
            title={track.description}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isActive
                ? "text-white shadow-sm"
                : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
            }`}
            style={
              isActive
                ? { backgroundColor: track.color, borderColor: track.color }
                : undefined
            }
          >
            {track.name}
          </button>
        );
      })}
      {activeTrack && (
        <button
          onClick={() => setSelectedTrack(null)}
          className="px-1.5 py-1 text-zinc-500 hover:text-zinc-300 text-xs"
          title="Clear track"
        >
          ×
        </button>
      )}
    </div>
  );
}
