"use client";

import { useMemo } from "react";
import { buildTransferAssumptionSummary } from "@/lib/planner";
import {
  TRANSFER_AUTO_COMPLETED_COURSES,
  TRANSFER_REQUIRED_AFTER_ENTRY,
  type TransferScienceChoice,
} from "@/stores/progressStore";
import { useProgressStore } from "@/stores/progressStore";

interface TransferAssumptionsPanelProps {
  embedded?: boolean;
}

export default function TransferAssumptionsPanel({ embedded = false }: TransferAssumptionsPanelProps) {
  const isTransferStudent = useProgressStore((state) => state.isTransferStudent);
  const completed = useProgressStore((state) => state.completed);
  const transferScienceChoice = useProgressStore((state) => state.transferScienceChoice);
  const transferScienceCompleted = useProgressStore((state) => state.transferScienceCompleted);
  const transferMath123Completed = useProgressStore((state) => state.transferMath123Completed);
  const setTransferScienceChoice = useProgressStore((state) => state.setTransferScienceChoice);
  const setTransferScienceCompleted = useProgressStore((state) => state.setTransferScienceCompleted);
  const setTransferMath123Completed = useProgressStore((state) => state.setTransferMath123Completed);

  const summary = useMemo(() => {
    if (!isTransferStudent) return null;
    return buildTransferAssumptionSummary(
      [...completed],
      TRANSFER_REQUIRED_AFTER_ENTRY,
      TRANSFER_AUTO_COMPLETED_COURSES,
      transferScienceChoice
    );
  }, [completed, isTransferStudent, transferScienceChoice]);

  if (!isTransferStudent || !summary) return null;

  const SCIENCE_OPTIONS: { value: TransferScienceChoice; label: string }[] = [
    { value: null, label: "No science path chosen yet" },
    { value: "PHYS 151", label: "Plan around PHYS 151" },
    { value: "CHEM 111A", label: "Plan around CHEM 111A" },
  ];

  return (
    <div className={`${embedded ? "p-5 bg-transparent" : "border-b border-beach-border/60 px-4 py-4 bg-gradient-to-r from-amber-950/10 via-transparent to-transparent"}`}>
      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-amber-900/30 bg-beach-card/50 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/70">
            Transfer Assumptions
          </p>
          <p className="mt-2 text-sm text-zinc-100">
            Transfer mode currently assumes {summary.assumedCompletedCount} lower-division courses or placeholders are already satisfied.
          </p>
          <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
            This is a planning shortcut so the draft can start from a transfer-like state. It is not the same as an official articulation review.
          </p>
          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Planned science path
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCIENCE_OPTIONS.map((option) => {
                  const isActive = transferScienceChoice === option.value;
                  return (
                    <button
                      key={option.label}
                      onClick={() => setTransferScienceChoice(option.value)}
                      className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "border-amber-700/60 bg-amber-950/30 text-amber-200"
                          : "border-beach-border text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTransferMath123Completed(!transferMath123Completed)}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  transferMath123Completed
                    ? "border-green-800/60 bg-green-950/30 text-green-300"
                    : "border-beach-border text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {transferMath123Completed ? "MATH 123 articulated" : "Mark MATH 123 as transferred"}
              </button>
              <button
                onClick={() => setTransferScienceCompleted(!transferScienceCompleted)}
                disabled={!transferScienceChoice}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  transferScienceCompleted
                    ? "border-green-800/60 bg-green-950/30 text-green-300"
                    : transferScienceChoice
                      ? "border-beach-border text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      : "border-zinc-800 text-zinc-700 cursor-not-allowed"
                }`}
              >
                {transferScienceCompleted
                  ? `${transferScienceChoice} articulated`
                  : "Mark chosen science as transferred"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
            Unresolved after entry
          </p>
          <div className="mt-2 space-y-2">
            {summary.unresolvedEntryRequirements.length > 0 ? (
              summary.unresolvedEntryRequirements.map((id) => (
                <p key={id} className="text-xs text-amber-300">
                  {id}
                </p>
              ))
            ) : (
              <p className="text-xs text-green-400">No modeled post-transfer entry requirements remain unresolved.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Preferred science path: {summary.preferredSciencePath ?? "not chosen yet"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {summary.warnings.map((warning) => (
          <p key={warning} className="rounded-xl border border-beach-border/70 bg-beach-card/30 px-3 py-2 text-xs text-zinc-400">
            {warning}
          </p>
        ))}
      </div>
    </div>
  );
}
