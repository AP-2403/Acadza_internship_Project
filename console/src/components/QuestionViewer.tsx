import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  MessageSquare, 
  Layers, 
  Smartphone,
  Globe
} from 'lucide-react';
import { QuestionGroup } from '../types';
import { FormattedHtmlMath } from './FormattedMath';

interface QuestionViewerProps {
  group: QuestionGroup;
}

export const QuestionViewer: React.FC<QuestionViewerProps> = ({ group }) => {
  const [activeTab, setActiveTab] = useState<'question' | 'solution' | 'reports'>('question');
  const { question, reports } = group;

  // Extract content by questionType
  const qtype = question.questionType || 'scq';
  const content = (question as any)[qtype] || {};
  const questionHtml = content.question || '<p>No question content available.</p>';
  const solutionHtml = content.solution || '<p>No stored solution available.</p>';
  const storedAnswer = content.answer !== undefined ? String(content.answer) : 'N/A';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/60">
      
      {/* Header Bar */}
      <div className="border-b border-slate-200 p-4 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          
          {/* Breadcrumb & Metadata */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-700 border border-blue-200">
              {question.subject}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-800 font-semibold">{question.chapter}</span>
            {question.level && (
              <>
                <span className="text-slate-400">•</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                  {question.level}
                </span>
              </>
            )}
            <span className="text-slate-400">•</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 border border-slate-200">
              {qtype}
            </span>
          </div>

          {/* Current Keyed Answer Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-semibold">Stored Answer Key:</span>
            <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200 shadow-xs">
              {storedAnswer}
            </span>
          </div>

        </div>

        {/* Question ID and Reports Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="font-mono text-[11px] text-slate-500">
            Question ID: <span className="text-slate-800 font-medium select-all">{group.questionId}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px]">
            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-bold text-slate-800">{reports.length}</span>
            <span>student report{reports.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => setActiveTab('question')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'question'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Question Stem & Options</span>
          </button>

          <button
            onClick={() => setActiveTab('solution')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'solution'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Stored Official Solution</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Student Reports ({reports.length})</span>
          </button>
        </div>

      </div>

      {/* Main Content Area with Native MathML Rendering */}
      <div className="flex-1 overflow-y-auto p-5">
        
        {/* Tab 1: Question Stem */}
        {activeTab === 'question' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>Live Rendered Question (Native MathML)</span>
            </h4>
            <FormattedHtmlMath html={questionHtml} className="text-slate-900 text-sm" />
          </div>
        )}

        {/* Tab 2: Stored Solution */}
        {activeTab === 'solution' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Stored Solution in Database</span>
            </h4>
            <FormattedHtmlMath html={solutionHtml} className="text-slate-800 text-sm" />
          </div>
        )}

        {/* Tab 3: Student Reports Lead Table */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Student feedback received for this question:
            </div>
            {reports.map((r) => (
              <div
                key={r.reportId}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {r.reportId}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{r.studentId}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                    <span className="flex items-center space-x-1">
                      {r.source === 'android' || r.source === 'ios' ? (
                        <Smartphone className="h-3 w-3 text-slate-400" />
                      ) : (
                        <Globe className="h-3 w-3 text-slate-400" />
                      )}
                      <span className="capitalize">{r.source}</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(r.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50/70 p-3 text-xs text-amber-950 font-mono border border-amber-200/80">
                  "{r.comment}"
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
