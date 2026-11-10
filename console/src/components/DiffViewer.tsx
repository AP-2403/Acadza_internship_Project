import React from 'react';
import { 
  Sparkles, 
  Info, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ReportResult, EditProposal } from '../types';
import { FormattedMathText, FormattedHtmlMath, cleanMathToReadable } from './FormattedMath';

interface DiffViewerProps {
  result: ReportResult;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ result }) => {
  const { verdict, repair, edit, confidence, evidence, route } = result;

  // Clean, subject-matter category labels (no developer / taxonomy jargon)
  const getCategoryLabel = (rep: string | null, field?: string) => {
    if (rep === 'solution_fix' || field === 'solution') return 'Solution Derivation Cleanup';
    if (rep === 'answer_key' || field === 'answer') return 'Official Answer Key Correction';
    if (rep === 'answer_form') return 'Question Unit Specification';
    if (rep === 'stem_data' || field === 'question') return 'Question Formulation Update';
    if (rep === 'type_mismatch') return 'Question Format Update';
    if (rep === 'option_repair') return 'Option Choice Completion';
    if (rep === 'identical_options') return 'Alternative Option Authoring';
    return 'Academic Content Review';
  };

  const getVerdictLabel = (v: string) => {
    if (v === 'defect' || v === 'error_verified') return 'Correction Recommended';
    if (v === 'no_error' || v === 'concept_sound') return 'Official Formulation Sound';
    if (v === 'flagged_injection') return 'Non-Academic Feedback Flagged';
    return 'Faculty Review Needed';
  };

  const getTargetSectionLabel = (field?: string) => {
    if (field === 'solution') return 'Official Solution Derivation';
    if (field === 'answer') return 'Official Answer Key';
    if (field === 'question') return 'Question Statement & Phrasing';
    return 'Question Bank Content';
  };

  const getActionDescription = (ed: EditProposal | null, rep: string | null) => {
    if (!ed) {
      return 'No modifications required. The question statement and official answer key were checked against physics principles and confirmed correct.';
    }
    if (ed.field === 'solution') {
      if (!ed.replace || ed.replace.trim() === '') {
        return 'Remove the extraneous formula prefix from the official solution derivation so the step-by-step solution remains focused and accurate.';
      }
      return 'Update the official solution derivation with the corrected mathematical steps.';
    }
    if (ed.field === 'answer') {
      return `Update the official answer key from Option ${ed.find} to Option ${ed.replace}.`;
    }
    if (ed.field === 'question') {
      return 'Update the question statement to specify the expected unit of measurement.';
    }
    return `Update ${ed.field} with the proposed subject-matter correction.`;
  };

  // Convert raw XML / MathML in edit.find to clean readable text without code tags
  const readableFind = edit ? cleanMathToReadable(edit.find) : '';
  const readableReplace = edit ? cleanMathToReadable(edit.replace) : '';

  // Determine if content contains HTML or MathML
  const hasHtmlMarkup = (str?: string) => str ? /<[a-z][\s\S]*>/i.test(str) : false;

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 p-4 space-y-3 font-sans">
      
      {/* Top Academic Decision Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Academic Verification:</span>
          
          {/* Verdict Badge */}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
            verdict === 'defect' || verdict === 'error_verified'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : verdict === 'no_error' || verdict === 'concept_sound'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {getVerdictLabel(verdict)}
          </span>

          {/* Category Chip */}
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
            {getCategoryLabel(repair, edit?.field)}
          </span>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Confidence:</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
              <div 
                className={`h-full ${
                  confidence >= 0.95 ? 'bg-emerald-500' : confidence >= 0.90 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-800">{(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Subject-Matter Proof & Academic Derivation */}
      <div className="rounded-xl bg-blue-50/70 p-3.5 text-xs text-slate-800 border border-blue-200/90 leading-relaxed flex items-start space-x-2.5">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-950">Subject Analysis & Verification: </span>
          <FormattedMathText text={evidence} className="text-slate-800 font-medium leading-relaxed" />
        </div>
      </div>

      {/* Clean Modification Card (Plain Subject-Matter Explanation - No Technical Database Terms) */}
      {edit ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          
          {/* Card Header: What Changes Need to Be Made */}
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Recommended Modification in {getTargetSectionLabel(edit.field)}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Will update Question Bank upon professor approval
            </span>
          </div>

          {/* Action Summary in Plain Subject Language */}
          <div className="px-4 py-2 bg-indigo-50/40 border-b border-indigo-100 text-xs text-indigo-950 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span><strong>What changes will be made: </strong>{getActionDescription(edit, repair)}</span>
          </div>

          {/* Clean Before & After Content (Rendered Math - No Raw XML Tags) */}
          <div className="p-4 space-y-3">
            
            {/* Current Text in Question Bank (To Be Changed) */}
            <div className="rounded-lg bg-red-50/60 p-3 border border-red-200/80">
              <div className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                <span>Current Formulation (To Be Removed / Updated):</span>
              </div>

              {/* Rendered Math Formula (No Raw XML) */}
              {hasHtmlMarkup(edit.find) ? (
                <div className="bg-white rounded p-2.5 border border-red-100 mt-1.5">
                  <div className="text-xs text-slate-800 leading-normal">
                    <FormattedHtmlMath html={edit.find} />
                  </div>
                  {readableFind && (
                    <div className="mt-1 text-[11px] text-slate-600 border-t border-slate-100 pt-1 font-sans">
                      <span className="text-slate-400 font-medium">Readable representation: </span>
                      <span className="font-semibold text-slate-800">{readableFind}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-red-950 bg-white rounded p-2 border border-red-100 mt-1">
                  {edit.find || '(empty)'}
                </div>
              )}
            </div>

            {/* Proposed Formulation (After Faculty Approval) */}
            <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-200/80">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Corrected Formulation (Upon Approval):</span>
              </div>

              {!edit.replace || edit.replace.trim() === '' ? (
                <div className="bg-white rounded p-2.5 border border-emerald-100 mt-1.5 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Extraneous calculation line will be removed from official solution.</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-5">
                    The official solution will cleanly present only the valid derivation steps.
                  </p>
                </div>
              ) : hasHtmlMarkup(edit.replace) ? (
                <div className="bg-white rounded p-2.5 border border-emerald-100 mt-1.5">
                  <div className="text-xs text-slate-800 leading-normal">
                    <FormattedHtmlMath html={edit.replace} />
                  </div>
                  {readableReplace && (
                    <div className="mt-1 text-[11px] text-slate-600 border-t border-slate-100 pt-1 font-sans">
                      <span className="text-slate-400 font-medium">Readable representation: </span>
                      <span className="font-semibold text-slate-800">{readableReplace}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-bold text-emerald-950 bg-white rounded p-2 border border-emerald-100 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{edit.field === 'answer' ? `Official Answer Key: Option ${edit.replace}` : edit.replace}</span>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-center text-xs text-slate-600 shadow-xs flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          {route === 'no_change' ? (
            <span>No question modifications required. The official derivation and keyed answer remain confirmed as correct.</span>
          ) : (
            <span>Subject faculty review requested. The professor can draft or record an official solution using the Voice & AI Co-Pilot below.</span>
          )}
        </div>
      )}

    </div>
  );
};
