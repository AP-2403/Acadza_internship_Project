import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  MoveHorizontal, 
  Play, 
  Pause, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Flame, 
  Terminal,
  Award
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
    overrideSide,
    endTour,
    nextStep,
    prevStep,
    jumpToStep,
    toggleAutoPlay,
    toggleMute,
    replayAudio,
    flipSide,
    executeCurrentAction
  } = useDemoTour();

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
      // Scroll element smoothly into view if needed
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
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
      // Fallback: center spotlight
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(600, vw * 0.8);
      const h = Math.min(300, vh * 0.5);
      setTargetRect({
        top: (vh - h) / 2,
        left: (vw - w) / 2,
        width: w,
        height: h,
        right: (vw + w) / 2,
        bottom: (vh + h) / 2
      });
    }
  }, [isActive, currentStep]);

  // Recalculate on step change, resize, and scroll
  useEffect(() => {
    updateRect();
    const handleEvents = () => updateRect();
    window.addEventListener('resize', handleEvents);
    window.addEventListener('scroll', handleEvents, true);

    const timer = setTimeout(updateRect, 300);

    return () => {
      window.removeEventListener('resize', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
      clearTimeout(timer);
    };
  }, [updateRect, currentStepIndex]);

  // Compute smart docked card position
  useEffect(() => {
    if (!targetRect) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = 460;
    const cardHeight = 390;
    const margin = 20;

    const side = overrideSide || currentStep.preferredSide;
    let top = 100;
    let left = 100;

    if (side === 'right') {
      if (targetRect.right + cardWidth + margin < vw) {
        left = targetRect.right + margin;
        top = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
      } else if (targetRect.left - cardWidth - margin > 0) {
        left = targetRect.left - cardWidth - margin;
        top = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
      } else {
        left = (vw - cardWidth) / 2;
        top = vh - cardHeight - margin;
      }
    } else if (side === 'left') {
      if (targetRect.left - cardWidth - margin > 0) {
        left = targetRect.left - cardWidth - margin;
        top = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
      } else if (targetRect.right + cardWidth + margin < vw) {
        left = targetRect.right + margin;
        top = Math.max(margin, Math.min(targetRect.top, vh - cardHeight - margin));
      } else {
        left = (vw - cardWidth) / 2;
        top = vh - cardHeight - margin;
      }
    } else if (side === 'top') {
      if (targetRect.top - cardHeight - margin > 0) {
        top = targetRect.top - cardHeight - margin;
        left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
      } else {
        top = targetRect.bottom + margin;
        left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
      }
    } else if (side === 'bottom') {
      if (targetRect.bottom + cardHeight + margin < vh) {
        top = targetRect.bottom + margin;
        left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
      } else {
        top = Math.max(margin, targetRect.top - cardHeight - margin);
        left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, vw - cardWidth - margin));
      }
    } else {
      // Center
      left = (vw - cardWidth) / 2;
      top = Math.max(margin, (vh - cardHeight) / 2);
    }

    // Clamp inside viewport
    left = Math.max(margin, Math.min(left, vw - cardWidth - margin));
    top = Math.max(margin, Math.min(top, vh - cardHeight - margin));

    setCardPos({ top, left });
  }, [targetRect, overrideSide, currentStep]);

  if (!isActive) return null;

  const roleBadgeStyle = {
    narrator: { bg: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
    student: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
    faculty: { bg: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
    ai: { bg: 'bg-cyan-100 text-cyan-800 border-cyan-300', dot: 'bg-cyan-500' },
    dean: { bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' }
  }[currentStep.speakerRole] || { bg: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-500' };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none font-sans">
      
      {/* 4-Quadrant Spotlight Curtain */}
      {targetRect && (
        <>
          {/* Top Curtain */}
          <div
            className="fixed bg-slate-950/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, targetRect.top)
            }}
          />

          {/* Bottom Curtain */}
          <div
            className="fixed bg-slate-950/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
            style={{
              top: targetRect.bottom,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />

          {/* Left Curtain */}
          <div
            className="fixed bg-slate-950/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
            style={{
              top: targetRect.top,
              left: 0,
              width: Math.max(0, targetRect.left),
              height: targetRect.height
            }}
          />

          {/* Right Curtain */}
          <div
            className="fixed bg-slate-950/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
            style={{
              top: targetRect.top,
              left: targetRect.right,
              right: 0,
              height: targetRect.height
            }}
          />

          {/* Target Element Glowing Ring & Spotlight Frame */}
          <div
            className="fixed rounded-xl pointer-events-none transition-all duration-300 ring-4 ring-blue-500/70 shadow-[0_0_35px_rgba(59,130,246,0.6)] animate-pulse"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height
            }}
          >
            {/* Live Target Marker Label */}
            <div className="absolute -top-7 left-2 bg-blue-600 text-white font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-md tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE TARGET: STEP {currentStep.step}</span>
            </div>
          </div>
        </>
      )}

      {/* Smart Docked Tour Card */}
      <div
        ref={cardRef}
        className="fixed w-[460px] max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-5 text-slate-800 pointer-events-auto transition-all duration-300 flex flex-col gap-3.5 z-50 ring-1 ring-slate-900/5"
        style={{
          top: cardPos.top,
          left: cardPos.left
        }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="avatar">
              {currentStep.speakerAvatar}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                  {currentStep.speaker}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${roleBadgeStyle.bg}`}>
                  {currentStep.speakerRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Step {currentStep.step} of {totalSteps}: {currentStep.title}
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={flipSide}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Flip Tour Card to Other Side"
            >
              <MoveHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={replayAudio}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Replay Voiceover Dialogue"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={endTour}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
              title="Exit Interactive Demo Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${(currentStep.step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Voice Equalizer Soundwave Indicator */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 h-4">
              {[8, 14, 20, 12, 16, 22, 10].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isSpeaking && !isMuted ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'
                  }`}
                  style={{
                    height: isSpeaking && !isMuted ? `${h}px` : '4px',
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-slate-700">
              {isSpeaking ? (isMuted ? 'Narration Muted' : 'Speaking Voiceover...') : 'Voice Ready / Paused'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold text-slate-400">
              {Math.round(audioProgress)}%
            </span>
          </div>
        </div>

        {/* Verbatim Spoken Dialogue Box */}
        <div className="relative rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-100 p-3.5 text-xs text-slate-800 leading-relaxed font-serif shadow-inner">
          <div className="absolute top-2 right-2 text-blue-200 font-serif text-3xl font-black select-none pointer-events-none opacity-40">
            “
          </div>
          <div className="relative pr-4 font-sans text-xs text-slate-900 leading-relaxed">
            <span className="font-extrabold text-blue-900 mr-1.5 uppercase text-[10px] tracking-wider block font-sans mb-1">
              🎙️ Narration Script (Verbatim):
            </span>
            <p className="italic text-slate-800 font-medium">
              "{currentStep.dialogue}"
            </p>
          </div>
        </div>

        {/* Data Flow & Architectural Invariant Pill */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[10px] uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Architecture & Data Flow:</span>
          </div>
          <p className="text-[10.5px] leading-snug font-mono text-slate-700">
            {currentStep.dataFlowNote}
          </p>
        </div>

        {/* Live Action Execution Button */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={nextStep}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-800 hover:scale-[1.01] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
              <span className="text-left font-black tracking-wide">
                {currentStep.actionLabel}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-[10px] text-slate-500 text-center font-medium">
            {currentStep.actionDescription}
          </p>
        </div>

        {/* Card Footer Navigation & Auto-play Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep.step === 1}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
              currentStep.step === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {/* Auto Play Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-semibold select-none hover:text-slate-900">
            <input
              type="checkbox"
              checked={isAutoPlay}
              onChange={toggleAutoPlay}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Auto-Advance Audio</span>
          </label>

          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'bg-blue-600 w-5'
                    : idx < currentStepIndex
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Jump to Step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
