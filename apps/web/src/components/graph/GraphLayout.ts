import type { Course } from "graph-core";
import { NODE_W, NODE_H, LAYER_GAP, NODE_GAP, ROW_GAP, TOP_PAD, LEFT_PAD, MAX_PER_ROW } from "@/lib/constants";

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerMeta {
  yStart: number;
  rowCount: number;
  totalHeight: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  layerMetas: Map<number, LayerMeta>;
  totalHeight: number;
}

export function layoutNodes(
  courses: Course[],
  layers: Map<string, number>,
  maxLayer: number
): LayoutResult {
  const positions = new Map<string, NodePosition>();
  const layerMetas = new Map<number, LayerMeta>();

  // Group by layer
  const layerGroups: Map<number, Course[]> = new Map();
  for (const course of courses) {
    const layer = layers.get(course.id) ?? 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(course);
  }

  // Sort each layer by category for visual grouping
  const catOrder: Record<string, number> = {
    math: 0, core: 1, support: 2, upper: 3, elective: 4, capstone: 5, ge: 6, "ge-upper": 7,
  };
  for (const [, group] of layerGroups) {
    group.sort((a, b) => (catOrder[a.category] ?? 8) - (catOrder[b.category] ?? 8));
  }

  // Find widest row width (capped at MAX_PER_ROW) for centering
  let maxRowWidth = 0;
  for (const [, group] of layerGroups) {
    const perRow = Math.min(group.length, MAX_PER_ROW);
    const w = perRow * NODE_W + (perRow - 1) * NODE_GAP;
    if (w > maxRowWidth) maxRowWidth = w;
  }

  // Position nodes with multi-row wrapping
  let yOffset = TOP_PAD;

  for (let l = 0; l <= maxLayer; l++) {
    const group = layerGroups.get(l) || [];
    const rowCount = Math.max(1, Math.ceil(group.length / MAX_PER_ROW));
    const layerHeight = rowCount * NODE_H + (rowCount - 1) * ROW_GAP;

    layerMetas.set(l, { yStart: yOffset, rowCount, totalHeight: layerHeight });

    for (let i = 0; i < group.length; i++) {
      const row = Math.floor(i / MAX_PER_ROW);
      const col = i % MAX_PER_ROW;
      const coursesInRow = Math.min(MAX_PER_ROW, group.length - row * MAX_PER_ROW);
      const rowWidth = coursesInRow * NODE_W + (coursesInRow - 1) * NODE_GAP;
      const startX = LEFT_PAD + (maxRowWidth - rowWidth) / 2;

      positions.set(group[i].id, {
        x: startX + col * (NODE_W + NODE_GAP),
        y: yOffset + row * (NODE_H + ROW_GAP),
        width: NODE_W,
        height: NODE_H,
      });
    }

    yOffset += layerHeight + LAYER_GAP;
  }

  return { positions, layerMetas, totalHeight: yOffset };
}
