"use client";

import Link from "next/link";
import SurveyModal from "../components/shared/SurveyModal";

/* ─── Animated Tree-Graph SVG ─── */
function TreeGraph() {
  return (
    <svg
      viewBox="0 0 800 900"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(90vw,800px)] h-auto pointer-events-none select-none"
      fill="none"
      style={{ opacity: 0.18 }}
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nodeGlowAmber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#065f46" stopOpacity="1" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Trunk — grows from bottom center upward */}
      <path
        d="M400 900 C400 900, 400 750, 400 620 C400 540, 398 480, 400 400"
        stroke="url(#trunkGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        className="tree-trunk"
      />

      {/* Main branches */}
      <path d="M400 600 C370 560, 280 520, 220 480" stroke="#34d399" strokeWidth="2" strokeLinecap="round" className="tree-branch tree-branch-1" />
      <path d="M400 600 C430 560, 520 520, 580 480" stroke="#34d399" strokeWidth="2" strokeLinecap="round" className="tree-branch tree-branch-2" />
      <path d="M400 480 C360 440, 300 400, 260 350" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" className="tree-branch tree-branch-3" />
      <path d="M400 480 C440 440, 500 400, 540 350" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" className="tree-branch tree-branch-4" />
      <path d="M400 400 C370 370, 340 340, 320 280" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" className="tree-branch tree-branch-5" />
      <path d="M400 400 C430 370, 460 340, 480 280" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" className="tree-branch tree-branch-6" />

      {/* Secondary branches — thinner, reaching outward */}
      <path d="M220 480 C200 450, 160 430, 140 400" stroke="#34d399" strokeWidth="1" strokeLinecap="round" className="tree-branch tree-branch-7" />
      <path d="M580 480 C600 450, 640 430, 660 400" stroke="#34d399" strokeWidth="1" strokeLinecap="round" className="tree-branch tree-branch-8" />

      {/* Edge connections between nodes (graph lines) */}
      <line x1="220" y1="480" x2="260" y2="350" stroke="#34d399" strokeWidth="0.8" strokeDasharray="4 4" className="tree-branch tree-branch-7" />
      <line x1="580" y1="480" x2="540" y2="350" stroke="#34d399" strokeWidth="0.8" strokeDasharray="4 4" className="tree-branch tree-branch-8" />
      <line x1="260" y1="350" x2="320" y2="280" stroke="#34d399" strokeWidth="0.8" strokeDasharray="4 4" className="tree-branch tree-branch-7" />
      <line x1="540" y1="350" x2="480" y2="280" stroke="#34d399" strokeWidth="0.8" strokeDasharray="4 4" className="tree-branch tree-branch-8" />

      {/* Root node — bottom trunk */}
      <circle cx="400" cy="620" fill="#065f46" className="tree-node tree-node-lg tree-node-1" r="0" />
      <circle cx="400" cy="620" fill="url(#nodeGlow)" className="tree-node tree-node-1" r="0" style={{ animationName: 'bloomNodeLg' }} />

      {/* Primary branch nodes */}
      <circle cx="220" cy="480" fill="#059669" className="tree-node tree-node-2" r="0" />
      <circle cx="220" cy="480" fill="url(#nodeGlow)" className="tree-node tree-node-2 tree-node-glow" r="0" />
      <circle cx="580" cy="480" fill="#059669" className="tree-node tree-node-3" r="0" />
      <circle cx="580" cy="480" fill="url(#nodeGlow)" className="tree-node tree-node-3 tree-node-glow" r="0" />

      {/* Mid-tier nodes */}
      <circle cx="400" cy="480" fill="#047857" className="tree-node tree-node-4" r="0" />
      <circle cx="260" cy="350" fill="#059669" className="tree-node tree-node-5" r="0" />
      <circle cx="260" cy="350" fill="url(#nodeGlow)" className="tree-node tree-node-5 tree-node-glow" r="0" />
      <circle cx="540" cy="350" fill="#059669" className="tree-node tree-node-6" r="0" />
      <circle cx="540" cy="350" fill="url(#nodeGlow)" className="tree-node tree-node-6 tree-node-glow" r="0" />

      {/* Upper nodes */}
      <circle cx="400" cy="400" fill="#047857" className="tree-node tree-node-7" r="0" />
      <circle cx="320" cy="280" fill="#34d399" className="tree-node tree-node-8" r="0" />
      <circle cx="320" cy="280" fill="url(#nodeGlowAmber)" className="tree-node tree-node-8 tree-node-glow" r="0" />
      <circle cx="480" cy="280" fill="#34d399" className="tree-node tree-node-9" r="0" />
      <circle cx="480" cy="280" fill="url(#nodeGlowAmber)" className="tree-node tree-node-9 tree-node-glow" r="0" />

      {/* Outermost leaf nodes */}
      <circle cx="140" cy="400" fill="#6ee7b7" className="tree-node tree-node-10" r="0" />
      <circle cx="140" cy="400" fill="url(#nodeGlow)" className="tree-node tree-node-10 tree-node-glow" r="0" />
      <circle cx="660" cy="400" fill="#6ee7b7" className="tree-node tree-node-11" r="0" />
      <circle cx="660" cy="400" fill="url(#nodeGlow)" className="tree-node tree-node-11 tree-node-glow" r="0" />

      {/* Tiny decorative dots — like pollen / data particles */}
      <circle cx="350" cy="330" r="2" fill="#6ee7b7" opacity="0.3" className="tree-leaf" style={{ animationDelay: '0s' }} />
      <circle cx="450" cy="310" r="2" fill="#6ee7b7" opacity="0.3" className="tree-leaf" style={{ animationDelay: '1s' }} />
      <circle cx="300" cy="430" r="1.5" fill="#fbbf24" opacity="0.2" className="tree-leaf" style={{ animationDelay: '2s' }} />
      <circle cx="500" cy="440" r="1.5" fill="#fbbf24" opacity="0.2" className="tree-leaf" style={{ animationDelay: '3s' }} />
      <circle cx="180" cy="450" r="1.5" fill="#34d399" opacity="0.25" className="tree-leaf" style={{ animationDelay: '1.5s' }} />
      <circle cx="620" cy="450" r="1.5" fill="#34d399" opacity="0.25" className="tree-leaf" style={{ animationDelay: '2.5s' }} />
    </svg>
  );
}

/* ─── Decorative separator star ─── */
function Star() {
  return (
    <span className="separator-star text-zinc-600 text-lg mx-6 select-none" aria-hidden="true">
      &#10038;
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SurveyModal />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-900/[0.07] blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[5%] w-[40%] h-[40%] rounded-full bg-amber-900/[0.04] blur-[120px]" />
          <div className="absolute top-[30%] right-[20%] w-[25%] h-[25%] rounded-full bg-emerald-800/[0.05] blur-[100px]" />
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>

        {/* Animated tree-graph */}
        <TreeGraph />

        {/* Hero content — layered above tree */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">

          {/* Catalog badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 mb-10"
            style={{ animation: 'fadeUp 0.6s ease-out 0.2s both' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400/80 tracking-[0.2em] uppercase">
              CSULB CS B.S. &middot; 2025&ndash;2026 Catalog
            </span>
          </div>

          <div className="hero-buttons mb-10 flex flex-wrap items-center justify-center gap-3 md:gap-5">
            <Link
              href="/graph"
              className="group rounded-full border border-zinc-700/60 px-7 py-3 text-sm uppercase tracking-[0.15em] text-zinc-300 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
              style={{ fontFamily: 'var(--font-hero)' }}
            >
              Course Map
              <span className="inline-block ml-2 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">&rarr;</span>
            </Link>

            <Star />

            <Link
              href="/planner"
              className="group rounded-full border border-zinc-700/60 px-7 py-3 text-sm uppercase tracking-[0.15em] text-zinc-300 transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
              style={{ fontFamily: 'var(--font-hero)' }}
            >
              Degree Planner
              <span className="inline-block ml-2 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">&rarr;</span>
            </Link>

            <Star />

            <Link
              href="/checklist"
              className="group rounded-full border border-zinc-700/60 px-7 py-3 text-sm uppercase tracking-[0.15em] text-zinc-300 transition-all duration-300 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
              style={{ fontFamily: 'var(--font-hero)' }}
            >
              Checklist
              <span className="inline-block ml-2 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">&rarr;</span>
            </Link>
          </div>

          {/* Title */}
          <h1 className="hero-title text-[clamp(4rem,12vw,9rem)] font-semibold italic text-white leading-[0.9] tracking-[0.02em] mb-6">
            Beach Registree
          </h1>

          {/* Tagline */}
          <p className="hero-tagline text-lg md:text-xl text-zinc-500 font-light tracking-wide max-w-md leading-relaxed mb-2">
            Your CS degree, mapped and planned.
          </p>
        </div>
      </section>

      {/* ═══════════════════ BELOW THE FOLD ═══════════════════ */}
      <div className="relative z-10">

        {/* Feature cards */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <p className="text-center text-[10px] font-mono text-zinc-600 tracking-[0.3em] uppercase mb-12">
            Three tools, one goal
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link
              href="/graph"
              className="group p-6 rounded-2xl bg-beach-card/40 border border-beach-border/60 hover:border-emerald-500/30 transition-all duration-300 hover:bg-beach-card/70 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:border-emerald-500/40 transition-colors">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6" cy="6" r="2" />
                  <circle cx="18" cy="6" r="2" />
                  <circle cx="12" cy="18" r="2" />
                  <path d="M7.5 7.5L11 16" strokeLinecap="round" />
                  <path d="M16.5 7.5L13 16" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="font-mono text-xs font-semibold text-zinc-200 mb-2.5 tracking-wide uppercase">
                Prerequisite Map
              </h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                All 82 CS courses laid out as an interactive dependency tree. Click any node to trace chains upstream and downstream.
              </p>
              <ul className="space-y-1.5">
                {["Mark courses complete", "Filter by focus area", "Transfer student mode"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="w-1 h-1 rounded-full bg-emerald-500/50 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </Link>

            <Link
              href="/planner"
              className="group p-6 rounded-2xl bg-beach-card/40 border border-beach-border/60 hover:border-amber-500/30 transition-all duration-300 hover:bg-beach-card/70 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:border-amber-500/40 transition-colors">
                <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="5" height="16" rx="1" />
                  <rect x="10" y="8" width="5" height="12" rx="1" />
                  <rect x="17" y="6" width="5" height="14" rx="1" />
                </svg>
              </div>
              <h3 className="font-mono text-xs font-semibold text-zinc-200 mb-2.5 tracking-wide uppercase">
                Plan My Degree
              </h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                Auto-generate an optimized semester schedule. Drag and drop to customize. Real-time prereq and unit validation.
              </p>
              <ul className="space-y-1.5">
                {["Drag-and-drop reordering", "Prerequisite conflict detection", "Save & load multiple plans"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </Link>

            <Link
              href="/checklist"
              className="group p-6 rounded-2xl bg-beach-card/40 border border-beach-border/60 hover:border-violet-500/30 transition-all duration-300 hover:bg-beach-card/70 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:border-violet-500/40 transition-colors">
                <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h3 className="font-mono text-xs font-semibold text-zinc-200 mb-2.5 tracking-wide uppercase">
                Progress Tracker
              </h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                Requirements checklist synced with the 2025&ndash;2026 catalog. See exactly what&apos;s done, planned, and still needed.
              </p>
              <ul className="space-y-1.5">
                {["Grouped by requirement type", "Unit counts per category", "Visual progress bar"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="w-1 h-1 rounded-full bg-violet-500/50 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="border-t border-beach-border/40 pt-14">
            <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.3em] mb-10 text-center">
              Built with data from the official CSULB catalog
            </p>
            <div className="grid grid-cols-3 gap-6">
              {[
                { stat: "82", label: "Courses mapped" },
                { stat: "13", label: "Requirement groups" },
                { stat: "3", label: "Focus areas" },
              ].map(({ stat, label }) => (
                <div key={label} className="text-center">
                  <div className="text-4xl font-light text-zinc-100 mb-1.5" style={{ fontFamily: 'var(--font-hero)' }}>{stat}</div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <h2 className="font-mono text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-10 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Mark what you\u2019ve done",
                desc: "Click courses in the graph to mark them complete. Toggle transfer mode to bulk-complete lower-division GEs.",
              },
              {
                step: "02",
                title: "Generate your plan",
                desc: "The auto-planner builds a prereq-safe semester schedule from your current position to your target graduation.",
              },
              {
                step: "03",
                title: "Tune and save",
                desc: "Drag courses between semesters, adjust unit limits, and save multiple named plan versions.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <span
                  className="text-3xl font-light text-zinc-800 leading-none flex-shrink-0"
                  style={{ fontFamily: 'var(--font-hero)' }}
                >
                  {step}
                </span>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-zinc-300 mb-1.5 tracking-wide">{title}</h4>
                  <p className="text-[12px] text-zinc-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Metadata tags */}
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {["CSULB", "CS B.S.", "2025\u20132026 Catalog", "No Account Needed", "Free"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 text-center text-[10px] text-zinc-700 font-mono border-t border-beach-border/30">
          Beach Registree &middot; Built for CSULB CECS students &middot; Not affiliated with CSULB
        </footer>
      </div>
    </div>
  );
}
