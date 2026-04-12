"use client";

import { useState, useEffect } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { useCourseStore } from "@/stores/courseStore";
import { TRACKS, GENERAL_ELECTIVES_COUNT } from "@/lib/trackRequirements";

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
    const track = TRACKS.find((t) => t.id === trackId);
    if (!track) return;
    if (selectedTrack === trackId) return;

    // Build set of courses belonging to the focus area requirement group
    const focusAreaCourses = new Set<string>(
      major.requirements
        .filter((r) => r.name.toLowerCase().includes("focus"))
        .flatMap((r) => r.courses)
    );

    // Remove any courses that belong to the previously selected track
    const oldTrack = TRACKS.find((t) => t.id === selectedTrack);
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

    // Build a set of courses that appear in OTHER tracks (required or elective)
    // so we can deprioritize shared courses and prefer track-unique ones.
    const otherTrackCourses = new Set<string>();
    for (const t of TRACKS) {
      if (t.id === trackId) continue;
      for (const id of t.required ?? []) otherTrackCourses.add(id);
      for (const id of t.electives) otherTrackCourses.add(id);
    }

    // Sort electives: unique-to-this-track first, shared courses last
    const sortedElectives = [...track.electives].sort((a, b) => {
      const aShared = otherTrackCourses.has(a) ? 1 : 0;
      const bShared = otherTrackCourses.has(b) ? 1 : 0;
      return aShared - bShared;
    });

    // Add track's required course(s) + enough electives to fill 4 for Focus Area
    const required = track.required ?? [];
    const electivesToFill = Math.max(0, 4 - required.length);
    const focusElectives = sortedElectives.slice(0, electivesToFill);
    const focusCourses = [...required, ...focusElectives];

    // Also auto-select general electives (2 courses):
    // 1. Remaining track-UNIQUE electives (not shared with other tracks)
    // 2. Neutral courses (not in ANY track — truly general upper-div)
    // 3. Shared track courses only as last resort
    const focusSet = new Set(focusCourses);
    const remainingTrackElectives = sortedElectives.filter(
      (id) => !focusSet.has(id)
    );
    const generalElectiveReq = major.requirements.find(
      (r) => r.name === "General Electives (6 units)"
    );
    const generalElectiveOptions = generalElectiveReq?.courses ?? [];

    // Build set of ALL courses across every track
    const allTrackCourses = new Set<string>();
    for (const t of TRACKS) {
      for (const id of t.required ?? []) allTrackCourses.add(id);
      for (const id of t.electives) allTrackCourses.add(id);
    }

    const generalPicks: string[] = [];
    // 1. Remaining track-unique electives
    for (const id of remainingTrackElectives) {
      if (generalPicks.length >= GENERAL_ELECTIVES_COUNT) break;
      if (!otherTrackCourses.has(id) && generalElectiveOptions.includes(id)) {
        generalPicks.push(id);
      }
    }
    // 2. Neutral courses — not in any track at all
    if (generalPicks.length < GENERAL_ELECTIVES_COUNT) {
      const usedSet = new Set([...focusCourses, ...generalPicks]);
      for (const id of generalElectiveOptions) {
        if (generalPicks.length >= GENERAL_ELECTIVES_COUNT) break;
        if (!usedSet.has(id) && !allTrackCourses.has(id)) generalPicks.push(id);
      }
    }
    // 3. Shared track courses as last resort
    if (generalPicks.length < GENERAL_ELECTIVES_COUNT) {
      const usedSet = new Set([...focusCourses, ...generalPicks]);
      for (const id of generalElectiveOptions) {
        if (generalPicks.length >= GENERAL_ELECTIVES_COUNT) break;
        if (!usedSet.has(id)) generalPicks.push(id);
      }
    }

    const toAdd = [...focusCourses, ...generalPicks].filter(
      (id) => !current.includes(id)
    );
    setSelectedElectives([...current, ...toAdd]);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-mono text-zinc-500 mr-1">Track:</span>
      {!activeTrack && (
        <span className="rounded-full border border-amber-800/50 bg-amber-950/20 px-2 py-1 text-[10px] font-mono text-amber-300">
          Required
        </span>
      )}
      {TRACKS.map((track) => {
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
    </div>
  );
}
