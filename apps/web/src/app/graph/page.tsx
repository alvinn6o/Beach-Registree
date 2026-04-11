"use client";

import { useState } from "react";
import CourseGraph from "@/components/graph/CourseGraph";
import GraphControls from "@/components/graph/GraphControls";
import CoursePanel from "@/components/panel/CoursePanel";
import AppHeader from "@/components/shared/AppHeader";
import Legend from "@/components/shared/Legend";

export default function GraphPage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

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
            onSelectCourse={setSelectedCourse}
            selectedCourse={selectedCourse}
          />
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
