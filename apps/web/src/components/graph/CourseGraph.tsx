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

interface CourseGraphProps {
  onSelectCourse: (id: string | null) => void;
  selectedCourse: string | null;
}

export default function CourseGraph({ onSelectCourse, selectedCourse }: CourseGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const [transform, setTransform] = useState({ x: 80, y: 20, k: 1 });
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
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        }));
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newK = Math.min(Math.max(transform.k * scaleFactor, 0.2), 3);

      setTransform((prev) => ({
        x: mouseX - (mouseX - prev.x) * (newK / prev.k),
        y: mouseY - (mouseY - prev.y) * (newK / prev.k),
        k: newK,
      }));
    },
    [transform]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      role="img"
      aria-label="Interactive course prerequisite graph — click nodes to select, scroll to zoom, drag to pan"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredNode(null);
      }}
      onWheel={handleWheel}
    />
  );
}
