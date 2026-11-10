import React from 'react';
import { 
  Search, 
  Flame, 
  Users
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
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-slate-50 h-[calc(100vh-4rem)]">
      
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-slate-200 space-y-2 bg-white/70">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search QID, subject, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-xs"
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
              className={`flex-1 py-1 rounded text-center text-[11px] font-semibold transition-colors ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-300/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Queue Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
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
                    ? 'bg-blue-50/90 border-blue-600 shadow-xs'
                    : 'border-transparent bg-white hover:bg-slate-100/80'
                }`}
              >
                {/* Header: Urgency Score & Route Pill */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {/* Urgency Badge */}
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        group.urgencyLevel === 'critical'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : group.urgencyLevel === 'high'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                      title={`Urgency Score: ${group.urgencyScore} (Priority ranked)`}
                    >
                      <Flame className="h-3 w-3" />
                      <span>{group.urgencyScore}</span>
                    </span>

                    {/* Multiple Reports indicator */}
                    {hasMultipleReports && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Users className="h-2.5 w-2.5" />
                        <span>{group.reports.length} reports</span>
                      </span>
                    )}
                  </div>

                  {/* Route Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      res.route === 'auto_apply'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : res.route === 'faculty_review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {res.route.replace('_', ' ')}
                  </span>
                </div>

                {/* Question Info: Subject & Chapter */}
                <div className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                  {group.question.subject} • <span className="text-slate-500 font-normal">{group.question.chapter}</span>
                </div>

                {/* Latest Student Comment Lead */}
                <p className="text-[11px] text-slate-600 italic line-clamp-1 mb-2 font-medium">
                  "{group.reports[0].comment}"
                </p>

                {/* Footer metadata: Repair Type & QID */}
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    {res.repair ? (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700 border border-indigo-200">
                        {res.repair}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">{res.verdict}</span>
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
