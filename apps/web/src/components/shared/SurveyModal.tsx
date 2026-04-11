"use client";

import { useState, useEffect } from "react";
import { submitToSheet } from "@/lib/surveySubmit";

/* ═══════════════════════════════════════════════════════════════
   Storage keys — shared across both survey phases
   ═══════════════════════════════════════════════════════════════ */
const INTRO_KEY = "beach-registree-intro-survey";
const POST_PLAN_KEY = "beach-registree-post-plan-survey";
const RESULTS_KEY = "beach-registree-survey-results";

function saveResponse(phase: string, data: Record<string, unknown>) {
  const entry = { phase, ...data, submittedAt: new Date().toISOString() };
  const existing = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  existing.push(entry);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(existing));
  console.log("[Survey Response]", entry);
  // Send to Google Sheet (fire-and-forget)
  submitToSheet(entry);
}

/* ═══════════════════════════════════════════════════════════════
   1. INTRO SURVEY — shown on landing page (before usage)
      Collects: current system rating + year standing
   ═══════════════════════════════════════════════════════════════ */
export function IntroSurvey() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0); // 0 = intro, 1 = questions, 2 = thanks
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [yearStanding, setYearStanding] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(INTRO_KEY)) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSubmit = () => {
    saveResponse("intro", { currentPlannerRating: rating, yearStanding });
    localStorage.setItem(INTRO_KEY, "true");
    setStep(2);
  };

  const handleDismiss = () => {
    localStorage.setItem(INTRO_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        style={{ animation: "fadeIn 0.3s ease-out" }}
      />

      <div
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeUp 0.4s ease-out" }}
      >
        {/* ─── Intro ─── */}
        {step === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-3-3v6" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Quick Question</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Before you explore, we&apos;d love a quick take on
              <br />
              CSULB&apos;s current course planning experience.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleDismiss} className="px-5 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                Skip
              </button>
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                Sure, 15 seconds
              </button>
            </div>
          </div>
        )}

        {/* ─── Questions ─── */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-lg font-semibold text-white mb-6">Before you start</h2>

            {/* Rate current system */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-300 mb-2.5">
                How would you rate CSULB&apos;s current course planning tools?
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 transition-colors ${
                        n <= (hoverRating || rating) ? "text-amber-400" : "text-zinc-700"
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-[11px] text-zinc-600 mt-1.5">
                  {rating <= 2 && "We hear you \u2014 that\u2019s why we built this."}
                  {rating === 3 && "Room for improvement."}
                  {rating >= 4 && "Good to know!"}
                </p>
              )}
            </div>

            {/* Year standing */}
            <div className="mb-7">
              <label className="block text-sm text-zinc-300 mb-2.5">
                What is your current standing?
              </label>
              <div className="flex flex-wrap gap-2">
                {["Freshman", "Sophomore", "Junior", "Senior", "Transfer"].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setYearStanding(yr)}
                    className={`px-3.5 py-1.5 text-xs rounded-full border transition-all ${
                      yearStanding === yr
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-zinc-700/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={handleDismiss} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!rating || !yearStanding}
                className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all ${
                  rating && yearStanding
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* ─── Thanks ─── */}
        {step === 2 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Thanks!</h2>
            <p className="text-sm text-zinc-400 mb-6">Now go explore your degree plan.</p>
            <button
              onClick={() => setShow(false)}
              className="px-6 py-2.5 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Start Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. POST-PLAN SURVEY — shown after first plan generation
      Collects: would you use this + suggestions
   ═══════════════════════════════════════════════════════════════ */
export function PostPlanSurvey() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0); // 0 = questions, 1 = thanks
  const [wouldUse, setWouldUse] = useState("");
  const [easeRating, setEaseRating] = useState(0);
  const [hoverEase, setHoverEase] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Parent triggers this via the `trigger` prop mechanism,
  // but we also expose a manual trigger via window event
  useEffect(() => {
    const handler = () => {
      if (!localStorage.getItem(POST_PLAN_KEY)) {
        // 10s delay so students interact with their plan before survey
        setTimeout(() => setShow(true), 10000);
      }
    };
    window.addEventListener("beach-plan-generated", handler);
    return () => window.removeEventListener("beach-plan-generated", handler);
  }, []);

  const handleSubmit = () => {
    saveResponse("post-plan", { wouldUse, easeOfUse: easeRating, feedback });
    localStorage.setItem(POST_PLAN_KEY, "true");
    setStep(1);
  };

  const handleDismiss = () => {
    localStorage.setItem(POST_PLAN_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        style={{ animation: "fadeIn 0.3s ease-out" }}
      />

      <div
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeUp 0.4s ease-out" }}
      >
        {/* ─── Questions ─── */}
        {step === 0 && (
          <div className="p-8">
            <h2 className="text-lg font-semibold text-white mb-1">
              Your plan is ready!
            </h2>
            <p className="text-sm text-zinc-500 mb-6">Quick feedback — 15 seconds.</p>

            {/* Would you use this */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-300 mb-2.5">
                Would you use Beach RegisTree for your actual course planning?
              </label>
              <div className="flex gap-2">
                {["Yes", "Maybe", "No"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setWouldUse(opt)}
                    className={`px-4 py-1.5 text-xs rounded-full border transition-all ${
                      wouldUse === opt
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-zinc-700/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Ease of use rating */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-300 mb-2.5">
                How easy was it to generate your plan?
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEaseRating(n)}
                    onMouseEnter={() => setHoverEase(n)}
                    onMouseLeave={() => setHoverEase(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 transition-colors ${
                        n <= (hoverEase || easeRating) ? "text-amber-400" : "text-zinc-700"
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="mb-7">
              <label className="block text-sm text-zinc-300 mb-2.5">
                Any suggestions? <span className="text-zinc-600">(optional)</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What would make this more useful?"
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={handleDismiss} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!wouldUse || !easeRating}
                className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all ${
                  wouldUse && easeRating
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* ─── Thanks ─── */}
        {step === 1 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Thank you!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Your feedback helps improve course planning for all CSULB students.
            </p>
            <button
              onClick={() => setShow(false)}
              className="px-6 py-2.5 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Back to My Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Default export kept for backwards compat (landing page)
   ═══════════════════════════════════════════════════════════════ */
export default IntroSurvey;
