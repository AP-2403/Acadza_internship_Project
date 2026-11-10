import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquare, 
  Layers, 
  Calendar,
  Smartphone,
  Globe,
  Tag
} from 'lucide-react';
import { QuestionGroup } from '../types';

interface QuestionViewerProps {
  group: QuestionGroup;
}

export const QuestionViewer: React.FC<QuestionViewerProps> = ({ group }) => {
  const [activeTab, setActiveTab] = useState<'question' | 'solution' | 'reports'>('question');
  const { question, reports, primaryResult } = group;

  // Extract content by questionType
  const qtype = question.questionType || 'scq';
  const content = (question as any)[qtype] || {};
  const questionHtml = content.question || '<p>No question content available.</p>';
  const solutionHtml = content.solution || '<p>No stored solution available.</p>';
  const storedAnswer = content.answer !== undefined ? String(content.answer) : 'N/A';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      
      {/* Header Bar */}
      <div className="border-b border-slate-800 p-4 bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          
          {/* Breadcrumb & Metadata */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-400 border border-blue-500/20">
              {question.subject}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium">{question.chapter}</span>
            {question.level && (
              <>
                <span className="text-slate-500">•</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {question.level}
                </span>
              </>
            )}
            <span className="text-slate-500">•</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              {qtype}
            </span>
          </div>

          {/* Current Keyed Answer Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Stored Answer Key:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/40 shadow-sm">
              {storedAnswer}
            </span>
          </div>

        </div>

        {/* Question ID and Reports Summary */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="font-mono text-[11px] text-slate-400">
            Question ID: <span className="text-slate-300 select-all">{group.questionId}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px]">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold text-slate-200">{reports.length}</span>
            <span>student report{reports.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => setActiveTab('question')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'question'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Question Stem & Options</span>
          </button>

          <button
            onClick={() => setActiveTab('solution')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'solution'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Stored Official Solution</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-inner">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Live Rendered Question (Native MathML)</span>
            </h4>
            <div 
              className="question-rendered text-slate-100 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: questionHtml }}
            />
          </div>
        )}

        {/* Tab 2: Stored Solution */}
        {activeTab === 'solution' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-inner">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Stored Solution in Database</span>
            </h4>
            <div 
              className="question-rendered text-slate-200 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: solutionHtml }}
            />
          </div>
        )}

        {/* Tab 3: Student Reports Lead Table */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Student feedback received for this question:
            </div>
            {reports.map((r, idx) => (
              <div
                key={r.reportId}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40">
                      {r.reportId}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{r.studentId}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      {r.source === 'android' || r.source === 'ios' ? (
                        <Smartphone className="h-3 w-3" />
                      ) : (
                        <Globe className="h-3 w-3" />
                      )}
                      <span className="capitalize">{r.source}</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(r.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="rounded bg-slate-950/80 p-2.5 text-xs text-amber-200/90 font-mono border border-slate-800/80">
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

