"use client";

import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import TrackSelector from "@/components/graph/TrackSelector";
import DevTools from "@/components/shared/DevTools";
import Link from "next/link";
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

const CATEGORY_LABELS: Record<string, string> = {
  math: "Math",
  core: "CS Core",
  upper: "Upper Division",
  elective: "Elective",
  capstone: "Capstone",
  ge: "General Ed",
  "ge-upper": "Upper GE",
  support: "Support",
};

type CourseStatus = "completed" | "planned" | "needed";

export default function ChecklistPage() {
  const courses = useCourseStore((s) => s.courses);
  const allCourses = useCourseStore((s) => s.allCourses);
  const major = useCourseStore((s) => s.major);
  const completed = useProgressStore((s) => s.completed);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const selectedTrack = useProgressStore((s) => s.selectedTrack);
  const toggleElective = useProgressStore((s) => s.toggleElective);
  const plan = usePlannerStore((s) => s.plan);

  const activeTrack = selectedTrack ? tracks.find((t) => t.id === selectedTrack) : null;
  const trackCourseSet = activeTrack
    ? new Set([...(activeTrack.required ?? []), ...activeTrack.electives])
    : null;

  const plannedIds = new Set(plan?.semesters.flatMap((s) => s.courses) ?? []);

  function getCourseStatus(courseId: string): CourseStatus {
    if (completed.has(courseId)) return "completed";
    if (plannedIds.has(courseId)) return "planned";
    return "needed";
  }

  interface Row {
    id: string;
    name: string;
    units: number;
    category: string;
    requirementGroup: string;
    status: CourseStatus;
    semesterOffered: string;
  }

  const rows: Row[] = [];

  for (const req of major.requirements) {
    let courseIds: string[];
    if (req.type === "choose") {
      // Merge: selected electives + completed + planned from this group
      const fromElectives = selectedElectives.filter((id) => req.courses.includes(id));
      const fromCompleted = req.courses.filter((id) => completed.has(id));
      const fromPlanned = req.courses.filter((id) => plannedIds.has(id));
      const merged = [...new Set([...fromElectives, ...fromCompleted, ...fromPlanned])];
      // Fallback: if nothing selected/completed/planned, show first N defaults
      courseIds = merged.length > 0 ? merged : req.courses.slice(0, req.count ?? req.courses.length);
    } else {
      courseIds = req.courses;
    }

    for (const id of courseIds) {
      const course = allCourses.find((c) => c.id === id);
      if (!course) continue;
      rows.push({
        id: course.id,
        name: course.name,
        units: course.units,
        category: course.category,
        requirementGroup: req.name,
        status: getCourseStatus(course.id),
        semesterOffered: course.semester_offered,
      });
    }
  }

  const completedCount = rows.filter((r) => r.status === "completed").length;
  const plannedCount = rows.filter((r) => r.status === "planned").length;
  const neededCount = rows.filter((r) => r.status === "needed").length;
  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);
  const completedUnits = rows.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.units, 0);
  const plannedUnits = rows.filter((r) => r.status === "planned").reduce((sum, r) => sum + r.units, 0);

  const groups = major.requirements.map((req) => ({
    name: req.name,
    type: req.type,
    count: req.count,
    courses: req.courses, // all options in this group
    rows: rows.filter((r) => r.requirementGroup === req.name),
  }));

  // Progress based on requirement group satisfaction (not just units)
  // Each group contributes proportionally: completed_in_group / needed_in_group
  let reqProgress = 0;
  let reqTotal = 0;
  for (const req of major.requirements) {
    if (req.type === "all") {
      reqTotal += req.courses.length;
      reqProgress += req.courses.filter((id) => completed.has(id)).length;
    } else if (req.type === "choose" && req.count) {
      reqTotal += req.count;
      reqProgress += Math.min(req.count, req.courses.filter((id) => completed.has(id)).length);
    }
  }
  const pct = reqTotal > 0 ? Math.round((reqProgress / reqTotal) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-beach-dark">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-beach-border glass">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-base font-display text-zinc-200 group-hover:text-zinc-50 transition-colors">
              Beach RegisTree
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 bg-beach-dark/50 rounded-lg p-0.5">
            {[
              { href: "/graph", label: "Prerequisite Map", active: false },
              { href: "/planner", label: "Plan My Degree", active: false },
              { href: "/checklist", label: "Checklist", active: true },
            ].map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <TrackSelector />
          <div className="w-px h-5 bg-beach-border" />
          <DevTools />
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            {major.catalog_year} Catalog
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Completed", value: completedCount, sub: `${completedUnits}u`, color: "text-emerald-400" },
              { label: "Planned", value: plannedCount, sub: `${plannedUnits}u`, color: "text-blue-400" },
              { label: "Needed", value: neededCount, sub: `${totalUnits - completedUnits - plannedUnits}u`, color: "text-red-400" },
              { label: "Total", value: rows.length, sub: `${totalUnits}u`, color: "text-zinc-300" },
            ].map((stat) => (
              <div key={stat.label} className="bg-beach-card border border-beach-border rounded-xl p-4">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-semibold ${stat.color} font-mono`}>{stat.value}</p>
                <p className="text-[10px] text-zinc-700 font-mono">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-[10px] font-mono text-zinc-600 mb-2">
              <span>Degree progress</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(completedUnits / totalUnits) * 100}%` }} />
              <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(plannedUnits / totalUnits) * 100}%` }} />
            </div>
            <div className="flex gap-5 mt-2 text-[10px] font-mono text-zinc-600">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Done</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Planned</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />Remaining</span>
            </div>
          </div>

          {/* Requirement groups */}
          {groups.map((group) => {
            const selectedCount = group.rows.length;
            const completedInGroup = group.rows.filter((r) => r.status === "completed").length;
            const plannedInGroup = group.rows.filter((r) => r.status === "planned").length;
            const isChoose = group.type === "choose";
            const needed = group.count ?? 0;
            // For choose groups: is the requirement satisfied (enough planned + completed)?
            const chooseGroupSatisfied = isChoose && needed > 0 && (completedInGroup + plannedInGroup) >= needed;

            return (
              <div key={group.name} className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider">{group.name}</h2>
                  {isChoose && needed > 0 && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      chooseGroupSatisfied
                        ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/30"
                        : "text-zinc-600 bg-zinc-900"
                    }`}>
                      {chooseGroupSatisfied ? `✓ ${needed} chosen` : `choose ${needed}`}
                    </span>
                  )}
                  {/* Show active track badge on focus area */}
                  {isChoose && group.name.toLowerCase().includes("focus") && activeTrack && (
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: activeTrack.color }}
                    >
                      {activeTrack.name}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-700 font-mono ml-auto">
                    {completedInGroup}/{isChoose ? needed : group.rows.length}
                  </span>
                </div>

                {/* For "choose" groups: show all available options as selectable pills */}
                {isChoose && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {(() => {
                      // Sort: track courses first when a track is active on focus area groups
                      const isFocusGroup = group.name.toLowerCase().includes("focus");
                      const sortedCourses = isFocusGroup && trackCourseSet
                        ? [...group.courses].sort((a, b) => {
                            const aIn = trackCourseSet.has(a) ? 0 : 1;
                            const bIn = trackCourseSet.has(b) ? 0 : 1;
                            return aIn - bIn;
                          })
                        : group.courses;

                      return sortedCourses.map((courseId) => {
                        const course = allCourses.find((c) => c.id === courseId);
                        if (!course) return null;
                        const isSelected = selectedElectives.includes(courseId);
                        const isDone = completed.has(courseId);
                        const isPlanned = plannedIds.has(courseId);
                        const isInTrack = isFocusGroup && trackCourseSet?.has(courseId);
                        const isTrackRequired = isFocusGroup && activeTrack?.required?.includes(courseId);
                        const isOutsideTrack = isFocusGroup && trackCourseSet && !trackCourseSet.has(courseId);
                        // Fade out unchosen alternatives when group is satisfied
                        const isSatisfiedAlt = chooseGroupSatisfied && !isDone && !isPlanned && !isSelected;
                        return (
                          <button
                            key={courseId}
                            onClick={() => !isDone && toggleElective(courseId)}
                            disabled={isDone}
                            title={`${course.name} (${course.units}u)${isTrackRequired ? " — REQUIRED for track" : isInTrack ? " — track elective" : ""}${isSatisfiedAlt ? " — requirement already satisfied" : ""}`}
                            className={`px-2 py-1 rounded text-[11px] font-mono transition-all border ${
                              isDone
                                ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50 cursor-default"
                                : isSelected
                                ? "bg-blue-900/30 text-blue-300 border-blue-700/50 hover:bg-blue-900/50"
                                : isSatisfiedAlt
                                ? "bg-zinc-900/20 text-zinc-800 border-zinc-800/20 opacity-40"
                                : isOutsideTrack
                                ? "bg-zinc-900/30 text-zinc-700 border-zinc-800/30 hover:text-zinc-500 hover:border-zinc-700 opacity-50"
                                : "bg-zinc-900/50 text-zinc-500 border-zinc-800/50 hover:text-zinc-300 hover:border-zinc-600"
                            }`}
                          >
                            {isDone ? "✓ " : isSelected ? "● " : "○ "}
                            {courseId}
                            {isTrackRequired && <span className="text-[8px] ml-1 text-amber-400">REQ</span>}
                            <span className="text-[9px] ml-1 opacity-60">{course.units}u</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* No rows selected — show placeholder */}
                {group.rows.length === 0 ? (
                  <div className="border border-beach-border/50 rounded-xl px-4 py-3 text-[11px] font-mono text-zinc-600">
                    {isChoose
                      ? `Select ${needed} course${needed !== 1 ? "s" : ""} above — they will appear here`
                      : "No courses to display"}
                  </div>
                ) : (
                  <div className="border border-beach-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-beach-card border-b border-beach-border">
                          <th className="text-left px-4 py-2 text-[10px] font-mono text-zinc-600 uppercase tracking-wider w-28">Course</th>
                          <th className="text-left px-4 py-2 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Title</th>
                          <th className="text-left px-4 py-2 text-[10px] font-mono text-zinc-600 uppercase tracking-wider w-12">Units</th>
                          <th className="text-left px-4 py-2 text-[10px] font-mono text-zinc-600 uppercase tracking-wider w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beach-border/50">
                        {group.rows.map((row) => (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              row.status === "completed" ? "bg-emerald-950/5" : row.status === "planned" ? "bg-blue-950/5" : ""
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-300">{row.id}</td>
                            <td className="px-4 py-2.5 text-zinc-400 text-xs">{row.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-600">{row.units}</td>
                            <td className="px-4 py-2.5">
                              {row.status === "completed" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                                  Done
                                </span>
                              )}
                              {row.status === "planned" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-900/30 text-blue-400 border border-blue-800/50">
                                  Planned
                                </span>
                              )}
                              {row.status === "needed" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900/50 text-zinc-600 border border-zinc-800/50">
                                  Needed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
