"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import TrackSelector from "@/components/graph/TrackSelector";
import ProgressBar from "@/components/shared/ProgressBar";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import TransferToggle from "@/components/shared/TransferToggle";
import QuickSelect from "@/components/shared/QuickSelect";
import DevTools from "@/components/shared/DevTools";
import SelectionActions from "@/components/shared/SelectionActions";
import { ReviewModal } from "@/components/shared/SurveyModal";
import { useProgressStore } from "@/stores/progressStore";
import { getTrackLabel } from "@/lib/trackRequirements";

type PageKey = "graph" | "planner" | "checklist";

const NAV_ITEMS: { href: string; label: string; page: PageKey }[] = [
  { href: "/graph", label: "Prerequisite Map", page: "graph" },
  { href: "/planner", label: "Plan My Degree", page: "planner" },
  { href: "/checklist", label: "Checklist", page: "checklist" },
];

interface AppHeaderProps {
  activePage: PageKey;
  extraControls?: ReactNode;
}

export default function AppHeader({ activePage, extraControls }: AppHeaderProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const completed = useProgressStore((state) => state.completed);
  const selectedTrack = useProgressStore((state) => state.selectedTrack);
  const isTransfer = useProgressStore((state) => state.isTransferStudent);
  const selectedTrackLabel = getTrackLabel(selectedTrack);

  return (
    <>
    <header className="border-b border-beach-border glass">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex flex-col">
              <span className="text-base font-display text-zinc-100 group-hover:text-white transition-colors">
                Beach RegisTree
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                CSULB planning prototype
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border border-beach-border/80 bg-beach-dark/60 p-1">
            {NAV_ITEMS.map(({ href, label, page }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activePage === page
                    ? "bg-zinc-100 text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/70"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden xl:block rounded-xl border border-beach-border/70 bg-beach-card/60 px-3 py-2">
            <ProgressBar />
          </div>
          {extraControls}
          <button
            onClick={() => setShowReview(true)}
            className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-xs font-medium text-amber-300 transition-all hover:border-amber-700/60 hover:bg-amber-950/30"
          >
            Write a Review
          </button>
          <button
            onClick={() => setShowSetup((value) => !value)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              showSetup
                ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                : "border-beach-border text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {showSetup ? "Hide Setup" : "Planning Setup"}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-beach-border/70 bg-beach-card/50 px-2.5 py-1">
              {completed.size} complete
            </span>
            <span className="rounded-full border border-beach-border/70 bg-beach-card/50 px-2.5 py-1">
              {selectedTrackLabel
                ? `Track: ${selectedTrackLabel}`
                : "Track required"}
            </span>
            {isTransfer && (
              <span className="rounded-full border border-amber-800/70 bg-amber-950/20 px-2.5 py-1 text-amber-300">
                Transfer plan
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 px-3 py-2">
            <TrackSelector />
          </div>
        </div>
      </div>

      {showSetup && (
        <div className="border-t border-beach-border/60 px-4 py-3">
          <div className="grid gap-3 xl:grid-cols-[auto_auto_1fr]">
            <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 px-3 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Profile
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TransferToggle />
                <ViewModeToggle />
              </div>
            </div>

            <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 px-3 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                Quick Marking
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <QuickSelect />
              </div>
            </div>

            <div className="rounded-2xl border border-beach-border/70 bg-beach-card/40 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                    Reset & Progress
                  </p>
                  <div className="mt-2 xl:hidden">
                    <ProgressBar />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SelectionActions />
                  <DevTools />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </header>
    <ReviewModal open={showReview} onClose={() => setShowReview(false)} />
    </>
  );
}
