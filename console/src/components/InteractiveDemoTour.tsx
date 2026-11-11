import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Zap, 
  Terminal,
  Compass,
  ShieldCheck,
  CheckCircle2,
  Award,
  Mic
} from 'lucide-react';
import { useDemoTour } from '../context/DemoTourContext';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

type CornerMode = 'auto' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';

export const InteractiveDemoTour: React.FC = () => {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    isAutoPlay,
    isSpeaking,
    isMuted,
    audioProgress,
    endTour,
    nextStep,
    prevStep,
    jumpToStep,
    toggleAutoPlay,
    toggleMute,
    replayAudio,
  } = useDemoTour();

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 20, left: 20 });
  const [cornerMode, setCornerMode] = useState<CornerMode>('auto');
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Play Thank You voiceover when completion panel opens
  useEffect(() => {
    if (isCompletedModalOpen && !isMuted) {
      try {
        const audio = new Audio('/audio/thank-you.m4a');
        audio.play().catch(() => {
          const fallback = new Audio('/audio/thank-you.mp3');
          fallback.play().catch(() => {});
        });
      } catch (e) {
        console.warn('Failed to play thank you audio:', e);
      }
    }
  }, [isCompletedModalOpen, isMuted]);

  // Measure and track target element
  const updateRect = useCallback(() => {
    if (!isActive || !currentStep) return;

    let el: HTMLElement | null = null;
    if (currentStep.targetSelector) {
      el = document.querySelector(currentStep.targetSelector) as HTMLElement;
    }
    if (!el && currentStep.fallbackSelector) {
      el = document.querySelector(currentStep.fallbackSelector) as HTMLElement;
    }

    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch (e) {
        // Ignore scroll errors
      }

      const raw = el.getBoundingClientRect();
      const pad = 8;
      const rect: Rect = {
        top: Math.max(0, raw.top - pad),
        left: Math.max(0, raw.left - pad),
        width: raw.width + pad * 2,
        height: raw.height + pad * 2,
        right: raw.right + pad,
        bottom: raw.bottom + pad
      };
      setTargetRect(rect);
    } else {
      // Do NOT invent a fake cut-out hole! Set to null so clean backdrop is used
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Recalculate on step change, resize, and scroll
  useEffect(() => {
    updateRect();
    const handleEvents = () => updateRect();
    window.addEventListener('resize', handleEvents);
    window.addEventListener('scroll', handleEvents, true);

    const timer = setTimeout(updateRect, 250);

    return () => {
      window.removeEventListener('resize', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
      clearTimeout(timer);
    };
  }, [updateRect, currentStepIndex]);

  // Compute smart non-overlapping position
  const computePosition = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardEl = cardRef.current;
    const cardWidth = cardEl ? cardEl.offsetWidth : 380;
    const cardHeight = cardEl ? cardEl.offsetHeight : 340;
    const margin = 16;

    // Handle manual corner override
    if (cornerMode === 'top-right') {
      setCardPos({ top: margin, left: vw - cardWidth - margin });
      return;
    }
    if (cornerMode === 'bottom-right') {
      setCardPos({ top: vh - cardHeight - margin, left: vw - cardWidth - margin });
      return;
    }
    if (cornerMode === 'bottom-left') {
      setCardPos({ top: vh - cardHeight - margin, left: margin });
      return;
    }
    if (cornerMode === 'top-left') {
      setCardPos({ top: margin, left: margin });
      return;
    }

    // When targetRect is not found, dock neatly in top-right or center
    if (!targetRect) {
      setCardPos({ top: margin + 40, left: vw - cardWidth - margin - 20 });
      return;
    }

    // Auto smart positioning: Find side that DOES NOT overlap targetRect
    const spaceRight = vw - targetRect.right;
    const spaceLeft = targetRect.left;
    const spaceBottom = vh - targetRect.bottom;
    const spaceTop = targetRect.top;

    let finalTop = margin;
    let finalLeft = margin;

    // Priority 1: Right side of target (if fits)
    if (spaceRight >= cardWidth + margin) {
      finalLeft = targetRect.right + 12;
      finalTop = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
    }
    // Priority 2: Left side of target (if fits)
    else if (spaceLeft >= cardWidth + margin) {
      finalLeft = targetRect.left - cardWidth - 12;
      finalTop = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
    }
    // Priority 3: Below target (if fits)
    else if (spaceBottom >= cardHeight + margin) {
      finalTop = targetRect.bottom + 12;
      finalLeft = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
    }
    // Priority 4: Above target (if fits)
    else if (spaceTop >= cardHeight + margin) {
      finalTop = targetRect.top - cardHeight - 12;
      finalLeft = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
    }
    // Priority 5: Dock at corner with least overlap
    else {
      if (spaceRight >= spaceLeft) {
        finalLeft = vw - cardWidth - margin;
      } else {
        finalLeft = margin;
      }

      if (spaceBottom >= spaceTop) {
        finalTop = vh - cardHeight - margin;
      } else {
        finalTop = margin;
      }
    }

    // Strict clamping: NEVER exceed viewport bounds
    finalLeft = Math.max(margin, Math.min(finalLeft, vw - cardWidth - margin));
    finalTop = Math.max(margin, Math.min(finalTop, vh - cardHeight - margin));

    setCardPos({ top: finalTop, left: finalLeft });
  }, [targetRect, cornerMode]);

  // Recalculate position on rect or step update
  useEffect(() => {
    computePosition();
    const timer = setTimeout(computePosition, 100);
    return () => clearTimeout(timer);
  }, [computePosition, targetRect, currentStepIndex]);

  // Cycle corner positions if user clicks "Move"
  const cycleCornerMode = useCallback(() => {
    setCornerMode((prev) => {
      if (prev === 'auto') return 'top-right';
      if (prev === 'top-right') return 'bottom-right';
      if (prev === 'bottom-right') return 'bottom-left';
      if (prev === 'bottom-left') return 'top-left';
      return 'auto';
    });
  }, []);

  if (!isActive) return null;

  const roleBadgeStyle = {
    narrator: { bg: 'bg-blue-100 text-blue-800 border-blue-300' },
    student: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    faculty: { bg: 'bg-purple-100 text-purple-800 border-purple-300' },
    ai: { bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    dean: { bg: 'bg-amber-100 text-amber-800 border-amber-300' }
  }[currentStep.speakerRole] || { bg: 'bg-slate-100 text-slate-800 border-slate-300' };

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none select-none font-sans">
      
      {/* 4-Quadrant Spotlight Curtain or Full Dim Backdrop */}
      {targetRect ? (
        <>
          {/* Top Curtain */}
          <div
            className="fixed bg-slate-950/60 transition-all duration-200 pointer-events-auto z-[999990]"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, targetRect.top)
            }}
          />

          {/* Bottom Curtain */}
          <div
            className="fixed bg-slate-950/60 transition-all duration-200 pointer-events-auto z-[999990]"
            style={{
              top: targetRect.bottom,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />

          {/* Left Curtain */}
          <div
            className="fixed bg-slate-950/60 transition-all duration-200 pointer-events-auto z-[999990]"
            style={{
              top: targetRect.top,
              left: 0,
              width: Math.max(0, targetRect.left),
              height: targetRect.height
            }}
          />

          {/* Right Curtain */}
          <div
            className="fixed bg-slate-950/60 transition-all duration-200 pointer-events-auto z-[999990]"
            style={{
              top: targetRect.top,
              left: targetRect.right,
              right: 0,
              height: targetRect.height
            }}
          />

          {/* Target Element Glowing Ring & Spotlight Frame */}
          <div
            className="fixed rounded-xl pointer-events-none transition-all duration-200 ring-4 ring-blue-500/70 shadow-[0_0_30px_rgba(59,130,246,0.55)] animate-pulse z-[999992]"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height
            }}
          >
            {/* Live Step Badge on Target Frame */}
            <div className="absolute -top-6 left-2 bg-blue-600 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>STEP {currentStep.step}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="fixed inset-0 bg-slate-950/40 pointer-events-auto z-[999990]" />
      )}

      {/* Solid Opaque Tour Card (Strictly Screen-Clamped, Never Hidden or Darkened) */}
      <div
        ref={cardRef}
        className="fixed w-[380px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-28px)] bg-white border border-slate-300 rounded-2xl shadow-2xl p-4 text-slate-800 pointer-events-auto transition-all duration-200 flex flex-col z-[999999] ring-1 ring-slate-900/10"
        style={{
          top: cardPos.top,
          left: cardPos.left
        }}
      >
        {/* Card Header (Fixed / Shrink-0) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="avatar">
              {currentStep.speakerAvatar}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-xs text-slate-900 leading-tight">
                  {currentStep.speaker}
                </h4>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border uppercase tracking-wider ${roleBadgeStyle.bg}`}>
                  {currentStep.speakerRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-bold mt-0.5">
                Step {currentStep.step} of {totalSteps}: {currentStep.title}
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-0.5">
            {/* Cycle Position Button */}
            <button
              type="button"
              onClick={cycleCornerMode}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                cornerMode !== 'auto'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={`Move Card (${cornerMode})`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono">{cornerMode === 'auto' ? 'Auto' : 'Dock'}</span>
            </button>

            {/* Replay Audio */}
            <button
              type="button"
              onClick={replayAudio}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Replay Voiceover Dialogue"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={endTour}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5"
              title="Exit Guided Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar & Soundwave (Fixed / Shrink-0) */}
        <div className="shrink-0 space-y-1.5 my-2">
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-200"
              style={{ width: `${(currentStep.step / totalSteps) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 h-3">
                {[6, 12, 16, 10, 14, 18, 8].map((h, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-all duration-150 ${
                      isSpeaking && !isMuted ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                    }`}
                    style={{
                      height: isSpeaking && !isMuted ? `${h}px` : '3px',
                      animationDelay: `${i * 100}ms`
                    }}
                  />
                ))}
              </div>
              <span className="font-bold text-slate-800">
                {isSpeaking ? (isMuted ? 'Narration Muted' : 'Speaking Voiceover...') : 'Voice Ready'}
              </span>
            </div>

            <span className="font-mono font-bold text-slate-600 text-[9px]">
              {Math.round(audioProgress)}%
            </span>
          </div>
        </div>

        {/* Middle Scrollable Section: Dialogue & Architecture Note */}
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-0.5 max-h-[35vh]">
          {/* Punchy Verbatim Dialogue */}
          <div className="rounded-xl bg-blue-50/90 border border-blue-200 p-2.5 text-xs text-slate-900 leading-relaxed font-sans shadow-inner">
            <div className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>🎙️ Voiceover Line:</span>
            </div>
            <p className="italic text-slate-900 font-semibold text-[11px] leading-snug">
              "{currentStep.dialogue}"
            </p>
          </div>

          {/* Architecture & Engineering Invariant */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[10px] text-slate-700 space-y-0.5">
            <div className="flex items-center gap-1 font-bold text-slate-900 text-[9.5px] uppercase tracking-wider">
              <Terminal className="w-3 h-3 text-slate-600" />
              <span>Technical Pipeline:</span>
            </div>
            <p className="text-[10px] leading-snug font-mono text-slate-800 font-medium">
              {currentStep.dataFlowNote}
            </p>
          </div>
        </div>

        {/* Action Button & Footer Controls (Fixed / Shrink-0) */}
        <div className="shrink-0 pt-2.5 mt-1 border-t border-slate-100 space-y-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              if (currentStep.step === totalSteps) {
                setIsCompletedModalOpen(true);
              } else {
                nextStep();
              }
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-800 hover:scale-[1.01] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-bounce" />
              <span className="text-left font-black tracking-wide text-[11px]">
                {currentStep.step === totalSteps ? '🎉 Complete Demo & View Summary' : currentStep.actionLabel}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Footer Navigation Bar */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep.step === 1}
              className={`flex items-center gap-0.5 px-2 py-1 rounded font-bold text-[10px] transition-colors ${
                currentStep.step === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Prev</span>
            </button>

            {/* Auto Advance Toggle */}
            <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-700 font-bold select-none hover:text-slate-900">
              <input
                type="checkbox"
                checked={isAutoPlay}
                onChange={toggleAutoPlay}
                className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Auto-Advance</span>
            </label>

            {/* Step Dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => jumpToStep(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'bg-blue-600 w-4'
                      : idx < currentStepIndex
                      ? 'bg-emerald-500'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Thank You & Demo Summary Celebration Panel */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Top Badge & Close */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>Autonomous Pipeline Verified!</span>
              </span>

              <button
                type="button"
                onClick={() => setIsCompletedModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header & Celebration */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-blue-500/25">
                🏆
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Thank You for Experiencing Acadza!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                You just observed the complete autonomous report-to-fix pipeline, from real-time student doubt intake to faculty voice dictation, SymPy AST validation, and score restoration.
              </p>
            </div>

            {/* 4 Pillars Recap Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Zero-Hallucination Guardrails</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  AST formula checks and SymPy invariants prevent AI hallucinations and arithmetic slips.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>Voice AI Faculty Co-Pilot</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Real-time Web Speech audio streaming normalized into publication-quality KaTeX LaTeX formulas.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Idempotent Closed-Loop</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Atomic SQLite & JSON patching with immutable audit logging. Restores student scores (+4 marks).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Dean Institutional SLA</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Multi-department segmentation tracks resolution rates across Physics, Zoology, and Botany.
                </p>
              </div>
            </div>

            {/* Next Steps / Replay Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  jumpToStep(0);
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay Guided Demo Tour</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCompletedModalOpen(false);
                  endTour();
                }}
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                <span>Explore Live Platform Freely</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
