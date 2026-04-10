"use client";

import { useMemo, useState } from "react";
import { buildStakeholderReportText } from "@/lib/stakeholderReport";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";
import { assessTrackAwarePlanHealth } from "@/lib/trackRequirements";

interface StakeholderReportPanelProps {
  embedded?: boolean;
}

export default function StakeholderReportPanel({ embedded = false }: StakeholderReportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const completed = useProgressStore((state) => state.completed);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const minUnitsPerSemester = useProgressStore((state) => state.minUnitsPerSemester);
  const isTransferStudent = useProgressStore((state) => state.isTransferStudent);
  const selectedTrack = useProgressStore((state) => state.selectedTrack);

  const reportText = useMemo(() => {
    if (!plan) return null;
    const report = assessTrackAwarePlanHealth({
      courses,
      plan,
      completedCourseIds: [...completed],
      majorRequirements: major,
      selectedElectives,
      selectedTrack,
      preferredUnits,
      minUnitsPerSemester,
    });

    return buildStakeholderReportText({
      report,
      plan,
      courses,
      majorName: major.name,
      isTransferStudent,
      selectedTrack,
    });
  }, [
    completed,
    courses,
    isTransferStudent,
    major,
    minUnitsPerSemester,
    plan,
    preferredUnits,
    selectedElectives,
    selectedTrack,
  ]);

  if (!plan || !reportText) return null;
  const reportTextValue = reportText;
  const isExpanded = embedded || expanded;

  async function handleCopy() {
    await navigator.clipboard.writeText(reportTextValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const blob = new Blob([reportTextValue], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "beach-registree-stakeholder-brief.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`${embedded ? "p-5" : "border-b border-beach-border/60 px-4 py-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {!embedded ? (
              <button
                onClick={() => setExpanded((value) => !value)}
                className="flex items-center gap-2 text-left"
              >
                <span className={`text-zinc-600 font-mono text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}>
                  ▶
                </span>
                <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
                  Stakeholder Brief
                </h3>
              </button>
            ) : (
              <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
                Stakeholder Brief
              </h3>
            )}
            <span className="rounded-full border border-beach-border/70 bg-beach-card px-2 py-0.5 text-[10px] font-mono text-zinc-500">
              exportable
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Copy or download a department-head-ready summary of the current draft plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-beach-border bg-beach-card px-3 py-1.5 text-xs font-mono text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {copied ? "Copied" : "Copy Brief"}
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg border border-beach-border bg-beach-card px-3 py-1.5 text-xs font-mono text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Download .md
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 rounded-2xl border border-beach-border/70 bg-beach-card/30 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
            {reportTextValue}
          </pre>
        </div>
      )}
    </div>
  );
}
