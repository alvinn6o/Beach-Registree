import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const courses = [
  { id: "MATH 122", name: "Calculus I", units: 4, category: "math", semester: "F/S", desc: "Limits, derivatives, integrals. Foundation for all upper-division STEM.", prereqs: [] },
  { id: "MATH 123", name: "Calculus II", units: 4, category: "math", semester: "F/S", desc: "Integration techniques, sequences, series, polar coordinates.", prereqs: ["MATH 122"] },
  { id: "MATH 224", name: "Calculus III", units: 4, category: "math", semester: "F/S", desc: "Multivariable calculus, partial derivatives, multiple integrals.", prereqs: ["MATH 123"] },
  { id: "MATH 247", name: "Linear Algebra", units: 3, category: "math", semester: "F/S", desc: "Vectors, matrices, eigenvalues, linear transformations.", prereqs: ["MATH 123"] },
  { id: "MATH 380", name: "Probability & Stats", units: 3, category: "math", semester: "F/S", desc: "Probability distributions, hypothesis testing, regression.", prereqs: ["MATH 123"] },
  { id: "CECS 100", name: "Critical Thinking in CS", units: 1, category: "core", semester: "F/S", desc: "Introduction to critical thinking and problem-solving in CS.", prereqs: [] },
  { id: "CECS 174", name: "Intro to Programming", units: 3, category: "core", semester: "F/S", desc: "Programming fundamentals in Python. Variables, loops, functions, OOP basics.", prereqs: ["CECS 100"] },
  { id: "CECS 228", name: "Discrete Structures", units: 3, category: "core", semester: "F/S", desc: "Logic, sets, relations, functions, combinatorics, graph theory.", prereqs: ["CECS 174", "MATH 122"] },
  { id: "CECS 274", name: "Data Structures", units: 3, category: "core", semester: "F/S", desc: "Lists, stacks, queues, trees, hash tables, sorting algorithms.", prereqs: ["CECS 174"] },
  { id: "CECS 277", name: "Object-Oriented Prog", units: 3, category: "core", semester: "F/S", desc: "Design patterns, inheritance, polymorphism, UML.", prereqs: ["CECS 274"] },
  { id: "CECS 282", name: "Advanced C++", units: 3, category: "core", semester: "F/S", desc: "Pointers, memory management, templates, STL.", prereqs: ["CECS 274"] },
  { id: "CECS 328", name: "Algorithms", units: 3, category: "upper", semester: "F/S", desc: "Algorithm design, complexity analysis, dynamic programming, graph algorithms.", prereqs: ["CECS 228", "CECS 274"] },
  { id: "CECS 326", name: "Operating Systems", units: 3, category: "upper", semester: "F/S", desc: "Process management, memory, file systems, concurrency.", prereqs: ["CECS 277", "CECS 282"] },
  { id: "CECS 323", name: "Database Fundamentals", units: 3, category: "upper", semester: "F/S", desc: "Relational model, SQL, normalization, ER diagrams.", prereqs: ["CECS 277"] },
  { id: "CECS 327", name: "Networks & Distributed", units: 3, category: "upper", semester: "F/S", desc: "TCP/IP, P2P, DHTs, Docker, sockets, distributed systems.", prereqs: ["CECS 282"] },
  { id: "CECS 341", name: "Computer Architecture", units: 3, category: "upper", semester: "F/S", desc: "CPU design, pipelining, memory hierarchy, assembly.", prereqs: ["CECS 228", "CECS 274"] },
  { id: "CECS 343", name: "Software Engineering", units: 3, category: "upper", semester: "F/S", desc: "SDLC, Agile, testing, requirements, design patterns.", prereqs: ["CECS 277"] },
  { id: "CECS 378", name: "Computer Security", units: 3, category: "elective", semester: "F/S", desc: "Cryptography, network security, access control, vulnerabilities.", prereqs: ["CECS 327"] },
  { id: "CECS 429", name: "Information Retrieval", units: 3, category: "elective", semester: "S", desc: "Search engines, indexing, ranking algorithms, NLP basics.", prereqs: ["CECS 328"] },
  { id: "CECS 451", name: "Artificial Intelligence", units: 3, category: "elective", semester: "F", desc: "Search, logic, planning, knowledge representation.", prereqs: ["CECS 328"] },
  { id: "CECS 456", name: "Machine Learning", units: 3, category: "elective", semester: "S", desc: "Supervised/unsupervised learning, neural networks, evaluation.", prereqs: ["CECS 328", "MATH 247"] },
  { id: "CECS 458", name: "Deep Learning", units: 3, category: "elective", semester: "S", desc: "CNNs, RNNs, transformers, autoencoders, transfer learning.", prereqs: ["CECS 456"] },
  { id: "CECS 491A", name: "Senior Project I", units: 3, category: "capstone", semester: "F", desc: "Capstone planning, requirements, design documentation.", prereqs: ["CECS 343", "CECS 328"] },
  { id: "CECS 491B", name: "Senior Project II", units: 3, category: "capstone", semester: "S", desc: "Capstone implementation, testing, final presentation.", prereqs: ["CECS 491A"] },
];

const categoryMeta = {
  math: { color: "#fbbf24", bg: "#451a03", label: "Math" },
  core: { color: "#60a5fa", bg: "#172554", label: "CS Core" },
  upper: { color: "#a78bfa", bg: "#1e1b4b", label: "Upper Division" },
  elective: { color: "#34d399", bg: "#052e16", label: "Electives" },
  capstone: { color: "#f472b6", bg: "#4a0d29", label: "Capstone" },
};

const edges = [];
courses.forEach((c) => c.prereqs.forEach((p) => edges.push({ source: p, target: c.id })));

// Compute depth (layer) for each course via longest path from any root
function computeLayers() {
  const depth = {};
  const memo = (id, visited = new Set()) => {
    if (depth[id] !== undefined) return depth[id];
    if (visited.has(id)) return 0;
    visited.add(id);
    const c = courses.find((x) => x.id === id);
    if (!c || c.prereqs.length === 0) { depth[id] = 0; return 0; }
    const d = Math.max(...c.prereqs.map((p) => memo(p, new Set(visited)))) + 1;
    depth[id] = d;
    return d;
  };
  courses.forEach((c) => memo(c.id));
  return depth;
}

const layerMap = computeLayers();
const maxLayer = Math.max(...Object.values(layerMap));

// Group courses by layer
const layers = {};
courses.forEach((c) => {
  const l = layerMap[c.id];
  if (!layers[l]) layers[l] = [];
  layers[l].push(c.id);
});

// Layer labels
const layerLabels = ["Entry / Foundations", "Core Prerequisites", "Core Courses", "Upper Division", "Specialization", "Advanced Electives", "Capstone"];

export default function CourseGraphTopDown() {
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState(new Set(["MATH 122", "CECS 100"]));
  const [hoveredNode, setHoveredNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dragState, setDragState] = useState(null);
  const nodesRef = useRef({});

  const NODE_W = 120;
  const NODE_H = 48;
  const LAYER_GAP = 90;
  const NODE_GAP = 16;
  const TOP_PAD = 60;
  const LEFT_PAD = 40;

  // Position nodes
  useEffect(() => {
    const positions = {};
    for (let l = 0; l <= maxLayer; l++) {
      const group = layers[l] || [];
      const totalWidth = group.length * NODE_W + (group.length - 1) * NODE_GAP;
      const startX = LEFT_PAD + (Math.max(800, (layers[2]?.length || 5) * (NODE_W + NODE_GAP)) - totalWidth) / 2;
      group.forEach((id, i) => {
        positions[id] = {
          x: startX + i * (NODE_W + NODE_GAP),
          y: TOP_PAD + l * LAYER_GAP,
        };
      });
    }
    nodesRef.current = positions;
  }, []);

  const getStatus = useCallback((id) => {
    if (completed.has(id)) return "completed";
    const c = courses.find((x) => x.id === id);
    return c && c.prereqs.every((p) => completed.has(p)) ? "available" : "locked";
  }, [completed]);

  const getPathTo = useCallback((id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    const c = courses.find((x) => x.id === id);
    if (c) c.prereqs.forEach((p) => getPathTo(p, visited));
    return visited;
  }, []);

  const getDownstream = useCallback((id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    courses.forEach((c) => {
      if (c.prereqs.includes(id)) getDownstream(c.id, visited);
    });
    return visited;
  }, []);

  const getUnlocks = useCallback((id) => {
    return courses.filter(
      (c) => c.prereqs.includes(id) && c.prereqs.every((p) => p === id || completed.has(p))
    );
  }, [completed]);

  const toggleComplete = useCallback((id) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Highlighted set
  const highlighted = hoveredNode ? getPathTo(hoveredNode) : (selected ? getPathTo(selected) : null);
  const downstream = hoveredNode ? getDownstream(hoveredNode) : (selected ? getDownstream(selected) : null);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const pos = nodesRef.current;
    if (Object.keys(pos).length === 0) return;

    // Layer labels & bands
    for (let l = 0; l <= maxLayer; l++) {
      const y = TOP_PAD + l * LAYER_GAP;
      if (l % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.015)";
        ctx.fillRect(0, y - 14, 2000, LAYER_GAP);
      }
      ctx.fillStyle = "#27272a";
      ctx.font = "600 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText((layerLabels[l] || `Layer ${l}`).toUpperCase(), 8, y + NODE_H / 2 + 3);
    }

    // Draw edges
    edges.forEach((e) => {
      const from = pos[e.source];
      const to = pos[e.target];
      if (!from || !to) return;

      const x1 = from.x + NODE_W / 2;
      const y1 = from.y + NODE_H;
      const x2 = to.x + NODE_W / 2;
      const y2 = to.y;

      const isHighlighted = highlighted && highlighted.has(e.source) && highlighted.has(e.target);
      const isDownstream = downstream && downstream.has(e.source) && downstream.has(e.target);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      // Bezier curve for smooth flow
      const cy1 = y1 + (y2 - y1) * 0.4;
      const cy2 = y1 + (y2 - y1) * 0.6;
      ctx.bezierCurveTo(x1, cy1, x2, cy2, x2, y2);

      if (isHighlighted || isDownstream) {
        ctx.strokeStyle = isHighlighted ? "#f59e0b" : "#3b82f680";
        ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = highlighted ? "#27272a40" : "#3f3f46";
        ctx.lineWidth = 1;
        ctx.globalAlpha = highlighted ? 0.3 : 0.6;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Arrowhead
      if (isHighlighted || isDownstream || !highlighted) {
        const angle = Math.atan2(y2 - cy2, x2 - x2) || Math.PI / 2;
        const arrowLen = 6;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowLen * Math.cos(angle - 0.4), y2 - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - arrowLen * Math.cos(angle + 0.4), y2 - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? "#f59e0b" : isDownstream ? "#3b82f680" : "#3f3f46";
        ctx.globalAlpha = highlighted && !isHighlighted && !isDownstream ? 0.3 : 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // Draw nodes
    courses.forEach((c) => {
      const p = pos[c.id];
      if (!p) return;
      const status = getStatus(c.id);
      const isSelected = selected === c.id;
      const isHovered = hoveredNode === c.id;
      const inPath = highlighted && highlighted.has(c.id);
      const inDown = downstream && downstream.has(c.id);
      const dimmed = highlighted && !inPath && !inDown;

      const x = p.x;
      const y = p.y;

      // Node background
      const radius = 10;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_W, NODE_H, radius);

      if (status === "completed") {
        ctx.fillStyle = dimmed ? "#14532d40" : "#14532d";
      } else if (status === "available") {
        ctx.fillStyle = dimmed ? "#17255440" : "#172554";
      } else {
        ctx.fillStyle = dimmed ? "#18181b40" : "#18181b";
      }
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_W, NODE_H, radius);
      if (isSelected) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
      } else if (isHovered) {
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 2;
      } else if (inPath) {
        ctx.strokeStyle = "#f59e0b80";
        ctx.lineWidth = 1.5;
      } else if (status === "completed") {
        ctx.strokeStyle = dimmed ? "#16a34a30" : "#16a34a";
        ctx.lineWidth = 1.5;
      } else if (status === "available") {
        ctx.strokeStyle = dimmed ? "#2563eb30" : "#2563eb";
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = dimmed ? "#27272a40" : "#27272a";
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Status dot
      const dotR = 4;
      const dotX = x + 12;
      const dotY = y + NODE_H / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle =
        status === "completed" ? (dimmed ? "#22c55e50" : "#22c55e") :
        status === "available" ? (dimmed ? "#3b82f650" : "#3b82f6") :
        (dimmed ? "#52525b50" : "#52525b");
      ctx.fill();

      // Course ID text
      ctx.fillStyle = dimmed ? "#a1a1aa40" : status === "locked" ? "#71717a" : "#e4e4e7";
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(c.id, x + 22, y + 19);

      // Course name
      ctx.fillStyle = dimmed ? "#52525b40" : "#52525b";
      ctx.font = "500 9px 'DM Sans', sans-serif";
      const nameText = c.name.length > 16 ? c.name.slice(0, 15) + "…" : c.name;
      ctx.fillText(nameText, x + 22, y + 34);

      // Units badge
      ctx.fillStyle = dimmed ? "#0c0c1040" : "#0c0c10";
      ctx.beginPath();
      ctx.roundRect(x + NODE_W - 28, y + 6, 22, 16, 4);
      ctx.fill();
      ctx.fillStyle = dimmed ? "#71717a40" : "#71717a";
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(c.units + "u", x + NODE_W - 17, y + 17.5);
      ctx.textAlign = "left";
    });

    ctx.restore();
  }, [transform, completed, selected, hoveredNode, highlighted, downstream, getStatus]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) canvasRef.current.style.width = "100%";
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Hit testing
  const hitTest = useCallback((mx, my) => {
    const pos = nodesRef.current;
    const cx = (mx - transform.x) / transform.k;
    const cy = (my - transform.y) / transform.k;
    for (const c of courses) {
      const p = pos[c.id];
      if (!p) continue;
      if (cx >= p.x && cx <= p.x + NODE_W && cy >= p.y && cy <= p.y + NODE_H) {
        return c.id;
      }
    }
    return null;
  }, [transform]);

  // Mouse handlers
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragState) {
      setTransform((t) => ({
        ...t,
        x: t.x + (e.clientX - dragState.lastX),
        y: t.y + (e.clientY - dragState.lastY),
      }));
      setDragState({ lastX: e.clientX, lastY: e.clientY });
      return;
    }

    const hit = hitTest(mx, my);
    setHoveredNode(hit);
    canvasRef.current.style.cursor = hit ? "pointer" : "grab";
  }, [dragState, hitTest]);

  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      setSelected((prev) => (prev === hit ? null : hit));
    } else {
      setDragState({ lastX: e.clientX, lastY: e.clientY });
      canvasRef.current.style.cursor = "grabbing";
    }
  }, [hitTest]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    const newK = Math.min(3, Math.max(0.3, transform.k * (1 + delta)));
    const ratio = newK / transform.k;
    setTransform({
      k: newK,
      x: mx - (mx - transform.x) * ratio,
      y: my - (my - transform.y) * ratio,
    });
  }, [transform]);

  const selectedCourse = selected ? courses.find((c) => c.id === selected) : null;
  const selectedStatus = selected ? getStatus(selected) : null;
  const unlocks = selected ? getUnlocks(selected) : [];
  const pathTo = selected ? getPathTo(selected) : new Set();
  const remainingPrereqs = selectedCourse ? selectedCourse.prereqs.filter((p) => !completed.has(p)) : [];

  const totalUnits = courses.reduce((s, c) => s + c.units, 0);
  const completedUnits = courses.filter((c) => completed.has(c.id)).reduce((s, c) => s + c.units, 0);
  const availableCount = courses.filter((c) => !completed.has(c.id) && c.prereqs.every((p) => completed.has(p))).length;

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0a0a0e",
      color: "#e4e4e7",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "10px 20px",
        borderBottom: "1px solid #1a1a22",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#0e0e14",
        flexShrink: 0,
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>CSULB Course Graph</div>
            <div style={{ fontSize: 10, color: "#52525b" }}>B.S. Computer Science • CECS</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          {[
            { label: "Completed", val: `${completed.size}/${courses.length}`, color: "#22c55e" },
            { label: "Units", val: `${completedUnits}/${totalUnits}`, color: "#a78bfa" },
            { label: "Available", val: availableCount, color: "#3b82f6" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#14141c", borderRadius: 6, padding: "4px 10px",
              border: "1px solid #1a1a22",
            }}>
              <span style={{ color: "#52525b", marginRight: 4 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: "relative" }}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setHoveredNode(null); setDragState(null); }}
            onWheel={handleWheel}
          />
          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            display: "flex", gap: 10,
            background: "#0e0e14e8", borderRadius: 8, padding: "6px 12px",
            fontSize: 10, border: "1px solid #1a1a22",
          }}>
            {[
              { c: "#22c55e", l: "Done" },
              { c: "#3b82f6", l: "Available" },
              { c: "#52525b", l: "Locked" },
              { c: "#f59e0b", l: "Path" },
            ].map((i) => (
              <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: i.c }} />
                <span style={{ color: "#71717a" }}>{i.l}</span>
              </div>
            ))}
          </div>
          <div style={{
            position: "absolute", top: 12, left: 12,
            fontSize: 10, color: "#3f3f46",
            background: "#0e0e14e8", borderRadius: 6, padding: "5px 10px",
            border: "1px solid #1a1a22",
          }}>
            Click course to inspect · Drag to pan · Scroll to zoom
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: 280, borderLeft: "1px solid #1a1a22", background: "#0e0e14",
          overflowY: "auto", padding: 14, flexShrink: 0,
        }}>
          {selectedCourse ? (
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                letterSpacing: 2, color: categoryMeta[selectedCourse.category].color,
                textTransform: "uppercase", marginBottom: 4,
              }}>{categoryMeta[selectedCourse.category].label}</div>

              <h2 style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 700 }}>{selectedCourse.id}</h2>
              <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 8 }}>{selectedCourse.name}</div>

              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { label: selectedStatus, color: selectedStatus === "completed" ? "#22c55e" : selectedStatus === "available" ? "#3b82f6" : "#71717a" },
                  { label: `${selectedCourse.units} units`, color: "#a1a1aa" },
                  { label: selectedCourse.semester === "F" ? "Fall only" : selectedCourse.semester === "S" ? "Spring only" : "Fall & Spring", color: "#a1a1aa" },
                ].map((t, i) => (
                  <span key={i} style={{
                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    padding: "2px 7px", borderRadius: 4, background: "#14141c",
                    color: t.color, textTransform: "uppercase", letterSpacing: 1,
                    border: "1px solid #1a1a22",
                  }}>{t.label}</span>
                ))}
              </div>

              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#71717a", lineHeight: 1.55 }}>{selectedCourse.desc}</p>

              <button onClick={() => toggleComplete(selectedCourse.id)} disabled={selectedStatus === "locked" && !completed.has(selectedCourse.id)} style={{
                width: "100%", padding: "9px", borderRadius: 7, border: "none",
                cursor: selectedStatus === "locked" && !completed.has(selectedCourse.id) ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                background: completed.has(selectedCourse.id) ? "#14141c" : selectedStatus === "available" ? "#22c55e" : "#27272a",
                color: completed.has(selectedCourse.id) ? "#a1a1aa" : selectedStatus === "available" ? "#052e16" : "#52525b",
                marginBottom: 14,
                opacity: selectedStatus === "locked" && !completed.has(selectedCourse.id) ? 0.4 : 1,
              }}>
                {completed.has(selectedCourse.id) ? "✓ Mark Incomplete" : selectedStatus === "available" ? "Mark Complete" : "Prerequisites Not Met"}
              </button>

              {selectedCourse.prereqs.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#52525b", textTransform: "uppercase", marginBottom: 6 }}>Prerequisites</div>
                  {selectedCourse.prereqs.map((p) => {
                    const met = completed.has(p);
                    const pc = courses.find((c) => c.id === p);
                    return (
                      <div key={p} onClick={() => setSelected(p)} style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "5px 8px", borderRadius: 6, background: "#0a0a0e",
                        marginBottom: 3, cursor: "pointer", border: "1px solid #1a1a22",
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%",
                          background: met ? "#22c55e" : "#ef4444",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, color: "#fff", flexShrink: 0,
                        }}>{met ? "✓" : "✗"}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: met ? "#71717a" : "#e4e4e7" }}>{p}</div>
                          <div style={{ fontSize: 9, color: "#3f3f46" }}>{pc?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {unlocks.length > 0 && completed.has(selectedCourse.id) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#22c55e", textTransform: "uppercase", marginBottom: 6 }}>Unlocks</div>
                  {unlocks.map((u) => (
                    <div key={u.id} onClick={() => setSelected(u.id)} style={{
                      padding: "5px 8px", borderRadius: 6, background: "#0a0a0e",
                      marginBottom: 3, cursor: "pointer", border: "1px solid #1a1a22", fontSize: 11,
                    }}>
                      <span style={{ fontWeight: 600 }}>{u.id}</span>
                      <span style={{ color: "#3f3f46", marginLeft: 5 }}>{u.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {remainingPrereqs.length > 0 && (
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#f97316", textTransform: "uppercase", marginBottom: 6 }}>
                    Path to unlock ({[...pathTo].filter((p) => !completed.has(p) && p !== selectedCourse.id).length})
                  </div>
                  {[...pathTo].filter((p) => !completed.has(p) && p !== selectedCourse.id).map((p) => {
                    const pc = courses.find((c) => c.id === p);
                    return (
                      <div key={p} onClick={() => setSelected(p)} style={{
                        padding: "5px 8px", borderRadius: 6, background: "#0a0a0e",
                        marginBottom: 3, cursor: "pointer", border: "1px solid #1a1a22", fontSize: 11,
                      }}>
                        <span style={{ fontWeight: 600 }}>{p}</span>
                        <span style={{ color: "#3f3f46", marginLeft: 5 }}>{pc?.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Select a course</h3>
              <p style={{ fontSize: 12, color: "#52525b", lineHeight: 1.5, margin: "0 0 16px" }}>
                Click any course node to see details, prerequisites, and what it unlocks downstream.
              </p>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#52525b", textTransform: "uppercase", marginBottom: 6 }}>Progress</div>
              <div style={{
                background: "#0a0a0e", borderRadius: 8, padding: "10px 12px",
                border: "1px solid #1a1a22", marginBottom: 14,
              }}>
                <div style={{ height: 5, background: "#1a1a22", borderRadius: 3, marginBottom: 6, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${(completedUnits / totalUnits) * 100}%`,
                    background: "linear-gradient(90deg, #22c55e, #3b82f6)",
                    borderRadius: 3, transition: "width 0.3s",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "#52525b" }}>{completed.size} of {courses.length} courses · {completedUnits} of {totalUnits} units</div>
              </div>

              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#3b82f6", textTransform: "uppercase", marginBottom: 6 }}>Available Now ({availableCount})</div>
              {courses.filter((c) => !completed.has(c.id) && c.prereqs.every((p) => completed.has(p))).map((c) => (
                <div key={c.id} onClick={() => setSelected(c.id)} style={{
                  padding: "5px 8px", borderRadius: 6, background: "#0a0a0e",
                  marginBottom: 3, cursor: "pointer", border: "1px solid #1a1a22", fontSize: 11,
                }}>
                  <span style={{ fontWeight: 600, color: "#3b82f6" }}>{c.id}</span>
                  <span style={{ color: "#3f3f46", marginLeft: 5 }}>{c.name}</span>
                </div>
              ))}

              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#22c55e", textTransform: "uppercase", marginBottom: 6, marginTop: 14 }}>Completed ({completed.size})</div>
              {[...completed].map((id) => {
                const c = courses.find((x) => x.id === id);
                return (
                  <div key={id} onClick={() => setSelected(id)} style={{
                    padding: "5px 8px", borderRadius: 6, background: "#0a0a0e",
                    marginBottom: 3, cursor: "pointer", border: "1px solid #1a1a22", fontSize: 11, color: "#52525b",
                  }}>
                    <span style={{ fontWeight: 600, color: "#22c55e" }}>{id}</span> {c?.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
