"use client";

import { useState } from "react";
import SemesterPlanner from "@/components/planner/SemesterPlanner";
import SavedPlansPanel from "@/components/planner/SavedPlansPanel";
import CoursePanel from "@/components/panel/CoursePanel";
import AppHeader from "@/components/shared/AppHeader";
import { PostPlanSurvey } from "@/components/shared/SurveyModal";

export default function PlannerPage() {
  const [showSaved, setShowSaved] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-beach-dark">
      <PostPlanSurvey />
      <AppHeader
        activePage="planner"
        extraControls={
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
        }
      />

      {/* Main */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden">
          <SemesterPlanner onSelectCourse={setSelectedCourse} selectedCourse={selectedCourse} />
        </div>
        {selectedCourse && (
          <CoursePanel courseId={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}
        {showSaved && (
          <SavedPlansPanel onClose={() => setShowSaved(false)} />
        )}
      </div>
    </div>
  );
}
