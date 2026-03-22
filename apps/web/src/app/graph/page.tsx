"use client";

import { useState, useEffect } from "react";
import CourseGraph from "@/components/graph/CourseGraph";
import GraphControls from "@/components/graph/GraphControls";
import TrackSelector from "@/components/graph/TrackSelector";
import CoursePanel from "@/components/panel/CoursePanel";
import ProgressBar from "@/components/shared/ProgressBar";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import TransferToggle from "@/components/shared/TransferToggle";
import Legend from "@/components/shared/Legend";
import DevTools from "@/components/shared/DevTools";
import Link from "next/link";
import { useProgressStore } from "@/stores/progressStore";

export default function GraphPage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const completed = useProgressStore((s) => s.completed);

  // Show the onboarding hint only on first load when nothing is completed yet.
  // We use useEffect to avoid SSR/localStorage hydration mismatch.
  useEffect(() => {
    if (completed.size === 0) {
      setShowOnboarding(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              { href: "/graph", label: "Prerequisite Map", active: true },
              { href: "/planner", label: "Plan My Degree", active: false },
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
          <GraphControls onSelectCourse={setSelectedCourse} />
          <div className="w-px h-5 bg-beach-border" />
          <DevTools />
        </div>
      </header>

      {/* Legend */}
      <div className="px-4 py-1.5 border-b border-beach-border/50 bg-beach-dark">
        <Legend />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <CourseGraph
            onSelectCourse={(id) => {
              setSelectedCourse(id);
              if (id) setShowOnboarding(false);
            }}
            selectedCourse={selectedCourse}
          />

          {/* Onboarding hint — shown only until the user interacts */}
          {showOnboarding && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-sm shadow-xl text-sm text-zinc-300 animate-fade-up">
                <span className="text-lg">👋</span>
                <span>
                  Click any course node to see its prerequisites and mark it complete.
                  <span className="text-zinc-500 ml-2 text-xs">Scroll to zoom · drag to pan</span>
                </span>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="pointer-events-auto ml-2 text-zinc-600 hover:text-zinc-400 text-base leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
        {selectedCourse && (
          <CoursePanel
            courseId={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </div>
    </div>
  );
}
