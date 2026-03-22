"use client";

import { useState } from "react";
import { useSavedPlansStore } from "@/stores/savedPlansStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useProgressStore } from "@/stores/progressStore";

interface SavedPlansPanelProps {
  onClose: () => void;
}

export default function SavedPlansPanel({ onClose }: SavedPlansPanelProps) {
  const savedPlans = useSavedPlansStore((s) => s.savedPlans);
  const activePlanId = useSavedPlansStore((s) => s.activePlanId);
  const savePlan = useSavedPlansStore((s) => s.savePlan);
  const loadPlan = useSavedPlansStore((s) => s.loadPlan);
  const deletePlan = useSavedPlansStore((s) => s.deletePlan);
  const renamePlan = useSavedPlansStore((s) => s.renamePlan);

  const plan = usePlannerStore((s) => s.plan);
  const setPlan = usePlannerStore((s) => s.setPlan);
  const completed = useProgressStore((s) => s.completed);
  const setCompleted = useProgressStore((s) => s.setCompleted);
  const selectedElectives = useProgressStore((s) => s.selectedElectives);
  const setSelectedElectives = useProgressStore((s) => s.setSelectedElectives);

  const [newPlanName, setNewPlanName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedPlans = Object.values(savedPlans).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  function handleSave() {
    if (!plan) return;
    const name = newPlanName.trim() || `Plan ${sortedPlans.length + 1}`;
    savePlan(name, plan, [...completed], selectedElectives);
    setNewPlanName("");
  }

  function handleLoad(id: string) {
    const saved = loadPlan(id);
    if (!saved) return;
    setPlan(saved.plan);
    setCompleted(saved.completedCourses);
    setSelectedElectives(saved.selectedElectives);
  }

  function handleDelete(id: string) {
    deletePlan(id);
    setConfirmDeleteId(null);
  }

  function handleRenameSubmit(id: string) {
    if (renameValue.trim()) renamePlan(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="w-80 bg-beach-card border-l border-beach-border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-beach-border">
        <h2 className="text-sm font-semibold text-zinc-200">Saved Plans</h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Save current plan */}
      <div className="p-4 border-b border-beach-border">
        <p className="text-xs text-zinc-500 mb-2 font-mono">Save current plan as:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={`Plan ${sortedPlans.length + 1}`}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={!plan}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
        {!plan && (
          <p className="text-xs text-zinc-600 mt-1.5 font-mono">Generate a plan first</p>
        )}
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto">
        {sortedPlans.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-zinc-600 text-sm font-mono">No saved plans yet.</p>
            <p className="text-zinc-700 text-xs mt-1">Generate and save a plan above.</p>
          </div>
        ) : (
          <div className="divide-y divide-beach-border">
            {sortedPlans.map((saved) => {
              const isActive = saved.id === activePlanId;
              const semCount = saved.plan.semesters.filter(
                (s) => s.courses.length > 0
              ).length;
              const totalCourses = saved.plan.semesters.reduce(
                (sum, s) => sum + s.courses.length,
                0
              );

              return (
                <div
                  key={saved.id}
                  className={`p-4 ${isActive ? "bg-blue-950/30 border-l-2 border-blue-500" : ""}`}
                >
                  {renamingId === saved.id ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(saved.id);
                          if (e.key === "Escape") {
                            setRenamingId(null);
                            setRenameValue("");
                          }
                        }}
                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleRenameSubmit(saved.id)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between mb-1">
                      <button
                        onClick={() => {
                          setRenamingId(saved.id);
                          setRenameValue(saved.name);
                        }}
                        className="text-sm font-medium text-zinc-200 hover:text-blue-400 text-left transition-colors"
                      >
                        {saved.name}
                        {isActive && (
                          <span className="ml-2 text-xs text-blue-400 font-mono">active</span>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-zinc-500 font-mono mb-3">
                    {semCount} semesters · {totalCourses} courses · {formatDate(saved.savedAt)}
                  </p>

                  {confirmDeleteId === saved.id ? (
                    <div className="flex gap-2">
                      <span className="text-xs text-zinc-400 flex-1">Delete this plan?</span>
                      <button
                        onClick={() => handleDelete(saved.id)}
                        className="px-2 py-1 bg-red-700 text-white rounded text-xs hover:bg-red-600"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 bg-zinc-700 text-zinc-300 rounded text-xs hover:bg-zinc-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoad(saved.id)}
                        className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(saved.id)}
                        className="px-2.5 py-1.5 text-zinc-500 hover:text-red-400 rounded text-xs border border-zinc-700 hover:border-red-800 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
