import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Edit3, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Mic, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  UserCheck, 
  Clock, 
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  FileText
} from 'lucide-react';
import { QuestionGroup, EditProposal } from '../types';
import { FormattedHtmlMath, FormattedMathText, cleanMathToReadable } from './FormattedMath';
import { ActionControls } from './ActionControls';

interface FocusTriageViewProps {
  group: QuestionGroup;
  groups: QuestionGroup[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onApprove: (comment?: string) => void;
  onEditApprove: (customEdit: EditProposal, comment?: string) => void;
  onReject: (reason?: string) => void;
  onOpenCopilot: () => void;
  onUpdateReply: (reply: string) => void;
  facultyName: string;
}

export const FocusTriageView: React.FC<FocusTriageViewProps> = ({
  group,
  groups,
  currentIndex,
  onSelectIndex,
  onApprove,
  onEditApprove,
  onReject,
  onOpenCopilot,
  onUpdateReply,
  facultyName,
}) => {
  const { question, reports, primaryResult } = group;
  const { verdict, repair, edit, confidence, evidence, student_reply } = primaryResult;

  const [isEditingReply, setIsEditingReply] = useState(false);
  const [editedReply, setEditedReply] = useState(student_reply);

  // Extract question content
  const qtype = question.questionType || 'scq';
  const content = (question as any)[qtype] || {};
  const questionHtml = content.question || '';
  const solutionHtml = content.solution || '';
  const storedAnswer = content.answer !== undefined ? String(content.answer) : 'N/A';

  const [activeTab, setActiveTab] = useState<'stem' | 'solution'>('stem');

  const latestReport = reports[0];

  const formatArrivalTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent';
    }
  };

  const handleSaveReply = () => {
    onUpdateReply(editedReply);
    setIsEditingReply(false);
  };

  const hasHtml = (str?: string) => str ? /<[a-z][\s\S]*>/i.test(str) : false;
  const readableFind = edit ? cleanMathToReadable(edit.find) : '';
  const readableReplace = edit ? cleanMathToReadable(edit.replace) : '';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* Calming Progress & Glide Bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 px-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              {currentIndex + 1}
            </span>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Question {currentIndex + 1} of {groups.length}</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-700">{question.subject}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-normal">{question.chapter}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {groups.length - currentIndex - 1} more awaiting quick review in this subject
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => onSelectIndex(currentIndex - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              title="Previous question (K or Up Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentIndex >= groups.length - 1}
              onClick={() => onSelectIndex(currentIndex + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              title="Next question (J or Down Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Student's Doubt Card (Clear & Empathetic) */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-blue-50/40 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
                S
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Student Feedback & Inquiry</span>
                  {reports.length > 1 && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      {reports.length} students reported this
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Reported {formatArrivalTime(latestReport?.reportedAt)}</span>
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-blue-700 border border-blue-200 shadow-xs">
              {latestReport?.comment.toLowerCase().includes('key') ? 'Answer Key Inquiry' :
               latestReport?.comment.toLowerCase().includes('typo') ? 'Typo / Grammar Inquiry' :
               latestReport?.comment.toLowerCase().includes('diagram') ? 'Diagram Inquiry' : 'Content Doubt'}
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur-xs rounded-xl p-3.5 border border-sky-200/60 mt-2 text-xs font-medium text-slate-800 leading-relaxed shadow-xs">
            <p className="italic">
              "{latestReport?.comment || 'Student requested verification of the official question formulation.'}"
            </p>
          </div>
        </div>

        {/* 2. Question Statement Card (Crisp & Readable) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Exam Question</span>
              <span className="text-slate-300">•</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 uppercase">
                {qtype}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Current Key:</span>
              <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                Option {storedAnswer}
              </span>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('stem')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'stem' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Question & Options
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('solution')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'solution' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Stored Solution
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-800 leading-relaxed font-serif">
            {activeTab === 'stem' ? (
              <FormattedHtmlMath html={questionHtml} />
            ) : (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <FormattedHtmlMath html={solutionHtml} />
              </div>
            )}
          </div>
        </div>

        {/* 3. AI Specialist Verification & Proposed Fix (Soothing & Crystal Clear) */}
        <div id="tour-focus-diff-card" className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                AI Subject Specialist Analysis
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                verdict === 'defect' || verdict === 'error_verified'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {verdict === 'defect' || verdict === 'error_verified' ? 'Fix Recommended' : 'Formulation Sound'}
              </span>

              <span className="text-[11px] text-slate-400 font-mono">
                {(confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
          </div>

          {/* Academic Proof */}
          <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-200/70 text-xs text-slate-800 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-950 font-bold">Derivation & Verification: </strong>
              <FormattedMathText text={evidence} className="text-slate-800 font-medium" />
            </div>
          </div>

          {/* Clean Before & After (If edit proposed) */}
          {edit ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              
              {/* Before Box */}
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Current Question Bank Formulation</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-rose-100 text-xs text-slate-800 min-h-[48px] flex items-center">
                  {hasHtml(edit.find) ? (
                    <div>
                      <FormattedHtmlMath html={edit.find} />
                      {readableFind && (
                        <div className="text-[10px] text-slate-500 font-sans mt-1 pt-1 border-t border-slate-100">
                          {readableFind}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-semibold text-rose-950">
                      {edit.field === 'answer' ? `Option ${edit.find}` : edit.find || '(empty)'}
                    </span>
                  )}
                </div>
              </div>

              {/* After Box */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Will Become Upon 1-Click Approval</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-emerald-100 text-xs text-slate-800 min-h-[48px] flex items-center">
                  {!edit.replace || edit.replace.trim() === '' ? (
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Extraneous line removed cleanly
                    </span>
                  ) : hasHtml(edit.replace) ? (
                    <div>
                      <FormattedHtmlMath html={edit.replace} />
                      {readableReplace && (
                        <div className="text-[10px] text-slate-500 font-sans mt-1 pt-1 border-t border-slate-100">
                          {readableReplace}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {edit.field === 'answer' ? `Option ${edit.replace}` : edit.replace}
                    </span>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Official answer key and question statement are verified sound. No change required.</span>
            </div>
          )}

          {/* Student Explanation Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Response Dispatched to Student Upon Approval</span>
              </span>

              {!isEditingReply ? (
                <button
                  type="button"
                  onClick={() => setIsEditingReply(true)}
                  className="text-[11px] text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Customize</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveReply}
                    className="text-[11px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditedReply(student_reply); setIsEditingReply(false); }}
                    className="text-[11px] text-slate-600 hover:text-slate-800 px-2 py-0.5"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingReply ? (
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />
            ) : (
              <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                "{student_reply}"
              </p>
            )}
          </div>

        </div>

        {/* 4. Hero Quick Action Bar (Stress-Free & Inviting) */}
        <div className="sticky bottom-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <kbd className="px-2 py-1 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-bold text-slate-700">A</kbd>
            <span>Approve</span>
            <span className="text-slate-300">•</span>
            <kbd className="px-2 py-1 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-bold text-slate-700">E</kbd>
            <span>Voice / Notes</span>
            <span className="text-slate-300">•</span>
            <kbd className="px-2 py-1 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-bold text-slate-700">R</kbd>
            <span>Reject</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            
            {/* Dismiss / Reject Button */}
            <button
              type="button"
              onClick={() => onReject('Question verified mathematically sound; student clarified.')}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              title="Dismiss / Confirm no error (R)"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Verify Sound (R)</span>
            </button>

            {/* Voice & Notes Co-Pilot Button */}
            <button
              id="tour-voice-copilot-btn"
              type="button"
              onClick={onOpenCopilot}
              className="flex items-center space-x-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
              title="Speak or dictate explanation with formulas (E)"
            >
              <Mic className="w-4 h-4 text-indigo-600" />
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Voice / Notes Co-Pilot (E)</span>
            </button>

            {/* Big 1-Click Approve Button */}
            <button
              id="tour-approve-hero-btn"
              type="button"
              onClick={() => onApprove('Approved as recommended by AI triage')}
              className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.99] transition-all"
              title="Approve recommended fix and patch question bank (A)"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Approve 1-Click Fix (A)</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};

