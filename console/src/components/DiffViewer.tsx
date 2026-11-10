import React from 'react';
import { 
  Sparkles, 
  Info, 
  FileCode 
} from 'lucide-react';
import { ReportResult } from '../types';

interface DiffViewerProps {
  result: ReportResult;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ result }) => {
  const { verdict, repair, edit, confidence, evidence, route } = result;

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 p-4">
      
      {/* Top AI Decision Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">AI Triage Recommendation:</span>
          
          {/* Verdict Chip */}
          <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200 shadow-xs">
            {verdict}
          </span>

          {/* Repair Chip */}
          {repair && (
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              repair: {repair}
            </span>
          )}
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

      {/* AI Evidence Explanation */}
      <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-slate-800 border border-blue-200 mb-3 leading-relaxed flex items-start space-x-2">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-900">Faculty Proof & Evidence: </span>
          <span className="text-slate-700">{evidence}</span>
        </div>
      </div>

      {/* Surgical Diff Display */}
      {edit ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          
          {/* Diff Header */}
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-1.5 font-mono">
              <FileCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>Target Field: </span>
              <span className="font-bold text-indigo-700">{edit.field}</span>
            </div>
            <span className="text-[10px] text-slate-500">Atomic surgical replacement</span>
          </div>

          {/* Unified Diff View */}
          <div className="p-3 text-xs font-mono space-y-2">
            
            {/* Find / Before */}
            <div className="flex items-start space-x-2 rounded bg-red-50 p-2.5 border border-red-200 text-red-900">
              <span className="select-none font-bold text-red-600 shrink-0">- FIND:</span>
              <span className="break-all whitespace-pre-wrap font-medium">{edit.find || '(empty)'}</span>
            </div>

            {/* Replace / After */}
            <div className="flex items-start space-x-2 rounded bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-900">
              <span className="select-none font-bold text-emerald-600 shrink-0">+ REPLACE:</span>
              <span className="break-all whitespace-pre-wrap font-bold">{edit.replace || '(deletion)'}</span>
            </div>

          </div>

        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center text-xs text-slate-500 shadow-xs">
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
