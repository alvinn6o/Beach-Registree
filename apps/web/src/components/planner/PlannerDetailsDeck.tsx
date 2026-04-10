"use client";

import { useEffect, useMemo, useState } from "react";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { buildBlockedCourseRecoverySuggestions } from "@/lib/planner";
import { getTrackAwareMajorRequirements } from "@/lib/trackRequirements";
import TransferAssumptionsPanel from "./TransferAssumptionsPanel";
import RecoveryPanel from "./RecoveryPanel";
import PlanInsightsPanel from "./PlanInsightsPanel";

type DetailKey = "recovery" | "transfer" | "insights";

const DETAIL_LABELS: Record<DetailKey, string> = {
  recovery: "Recovery",
  transfer: "Transfer",
  insights: "Rationale",
};

export default function PlannerDetailsDeck() {
  const [expanded, setExpanded] = useState(false);
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const completed = useProgressStore((state) => state.completed);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const selectedTrack = useProgressStore((state) => state.selectedTrack);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const isTransferStudent = useProgressStore((state) => state.isTransferStudent);
  const trackMajor = getTrackAwareMajorRequirements(major, selectedTrack);

  const recoveryCount = useMemo(() => {
    if (!plan) return 0;
    return buildBlockedCourseRecoverySuggestions(
      plan.semesters,
      courses,
      [...completed],
      trackMajor,
      selectedElectives,
      preferredUnits
    ).length;
  }, [completed, courses, plan, preferredUnits, selectedElectives, trackMajor]);

  const availableSections = useMemo(() => {
    const sections: DetailKey[] = [];
    if (recoveryCount > 0) sections.push("recovery");
    if (isTransferStudent) sections.push("transfer");
    if (plan) {
      sections.push("insights");
    }
    return sections;
  }, [isTransferStudent, plan, recoveryCount]);

  const [activeSection, setActiveSection] = useState<DetailKey>("insights");

  useEffect(() => {
    if (availableSections.length === 0) return;
    if (!availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0]);
    }
  }, [activeSection, availableSections]);

  if (availableSections.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setExpanded((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
            expanded
              ? "border-zinc-500 bg-zinc-950 text-zinc-100"
              : "border-beach-border bg-beach-card/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          }`}
        >
          <span className={`text-[10px] font-mono transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▶
          </span>
          More Details
        </button>

        {expanded && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {availableSections.map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activeSection === section
                      ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                      : "border-beach-border bg-beach-card/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {DETAIL_LABELS[section]}
                  {section === "recovery" && recoveryCount > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">{recoveryCount}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="w-full rounded-[28px] border border-beach-border/70 bg-gradient-to-br from-beach-card/70 to-beach-card/30 shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
              {activeSection === "recovery" && <RecoveryPanel embedded />}
              {activeSection === "transfer" && <TransferAssumptionsPanel embedded />}
              {activeSection === "insights" && <PlanInsightsPanel embedded />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
