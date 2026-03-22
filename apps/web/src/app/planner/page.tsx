"use client";

import { useState } from "react";
import SemesterPlanner from "@/components/planner/SemesterPlanner";
import SavedPlansPanel from "@/components/planner/SavedPlansPanel";
import TrackSelector from "@/components/graph/TrackSelector";
import ProgressBar from "@/components/shared/ProgressBar";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import TransferToggle from "@/components/shared/TransferToggle";
import DevTools from "@/components/shared/DevTools";
import Link from "next/link";

export default function PlannerPage() {
  const [showSaved, setShowSaved] = useState(false);

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
              { href: "/planner", label: "Plan My Degree", active: true },
              { href: "/checklist", label: "Checklist", active: false },
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
          <ViewModeToggle />
          <TransferToggle />
          <div className="w-px h-5 bg-beach-border" />
          <TrackSelector />
          <div className="w-px h-5 bg-beach-border" />
          <ProgressBar />
          <DevTools />
          <div className="w-px h-5 bg-beach-border" />
          <button
            onClick={() => setShowSaved((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showSaved
                ? "bg-zinc-800 text-zinc-200 border-zinc-600"
                : "text-zinc-500 border-beach-border hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            Saved Plans
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <SemesterPlanner />
        </div>
        {showSaved && (
          <SavedPlansPanel onClose={() => setShowSaved(false)} />
        )}
      </div>
    </div>
  );
}
