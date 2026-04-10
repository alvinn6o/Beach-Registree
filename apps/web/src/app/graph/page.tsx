"use client";

import { useState, useEffect } from "react";
import CourseGraph from "@/components/graph/CourseGraph";
import GraphControls from "@/components/graph/GraphControls";
import CoursePanel from "@/components/panel/CoursePanel";
import AppHeader from "@/components/shared/AppHeader";
import Legend from "@/components/shared/Legend";
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
      <AppHeader
        activePage="graph"
        extraControls={<GraphControls onSelectCourse={setSelectedCourse} />}
      />

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
