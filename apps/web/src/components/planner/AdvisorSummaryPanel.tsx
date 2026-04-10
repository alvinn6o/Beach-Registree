"use client";

import { useMemo, useState } from "react";
import { assessPlanHealth } from "graph-core";
import { useCourseStore } from "@/stores/courseStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";

const STATUS_STYLES = {
  "on-track": {
    badge: "bg-green-900/40 text-green-300 border border-green-500/20",
    border: "border-green-500/15",
  },
  "needs-review": {
    badge: "bg-amber-900/40 text-amber-300 border border-amber-500/20",
    border: "border-amber-500/15",
  },
  blocked: {
    badge: "bg-red-900/40 text-red-300 border border-red-500/20",
    border: "border-red-500/15",
  },
} as const;

const STATUS_LABELS = {
  "on-track": "On Track",
  "needs-review": "Needs Review",
  blocked: "Blocked",
} as const;

function formatStatusNarrative(
  status: keyof typeof STATUS_LABELS,
  activeSemesters: number
): string {
  if (status === "blocked") {
    return "Use this as a prototype/demo artifact, not as a trustworthy advising recommendation yet.";
  }
  if (status === "needs-review") {
    return `The schedule works as a draft across ${activeSemesters} active semesters, but load or timeline tradeoffs still need human review.`;
  }
  return `This is a credible advising draft across ${activeSemesters} active semesters and is strong enough for a planning demo.`;
}

export default function AdvisorSummaryPanel() {
  const [copied, setCopied] = useState(false);
  const plan = usePlannerStore((state) => state.plan);
  const courses = useCourseStore((state) => state.allCourses);
  const major = useCourseStore((state) => state.major);
  const completed = useProgressStore((state) => state.completed);
  const selectedElectives = useProgressStore((state) => state.selectedElectives);
  const preferredUnits = useProgressStore((state) => state.preferredUnits);
  const minUnitsPerSemester = useProgressStore((state) => state.minUnitsPerSemester);

  const report = useMemo(() => {
    if (!plan) return null;
    return assessPlanHealth({
      courses,
      plan,
      completedCourseIds: [...completed],
      majorRequirements: major,
      selectedElectives,
      preferredUnits,
      minUnitsPerSemester,
    });
  }, [
    courses,
    completed,
    major,
    minUnitsPerSemester,
    plan,
    preferredUnits,
    selectedElectives,
  ]);

  if (!plan || !report) return null;

  const reportValue = report;
  const topIssues = report.issues.slice(0, 3);
  const lastTerm = plan.semesters[plan.semesters.length - 1]?.term ?? "N/A";
  const status = reportValue.status;
  const statusStyle = STATUS_STYLES[status];

  async function handleCopy() {
    const lines = [
      "Beach RegisTree summary",
      `Status: ${STATUS_LABELS[status]}`,
      `Summary: ${reportValue.summary}`,
      `Semesters: ${reportValue.totalSemesters} total, ${reportValue.activeSemesters} active, ending ${lastTerm}`,
      `Units: ${reportValue.completedUnits} completed, ${reportValue.plannedUnits} planned, ${reportValue.totalRequiredUnits} minimum required`,
      `Issues: ${reportValue.hardIssueCount} hard, ${reportValue.warningCount} warning`,
      topIssues.length > 0
        ? `Top notes: ${topIssues.map((issue) => issue.message).join(" | ")}`
        : "Top notes: none",
      "Presentation framing: planning/advising support layer for student clarity, not an enterprise registration replacement.",
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`mx-4 mt-4 rounded-[28px] border bg-gradient-to-br from-beach-card/80 to-[#11161d] px-4 py-4 ${statusStyle.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500">
              Snapshot
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${statusStyle.badge}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-300">{reportValue.summary}</p>
        </div>

        <button
          onClick={handleCopy}
          className="rounded-lg border border-beach-border bg-beach-card px-3 py-1.5 text-xs font-mono text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {copied ? "Copied" : "Copy summary"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-beach-border bg-beach-card/70 px-3 py-1.5 text-xs text-zinc-300">
          Ends: {lastTerm}
        </span>
        <span className="rounded-full border border-beach-border bg-beach-card/70 px-3 py-1.5 text-xs text-zinc-300">
          {reportValue.activeSemesters} active / {reportValue.totalSemesters} total semesters
        </span>
        <span className="rounded-full border border-beach-border bg-beach-card/70 px-3 py-1.5 text-xs text-zinc-300">
          {reportValue.completedUnits}u done / {reportValue.plannedUnits}u planned
        </span>
        <span className="rounded-full border border-beach-border bg-beach-card/70 px-3 py-1.5 text-xs text-zinc-300">
          Load: {reportValue.minActiveSemesterUnits ?? 0}u to {reportValue.maxSemesterUnits}u
        </span>
      </div>

      {topIssues.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {topIssues.slice(0, 2).map((issue) => (
            <span
              key={`${issue.code}-${issue.message}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                issue.severity === "hard"
                  ? "border-red-900/40 bg-red-950/20 text-red-200"
                  : "border-amber-900/40 bg-amber-950/20 text-amber-200"
              }`}
            >
              {issue.message}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-zinc-500 sm:text-left">
        {formatStatusNarrative(status, reportValue.activeSemesters)}
      </p>
    </div>
  );
}
