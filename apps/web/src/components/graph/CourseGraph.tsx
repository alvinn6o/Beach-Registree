"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useCourseStore } from "@/stores/courseStore";
import { useProgressStore } from "@/stores/progressStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { GraphRenderer } from "./GraphRenderer";
import { layoutNodes } from "./GraphLayout";
import type { CourseStatus } from "graph-core";
import tracksData from "../../../../../data/csulb/cs_bs_tracks.json";

const allTracks = tracksData as { id: string; color: string; electives: string[]; required?: string[] }[];
const DEFAULT_TRANSFORM = { x: 80, y: 20, k: 1 };
const CONTENT_MARGIN_X = 120;
const CONTENT_MARGIN_Y = 90;

interface CourseGraphProps {
  onSelectCourse: (id: string | null) => void;
  selectedCourse: string | null;
}

export default function CourseGraph({ onSelectCourse, selectedCourse }: CourseGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });

  const courses = useCourseStore((s) => s.courses);
  const edges = useCourseStore((s) => s.edges);
  const layers = useCourseStore((s) => s.layers);
  const maxLayer = useCourseStore((s) => s.maxLayer);
  const major = useCourseStore((s) => s.major);
  const completed = useProgressStore((s) => s.completed);
  const selectedTrack = useProgressStore((s) => s.selectedTrack);
  const plan = usePlannerStore((s) => s.plan);
  const getStatusFn = useCourseStore((s) => s.getStatus);

  // Build planned IDs set from planner
  const plannedIds = new Set(plan?.semesters.flatMap((s) => s.courses) ?? []);
  const getPathToFn = useCourseStore((s) => s.getPathTo);
  const getDownstreamFn = useCourseStore((s) => s.getDownstream);

  // Build set of absolutely required courses (from "all" requirement groups)
  const requiredCourses = new Set<string>();
  for (const req of major.requirements) {
    if (req.type === "all") {
      for (const id of req.courses) {
        requiredCourses.add(id);
      }
    }
  }

  // Build "choose" OR groups for visual pairing (e.g. CECS 381 / E E 381)
  const orGroups: { name: string; courses: string[]; count: number }[] = [];
  for (const req of major.requirements) {
    if (req.type === "choose" && req.count !== undefined) {
      // Only include groups where at least 2 courses exist in the current course set
      const visibleCourses = req.courses.filter((id) => courses.some((c) => c.id === id));
      if (visibleCourses.length >= 2) {
        orGroups.push({ name: req.name, courses: visibleCourses, count: req.count });
      }
    }
  }

  const activeTrack = selectedTrack ? allTracks.find((t) => t.id === selectedTrack) : null;
  const trackElectives = activeTrack ? new Set([...activeTrack.electives, ...(activeTrack.required || [])]) : null;
  const trackColor = activeTrack?.color ?? null;

  // Filter out track-specific courses not relevant to current track
  // IS 360 is cybersecurity-only: hide when another track or no track is selected
  const TRACK_SPECIFIC: Record<string, string> = { "I S 360": "cybersecurity" };
  const filteredCourses = courses.filter((c) => {
    const requiredTrack = TRACK_SPECIFIC[c.id];
    if (!requiredTrack) return true;
    return selectedTrack === requiredTrack;
  });

  const { positions, layerMetas } = layoutNodes(filteredCourses, layers, maxLayer);

  function clampAxis(
    offset: number,
    scale: number,
    viewportSize: number,
    minWorld: number,
    maxWorld: number
  ): number {
    const contentSize = (maxWorld - minWorld) * scale;
    if (contentSize <= viewportSize) {
      return (viewportSize - contentSize) / 2 - minWorld * scale;
    }

    const minOffset = viewportSize - maxWorld * scale;
    const maxOffset = -minWorld * scale;
    return Math.min(maxOffset, Math.max(minOffset, offset));
  }

  const clampTransform = useCallback(
    (next: { x: number; y: number; k: number }) => {
      const canvas = canvasRef.current;
      if (!canvas || positions.size === 0) return next;

      const rect = canvas.getBoundingClientRect();
      const nodes = [...positions.values()];
      const minX = Math.min(...nodes.map((pos) => pos.x)) - CONTENT_MARGIN_X;
      const maxX = Math.max(...nodes.map((pos) => pos.x + pos.width)) + CONTENT_MARGIN_X;
      const minY = Math.min(...nodes.map((pos) => pos.y)) - CONTENT_MARGIN_Y;
      const maxY = Math.max(...nodes.map((pos) => pos.y + pos.height)) + CONTENT_MARGIN_Y;

      return {
        x: clampAxis(next.x, next.k, rect.width, minX, maxX),
        y: clampAxis(next.y, next.k, rect.height, minY, maxY),
        k: next.k,
      };
    },
    [positions]
  );

  // Build status map — "planned" overrides "available"/"locked" when course is in planner
  type ExtendedStatus = CourseStatus | "planned";
  const statusMap = new Map<string, ExtendedStatus>();
  for (const course of filteredCourses) {
    const base = getStatusFn(course.id, completed);
    if (base !== "completed" && plannedIds.has(course.id)) {
      statusMap.set(course.id, "planned");
    } else {
      statusMap.set(course.id, base);
    }
  }

  // Highlighted sets
  const activeId = hoveredNode || selectedCourse;
  const highlighted = activeId ? getPathToFn(activeId) : null;
  const downstream = activeId ? getDownstreamFn(activeId) : null;

  useEffect(() => {
    setTransform((prev) => {
      const clamped = clampTransform(prev);
      return clamped.x === prev.x && clamped.y === prev.y && clamped.k === prev.k
        ? prev
        : clamped;
    });
  }, [clampTransform]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    if (!rendererRef.current) {
      rendererRef.current = new GraphRenderer(ctx, dpr);
    }

    rendererRef.current.render(rect.width, rect.height, transform, {
      courses: filteredCourses,
      edges,
      positions,
      statusMap,
      highlighted,
      downstream,
      selected: selectedCourse,
      hovered: hoveredNode,
      maxLayer,
      trackElectives,
      trackColor,
      layerMetas,
      requiredCourses,
      orGroups,
    });
  }, [courses, edges, positions, statusMap, highlighted, downstream, selectedCourse, hoveredNode, transform, maxLayer, trackElectives, trackColor, layerMetas, requiredCourses, orGroups, plannedIds]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    },
    [transform]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging) {
        setTransform((prev) =>
          clampTransform({
            ...prev,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          })
        );
        return;
      }

      if (rendererRef.current) {
        const hit = rendererRef.current.hitTest(x, y, transform, positions);
        setHoveredNode(hit);
        canvas.style.cursor = hit ? "pointer" : "grab";
      }
    },
    [isDragging, dragStart, transform, positions]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);

      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        const canvas = canvasRef.current;
        if (!canvas || !rendererRef.current) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = rendererRef.current.hitTest(x, y, transform, positions);
        onSelectCourse(hit === selectedCourse ? null : hit);
      }
    },
    [isDragging, transform, positions, selectedCourse, onSelectCourse]
  );

  // Scroll pans vertically (normal page scroll behavior on the graph)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setTransform((prev) =>
        clampTransform({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        })
      );
    },
    [clampTransform]
  );

  // Zoom controls via buttons
  const handleZoom = useCallback(
    (direction: "in" | "out" | "reset") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (direction === "reset") {
        setTransform(clampTransform(DEFAULT_TRANSFORM));
        return;
      }

      const scaleFactor = direction === "in" ? 1.25 : 0.8;
      const newK = Math.min(Math.max(transform.k * scaleFactor, 0.2), 3);

      setTransform((prev) =>
        clampTransform({
          x: centerX - (centerX - prev.x) * (newK / prev.k),
          y: centerY - (centerY - prev.y) * (newK / prev.k),
          k: newK,
        })
      );
    },
    [clampTransform, transform]
  );

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        role="img"
        aria-label="Interactive course prerequisite graph — click nodes to select, scroll to pan, use buttons to zoom"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredNode(null);
        }}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
        <button
          onClick={() => handleZoom("in")}
          className="w-9 h-9 rounded-xl border border-beach-border bg-beach-card/90 backdrop-blur-sm text-zinc-300 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center shadow-lg"
          title="Zoom in"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="w-9 h-9 rounded-xl border border-beach-border bg-beach-card/90 backdrop-blur-sm text-zinc-300 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center shadow-lg"
          title="Zoom out"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={() => handleZoom("reset")}
          className="w-9 h-9 rounded-xl border border-beach-border bg-beach-card/90 backdrop-blur-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center shadow-lg text-[10px] font-mono"
          title="Reset zoom"
        >
          1:1
        </button>
      </div>
    </div>
  );
}
