import type { Course, Edge } from "graph-core";
import type { NodePosition, LayerMeta } from "./GraphLayout";
import { categoryColors, statusColors, graphColors } from "@/lib/colors";
import { NODE_W, NODE_H, LAYER_GAP, TOP_PAD, LAYER_LABELS } from "@/lib/constants";

interface OrGroup {
  name: string;
  courses: string[];
  count: number;
}

type NodeStatus = "completed" | "planned" | "available" | "locked";

interface RenderState {
  courses: Course[];
  edges: Edge[];
  positions: Map<string, NodePosition>;
  statusMap: Map<string, NodeStatus>;
  highlighted: Set<string> | null;
  downstream: Set<string> | null;
  selected: string | null;
  hovered: string | null;
  maxLayer: number;
  trackElectives: Set<string> | null;
  trackColor: string | null;
  layerMetas: Map<number, LayerMeta>;
  requiredCourses: Set<string>;
  orGroups: OrGroup[];
}

export class GraphRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(ctx: CanvasRenderingContext2D, dpr: number) {
    this.ctx = ctx;
    this.dpr = dpr;
  }

  render(
    width: number,
    height: number,
    transform: { x: number; y: number; k: number },
    state: RenderState
  ) {
    const { ctx } = this;
    const { courses, edges, positions, statusMap, highlighted, downstream, selected, hovered, maxLayer, trackElectives, trackColor, layerMetas, requiredCourses, orGroups } = state;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Subtle background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, graphColors.bgTop);
    bgGrad.addColorStop(1, graphColors.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Layer bands
    this.drawLayerBands(maxLayer, layerMetas);

    // Edges
    this.drawEdges(edges, positions, highlighted, downstream);

    // OR group boxes (draw before nodes so nodes render on top)
    this.drawOrGroups(orGroups, positions);

    // Nodes
    for (const course of courses) {
      const pos = positions.get(course.id);
      if (!pos) continue;
      const status = statusMap.get(course.id) || "locked";
      const isHighlighted = highlighted?.has(course.id) ?? false;
      const isDownstream = downstream?.has(course.id) ?? false;
      const isSelected = course.id === selected;
      const isHovered = course.id === hovered;
      const dimmed = (highlighted || downstream) && !isHighlighted && !isDownstream;
      const isTrackElective = trackElectives?.has(course.id) ?? false;

      const isRequired = requiredCourses.has(course.id);
      this.drawNode(course, pos, status, isHighlighted, isDownstream, isSelected, isHovered, !!dimmed, isTrackElective, trackColor, isRequired);
    }

    ctx.restore();
  }

  private drawLayerBands(maxLayer: number, layerMetas: Map<number, LayerMeta>) {
    const { ctx } = this;

    for (let l = 0; l <= maxLayer; l++) {
      const meta = layerMetas.get(l);
      if (!meta) continue;

      const y = meta.yStart - 20;
      const h = meta.totalHeight + 40;

      // Subtle alternating bands
      if (l % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.012)";
        ctx.beginPath();
        ctx.roundRect(-60, y, 3000, h, 6);
        ctx.fill();
      }

      // Layer label
      ctx.fillStyle = "#2a2d3a";
      ctx.font = "600 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(
        (LAYER_LABELS[l] || `Layer ${l}`).toUpperCase(),
        6,
        meta.yStart - 14
      );
    }
  }

  private drawOrGroups(
    orGroups: OrGroup[],
    positions: Map<string, NodePosition>
  ) {
    const { ctx } = this;

    for (const group of orGroups) {
      // Only draw visual grouping for small "choose" groups (2-3 courses)
      // Large groups like Focus Area (17 courses) would be too cluttered
      if (group.courses.length > 4) continue;

      // Find positions of all visible courses in this group
      const groupPositions = group.courses
        .map((id) => ({ id, pos: positions.get(id) }))
        .filter((p): p is { id: string; pos: NodePosition } => p.pos !== undefined);

      if (groupPositions.length < 2) continue;

      // Compute bounding box around all courses in the group
      const pad = 8;
      const minX = Math.min(...groupPositions.map((p) => p.pos.x)) - pad;
      const minY = Math.min(...groupPositions.map((p) => p.pos.y)) - pad;
      const maxX = Math.max(...groupPositions.map((p) => p.pos.x + p.pos.width)) + pad;
      const maxY = Math.max(...groupPositions.map((p) => p.pos.y + p.pos.height)) + pad;

      // Dashed rounded rectangle
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#525278";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 14);
      ctx.stroke();
      ctx.setLineDash([]);

      // "OR" label between nodes
      // For 2 nodes side by side, place label centered between them
      if (groupPositions.length === 2) {
        const [a, b] = groupPositions;
        const labelX = (a.pos.x + a.pos.width / 2 + b.pos.x + b.pos.width / 2) / 2;
        const labelY = (a.pos.y + a.pos.height / 2 + b.pos.y + b.pos.height / 2) / 2;

        // Background pill for "OR"
        const pillW = 24;
        const pillH = 14;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#1e1f2e";
        ctx.beginPath();
        ctx.roundRect(labelX - pillW / 2, labelY - pillH / 2, pillW, pillH, 7);
        ctx.fill();
        ctx.strokeStyle = "#525278";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Text
        ctx.fillStyle = "#8b8baf";
        ctx.font = "600 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1;
        ctx.fillText("OR", labelX, labelY);
      } else {
        // For 3+ nodes, place label above the group
        const labelX = (minX + maxX) / 2;
        const labelY = minY + 1;

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#1e1f2e";
        const pillW = 50;
        const pillH = 14;
        ctx.beginPath();
        ctx.roundRect(labelX - pillW / 2, labelY - pillH, pillW, pillH, 7);
        ctx.fill();

        ctx.fillStyle = "#8b8baf";
        ctx.font = "600 7px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1;
        ctx.fillText(`pick ${group.count}`, labelX, labelY - pillH / 2);
      }

      ctx.restore();
    }
  }

  private drawEdges(
    edges: Edge[],
    positions: Map<string, NodePosition>,
    highlighted: Set<string> | null,
    downstream: Set<string> | null
  ) {
    const { ctx } = this;

    for (const edge of edges) {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      if (!from || !to) continue;

      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height;
      const x2 = to.x + to.width / 2;
      const y2 = to.y;

      const isHL = highlighted && highlighted.has(edge.source) && highlighted.has(edge.target);
      const isDS = downstream && downstream.has(edge.source) && downstream.has(edge.target);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const cy1 = y1 + (y2 - y1) * 0.35;
      const cy2 = y1 + (y2 - y1) * 0.65;
      ctx.bezierCurveTo(x1, cy1, x2, cy2, x2, y2);

      if (isHL) {
        ctx.strokeStyle = graphColors.highlight;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;
      } else if (isDS) {
        ctx.strokeStyle = graphColors.downstream;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
      } else {
        ctx.strokeStyle = graphColors.edgeDefault;
        ctx.lineWidth = 1;
        ctx.globalAlpha = highlighted || downstream ? 0.1 : 0.35;
      }

      ctx.stroke();
      ctx.globalAlpha = 1;

      // Arrow head for highlighted edges
      if (isHL || isDS) {
        const arrowSize = 6;
        const angle = Math.atan2(y2 - cy2, x2 - x2) || Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = isHL ? graphColors.highlight : graphColors.downstream;
        ctx.fill();
      }
    }
  }

  private drawNode(
    course: Course,
    pos: NodePosition,
    status: NodeStatus,
    isHighlighted: boolean,
    isDownstream: boolean,
    isSelected: boolean,
    isHovered: boolean,
    dimmed: boolean,
    isTrackElective: boolean = false,
    trackColor: string | null = null,
    isRequired: boolean = false
  ) {
    const { ctx } = this;
    const { x, y, width, height } = pos;
    const catColor = categoryColors[course.category] || categoryColors.core;

    ctx.globalAlpha = dimmed ? 0.15 : 1;

    // Glow for selected/hovered
    if ((isSelected || isHovered) && !dimmed) {
      ctx.shadowColor = isHighlighted ? graphColors.highlight : isDownstream ? graphColors.downstream : catColor.color;
      ctx.shadowBlur = isSelected ? 16 : 10;
    }

    // Background
    const radius = 10;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);

    if (status === "completed") {
      ctx.fillStyle = graphColors.completedBg;
    } else if (status === "planned") {
      ctx.fillStyle = graphColors.plannedBg;
    } else {
      ctx.fillStyle = catColor.bg;
    }
    ctx.fill();

    // Border — required courses get a bolder, brighter border
    const reqBold = isRequired && status !== "completed" && status !== "planned" && !isHighlighted && !isDownstream && !isSelected && !isHovered;
    ctx.lineWidth = isSelected ? 2 : isHovered ? 1.5 : status === "planned" ? 1.5 : reqBold ? 1.8 : 0.8;
    if (status === "completed") {
      ctx.strokeStyle = statusColors.completed.border;
    } else if (status === "planned") {
      ctx.strokeStyle = statusColors.planned.border;
    } else if (isHighlighted) {
      ctx.strokeStyle = graphColors.highlight;
    } else if (isDownstream) {
      ctx.strokeStyle = graphColors.downstream;
    } else if (isSelected || isHovered) {
      ctx.strokeStyle = catColor.color;
    } else if (isRequired) {
      ctx.strokeStyle = catColor.color;
    } else {
      ctx.strokeStyle = catColor.border;
    }
    ctx.stroke();

    // Track elective ring
    if (isTrackElective && trackColor && status !== "completed") {
      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, width + 6, height + 6, 13);
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = dimmed ? 0.1 : 0.65;
      ctx.stroke();
      ctx.globalAlpha = dimmed ? 0.15 : 1;
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Course ID
    ctx.fillStyle = status === "completed" ? statusColors.completed.text : status === "planned" ? statusColors.planned.text : catColor.color;
    ctx.font = "600 10.5px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(course.id, x + width / 2, y + height / 2 - 8);

    // Course name (truncated)
    ctx.fillStyle = status === "completed" ? graphColors.completedSubtext : status === "planned" ? graphColors.plannedSubtext : statusColors.locked.text;
    ctx.font = "400 8.5px 'DM Sans', sans-serif";
    const maxTextWidth = width - 14;
    let name = course.name;
    while (ctx.measureText(name).width > maxTextWidth && name.length > 3) {
      name = name.slice(0, -4) + "...";
    }
    ctx.fillText(name, x + width / 2, y + height / 2 + 8);

    // Status icon
    if (status === "completed") {
      ctx.fillStyle = statusColors.completed.border;
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("\u2713", x + width - 6, y + 11);
    } else if (status === "planned") {
      ctx.fillStyle = statusColors.planned.border;
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("\u25F7", x + width - 5, y + 11); // clock symbol
    }

    // Units badge
    ctx.fillStyle = dimmed ? "#1a1d27" : graphColors.badgeBg;
    ctx.beginPath();
    ctx.roundRect(x + width - 23, y + height - 15, 19, 12, 4);
    ctx.fill();
    ctx.fillStyle = dimmed ? "#2a2d3a" : "#52525b";
    ctx.font = "500 7.5px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${course.units}u`, x + width - 13.5, y + height - 7);

    // Required indicator — small diamond at top-left
    if (isRequired && status !== "completed" && status !== "planned" && !dimmed) {
      ctx.fillStyle = catColor.color;
      ctx.globalAlpha = 0.9;
      const dx = x + 7;
      const dy = y + 7;
      const s = 3;
      ctx.beginPath();
      ctx.moveTo(dx, dy - s);
      ctx.lineTo(dx + s, dy);
      ctx.lineTo(dx, dy + s);
      ctx.lineTo(dx - s, dy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 1;
  }

  hitTest(
    x: number,
    y: number,
    transform: { x: number; y: number; k: number },
    positions: Map<string, NodePosition>
  ): string | null {
    const worldX = (x - transform.x) / transform.k;
    const worldY = (y - transform.y) / transform.k;

    for (const [id, pos] of positions) {
      if (worldX >= pos.x && worldX <= pos.x + pos.width && worldY >= pos.y && worldY <= pos.y + pos.height) {
        return id;
      }
    }
    return null;
  }
}
