import React from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info,
  ShieldCheck,
  FileCode
} from 'lucide-react';
import { ReportResult } from '../types';

interface DiffViewerProps {
  result: ReportResult;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ result }) => {
  const { verdict, repair, edit, confidence, evidence, route } = result;

  return (
    <div className="border-t border-slate-800 bg-slate-900/70 p-4">
      
      {/* Top AI Decision Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">AI Triage Recommendation</span>
          
          {/* Verdict Chip */}
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
            {verdict}
          </span>

          {/* Repair Chip */}
          {repair && (
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30">
              repair: {repair}
            </span>
          )}
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Confidence:</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div 
                className={`h-full ${
                  confidence >= 0.95 ? 'bg-emerald-500' : confidence >= 0.90 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-200">{(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* AI Evidence Explanation */}
      <div className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300 border border-slate-800/80 mb-3 leading-relaxed flex items-start space-x-2">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-300">Faculty Proof & Evidence: </span>
          <span>{evidence}</span>
        </div>
      </div>

      {/* Surgical Diff Display */}
      {edit ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
          
          {/* Diff Header */}
          <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 font-mono">
              <FileCode className="h-3.5 w-3.5 text-indigo-400" />
              <span>Target Field: </span>
              <span className="font-bold text-indigo-300">{edit.field}</span>
            </div>
            <span className="text-[10px] text-slate-500">Atomic surgical replacement</span>
          </div>

          {/* Unified Diff View */}
          <div className="p-3 text-xs font-mono space-y-2">
            
            {/* Find / Before */}
            <div className="flex items-start space-x-2 rounded bg-red-950/30 p-2 border border-red-900/30 text-red-300">
              <span className="select-none font-bold text-red-500 shrink-0">- FIND:</span>
              <span className="break-all whitespace-pre-wrap">{edit.find || '(empty)'}</span>
            </div>

            {/* Replace / After */}
            <div className="flex items-start space-x-2 rounded bg-emerald-950/30 p-2 border border-emerald-900/30 text-emerald-300">
              <span className="select-none font-bold text-emerald-500 shrink-0">+ REPLACE:</span>
              <span className="break-all whitespace-pre-wrap">{edit.replace || '(deletion)'}</span>
            </div>

          </div>

        </div>
      ) : (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-center text-xs text-slate-500">
          {route === 'no_change' ? (
            <span>No edits required. The question and answer key were verified as correct.</span>
          ) : (
            <span>Human authoring required. Syllabus, diagrams, or distractor revisions must be drafted manually.</span>
          )}
        </div>
      )}

    </div>
  );
};

