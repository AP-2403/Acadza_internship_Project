import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Flame, 
  Users,
  Clock,
  ArrowUpDown,
  Calendar
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
  sortMethod?: 'newest' | 'oldest' | 'urgency';
  onSortMethodChange?: (sort: 'newest' | 'oldest' | 'urgency') => void;
}

export const QueueSidebar: React.FC<QueueSidebarProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  sortMethod: externalSort,
  onSortMethodChange,
}) => {
  const [internalSort, setInternalSort] = useState<'newest' | 'oldest' | 'urgency'>('newest');
  const currentSort = externalSort || internalSort;

  const handleSortChange = (newSort: 'newest' | 'oldest' | 'urgency') => {
    if (onSortMethodChange) {
      onSortMethodChange(newSort);
    } else {
      setInternalSort(newSort);
    }
  };

  // Helper to format ISO arrival timestamp
  const formatArrivalTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
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

  // 1. Filter logic
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Separation tab filters
      if (activeFilter === 'review' && g.primaryResult.route !== 'faculty_review') return false;
      if (activeFilter === 'auto' && g.primaryResult.route !== 'auto_apply') return false;
      if (activeFilter === 'dismissed' && g.primaryResult.route !== 'no_change') return false;

      // Search query filter
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
  }, [groups, activeFilter, searchQuery]);

  // 2. Sorting by Time of Arrival or Urgency
  const sortedGroups = useMemo(() => {
    const list = [...filteredGroups];
    if (currentSort === 'newest') {
      return list.sort((a, b) => {
        const timeA = Math.max(...a.reports.map((r) => new Date(r.reportedAt).getTime() || 0));
        const timeB = Math.max(...b.reports.map((r) => new Date(r.reportedAt).getTime() || 0));
        return timeB - timeA; // Descending: latest feedback first
      });
    } else if (currentSort === 'oldest') {
      return list.sort((a, b) => {
        const timeA = Math.min(...a.reports.map((r) => new Date(r.reportedAt).getTime() || 0));
        const timeB = Math.min(...b.reports.map((r) => new Date(r.reportedAt).getTime() || 0));
        return timeA - timeB; // Ascending: earliest feedback first
      });
    } else {
      // Urgency priority
      return list.sort((a, b) => b.urgencyScore - a.urgencyScore);
    }
  }, [filteredGroups, currentSort]);

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-slate-50 h-[calc(100vh-6.5rem)]">
      
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-slate-200 space-y-2 bg-white/70">
        
        {/* Search Input */}
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

        {/* Separation Status Tabs: All, Review, Auto, Dismissed */}
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

        {/* Arrival Time Sorting Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-1 text-slate-500 font-semibold">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>Sort By:</span>
          </div>

          <div className="inline-flex rounded-md p-0.5 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => handleSortChange('newest')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                currentSort === 'newest'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sort by latest student arrival time"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Newest</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('oldest')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                currentSort === 'oldest'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sort by oldest student arrival time"
            >
              <Calendar className="w-2.5 h-2.5" />
              <span>Oldest</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('urgency')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                currentSort === 'urgency'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sort by urgency priority score"
            >
              <Flame className="w-2.5 h-2.5" />
              <span>Urgency</span>
            </button>
          </div>
        </div>

      </div>

      {/* Grouped Queue Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {sortedGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No questions match the current filter.
          </div>
        ) : (
          sortedGroups.map((group, idx) => {
            const isSelected = group.questionId === selectedGroupId;
            const res = group.primaryResult;
            const hasMultipleReports = group.reports.length > 1;
            const latestReport = group.reports[0];

            return (
              <div
                key={group.questionId}
                id={idx === 0 ? 'tour-faculty-queue-item' : undefined}
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
                      title={`Urgency Score: ${group.urgencyScore}`}
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
                  "{latestReport.comment}"
                </p>

                {/* Footer metadata: Time of Arrival + Repair Type & QID */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100/60">
                  <div className="flex items-center gap-1 text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatArrivalTime(latestReport.reportedAt)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {res.repair ? (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700 border border-indigo-200">
                        {res.repair}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">{res.verdict}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
