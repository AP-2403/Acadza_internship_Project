import React from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  Flame, 
  Users,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { QuestionGroup } from '../types';

interface QueueSidebarProps {
  groups: QuestionGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const QueueSidebar: React.FC<QueueSidebarProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
}) => {
  // Filter logic
  const filteredGroups = groups.filter((g) => {
    // 1. Tab filter
    if (activeFilter === 'review' && g.primaryResult.route !== 'faculty_review') return false;
    if (activeFilter === 'auto' && g.primaryResult.route !== 'auto_apply') return false;
    if (activeFilter === 'dismissed' && g.primaryResult.route !== 'no_change') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = g.questionId.toLowerCase().includes(q);
      const matchSubject = g.question.subject.toLowerCase().includes(q);
      const matchChapter = g.question.chapter.toLowerCase().includes(q);
      const matchComment = g.reports.some((r) => r.comment.toLowerCase().includes(q));
      const matchRepair = g.primaryResult.repair?.toLowerCase().includes(q) || false;
      return matchId || matchSubject || matchChapter || matchComment || matchRepair;
    }

    return true;
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-800 bg-slate-900/60 h-[calc(100vh-4rem)]">
      
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search QID, subject, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-800/80 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 border border-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-1 text-xs">
          {[
            { id: 'all', label: `All (${groups.length})` },
            { id: 'review', label: `Review (${groups.filter(g => g.primaryResult.route === 'faculty_review').length})` },
            { id: 'auto', label: `Auto (${groups.filter(g => g.primaryResult.route === 'auto_apply').length})` },
            { id: 'dismissed', label: `Dismissed (${groups.filter(g => g.primaryResult.route === 'no_change').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-1 py-1 rounded text-center text-[11px] font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Queue Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No questions match the current filter.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = group.questionId === selectedGroupId;
            const res = group.primaryResult;
            const hasMultipleReports = group.reports.length > 1;

            return (
              <div
                key={group.questionId}
                onClick={() => onSelectGroup(group.questionId)}
                className={`p-3 cursor-pointer transition-all border-l-4 ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500'
                    : 'border-transparent hover:bg-slate-800/40'
                }`}
              >
                {/* Header: Urgency Score & Route Pill */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {/* Urgency Badge */}
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        group.urgencyLevel === 'critical'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : group.urgencyLevel === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                      title={`Urgency Score: ${group.urgencyScore} (Priority ranked)`}
                    >
                      <Flame className="h-3 w-3" />
                      <span>{group.urgencyScore}</span>
                    </span>

                    {/* Multiple Reports indicator */}
                    {hasMultipleReports && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Users className="h-2.5 w-2.5" />
                        <span>{group.reports.length} reports</span>
                      </span>
                    )}
                  </div>

                  {/* Route Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      res.route === 'auto_apply'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : res.route === 'faculty_review'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {res.route.replace('_', ' ')}
                  </span>
                </div>

                {/* Question Info: Subject & Chapter */}
                <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                  {group.question.subject} • <span className="text-slate-400 font-normal">{group.question.chapter}</span>
                </div>

                {/* Latest Student Comment Lead */}
                <p className="text-[11px] text-slate-400 italic line-clamp-1 mb-2">
                  "{group.reports[0].comment}"
                </p>

                {/* Footer metadata: Repair Type & QID */}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    {res.repair ? (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-blue-300 border border-slate-700">
                        {res.repair}
                      </span>
                    ) : (
                      <span className="text-slate-400">{res.verdict}</span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400">
                    ID: {group.questionId.slice(0, 8)}...
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

