import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Database,
  Send,
  Edit3,
  Bot,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { callAIAssist, updateQuestionSolutionInDb, AIAssistResponse } from '../lib/api';
import { FormattedMathText } from './FormattedMath';
import { QuestionGroup } from '../types';
import { useDemoTour } from '../context/DemoTourContext';

interface FacultySolutionCopilotProps {
  questionGroup: QuestionGroup;
  facultyName: string;
  initialReply?: string;
  studentDoubtText?: string;
  onApplyReply: (replyText: string, updatedOfficialSolution?: string, newAnswerKey?: string | null) => void;
  onClose?: () => void;
  compact?: boolean;
}

export const FacultySolutionCopilot: React.FC<FacultySolutionCopilotProps> = ({
  questionGroup,
  facultyName,
  initialReply = '',
  studentDoubtText = '',
  onApplyReply,
  onClose,
  compact = false,
}) => {
  const [facultyNotes, setFacultyNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAssistResponse | null>(null);
  const [customReply, setCustomReply] = useState(initialReply);
  const [updateDbSolution, setUpdateDbSolution] = useState(false);
  const [dbUpdateStatus, setDbUpdateStatus] = useState<string | null>(null);

  const { isActive: isTourActive, currentStepIndex, demoState } = useDemoTour();

  const recognitionRef = useRef<any>(null);

  // Auto-sync with Demo Tour dictation & analysis
  useEffect(() => {
    if (isTourActive) {
      if (currentStepIndex >= 5 && demoState.copilotNotes) {
        if (!facultyNotes) {
          setFacultyNotes(demoState.copilotNotes);
        }
      }
      if (currentStepIndex >= 6 && !aiResult && demoState.copilotNotes) {
        handleAnalyzeAndSynthesize(demoState.copilotNotes);
      }
    }
  }, [isTourActive, currentStepIndex, demoState.copilotNotes, facultyNotes, aiResult]);

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setFacultyNotes((prev) => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Could not start recognition', err);
        setIsRecording(false);
      }
    }
  };

  // Run AI Sanity Check & Pedagogical Synthesis
  const handleAnalyzeAndSynthesize = async (overrideText?: string) => {
    const textToAnalyze = overrideText || facultyNotes;
    if (!textToAnalyze.trim()) return;

    setIsAnalyzing(true);
    const result = await callAIAssist(
      questionGroup.questionId,
      textToAnalyze,
      studentDoubtText || questionGroup.reports[0]?.comment,
      questionGroup.primaryResult.reportId
    );

    setIsAnalyzing(false);
    if (result) {
      setAiResult(result);
      setCustomReply(result.studentReply);
    }
  };

  // 1-Click Accept Suggested Correction from AI Sanity Check
  const handleAcceptCorrection = () => {
    if (!aiResult?.sanity.suggestedCorrection) return;
    const newNotes = facultyNotes + ' -> ' + aiResult.sanity.suggestedCorrection;
    setFacultyNotes(newNotes);
    handleAnalyzeAndSynthesize(newNotes);
  };

  // Save changes and deliver to student & DB
  const handleConfirmAndDispatch = async () => {
    let finalSolutionHtml = aiResult?.officialSolutionHtml;
    let finalKey = aiResult?.newAnswerKey;

    if (updateDbSolution && (finalSolutionHtml || finalKey)) {
      setDbUpdateStatus('Updating Question Bank in Database...');
      await updateQuestionSolutionInDb(
        questionGroup.questionId,
        finalSolutionHtml || '',
        finalKey || undefined,
        undefined,
        facultyName,
        questionGroup.primaryResult.reportId
      );
      setDbUpdateStatus('Question Bank successfully updated!');
    }

    onApplyReply(customReply, finalSolutionHtml, finalKey);
    if (onClose) onClose();
  };

  return (
    <div id="tour-voice-copilot-modal" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Faculty Solution Co-Pilot & Voice Dictation</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                AI Assistant
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Speak or type your solution approach. The agent validates formulas, prevents errors, and crafts clear student explanations.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Voice & Text Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>Your Notes or Derivation Approach:</span>
          </label>

          {/* Voice Dictation Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs shadow-xs ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Listening... Click to Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Dictate with Voice</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={facultyNotes}
            onChange={(e) => setFacultyNotes(e.target.value)}
            rows={3}
            placeholder='Type or speak your approach e.g. "Supply voltage is square root of VR squared plus VL minus VC squared, giving 50 V so student is right and key should be option A"'
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 leading-relaxed text-xs"
          />

          {isRecording && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              <span>Recording Voice...</span>
            </div>
          )}
        </div>

        {/* Quick Math Symbols Helper */}
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">Quick Symbols:</span>
          {['√', '²', '³', '±', '≠', '⇒', 'λ', 'μ', 'ε₀', 'θ', 'Ω', 'V_R', 'V_L', 'V_C'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setFacultyNotes((prev) => prev + (prev.endsWith(' ') ? '' : ' ') + sym)}
              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-mono text-[10px]"
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Action Button: Analyze & Synthesize */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            disabled={!facultyNotes.trim() || isAnalyzing}
            onClick={() => handleAnalyzeAndSynthesize()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-40"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Checking Formulas...' : 'Validate Formulas & Synthesize Student Explanation'}</span>
          </button>
        </div>
      </div>

      {/* Formula Sanity Check & Question-Back Card */}
      {aiResult && (
        <div id="tour-formula-sanity-result" className="space-y-3 animate-in fade-in duration-200">
          
          {/* Discrepancy & Polite Question-Back */}
          {aiResult.sanity.hasDiscrepancy ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="uppercase text-[10px] tracking-wider text-amber-700 font-extrabold block">
                    AI Sanity Check (Gentle Clarification)
                  </span>
                  <p className="mt-0.5 font-medium leading-relaxed">
                    {aiResult.sanity.questionBack}
                  </p>
                </div>
              </div>

              {aiResult.sanity.suggestedCorrection && (
                <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                    <span className="font-bold text-slate-500">Suggested Correction:</span>
                    <FormattedMathText text={aiResult.sanity.suggestedCorrection} className="font-bold text-indigo-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptCorrection}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Accept Suggestion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center gap-2 text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Formula & Logic Verified Sound: </span>
                <span className="text-emerald-800">
                  {aiResult.sanity.verifiedPoints.join(' • ') || 'All mathematical steps and scientific relations are sound.'}
                </span>
              </div>
            </div>
          )}

          {/* Synthesized Student Explanation Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Synthesized Pedagogical Student Reply</span>
              </span>
              <span className="text-[10px] text-slate-400">
                You can edit this explanation below before sending
              </span>
            </div>

            <textarea
              value={customReply}
              onChange={(e) => setCustomReply(e.target.value)}
              rows={4}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 leading-relaxed text-xs"
            />
          </div>

          {/* Database Question Bank Update Option */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="updateDb"
                checked={updateDbSolution}
                onChange={(e) => setUpdateDbSolution(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="updateDb" className="cursor-pointer">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Update Question Bank with this Official Solution</span>
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Permanently revise the official solution in the database so all students and faculty see your approach.
                  {aiResult.newAnswerKey && (
                    <span className="text-emerald-700 font-bold ml-1">
                      (Also sets official answer key to Option {aiResult.newAnswerKey})
                    </span>
                  )}
                </p>
              </label>
            </div>

            {dbUpdateStatus && (
              <span className="text-[11px] font-bold text-indigo-700 shrink-0 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                {dbUpdateStatus}
              </span>
            )}
          </div>

          {/* Final Submit / Dispatch Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={!customReply.trim()}
              onClick={handleConfirmAndDispatch}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Apply Fix & Send Explanation to Student</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

