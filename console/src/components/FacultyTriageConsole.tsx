import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './Navbar';
import { QueueSidebar } from './QueueSidebar';
import { QuestionViewer } from './QuestionViewer';
import { DiffViewer } from './DiffViewer';
import { StudentReplyCard } from './StudentReplyCard';
import { ActionControls } from './ActionControls';
import { AuditLogModal } from './AuditLogModal';
import { BonusDefectsModal } from './BonusDefectsModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

import { QuestionData, StudentReport, ReportResult, AuditEntry, EditProposal, User, LiveDoubt } from '../types';
import { groupReportsByQuestion } from '../lib/urgency';
import { fetchLiveDoubts, fetchQueueData, sendProfessorReply } from '../lib/api';
import { FormattedMathText } from './FormattedMath';

// Import bundled static datasets
import questionsRaw from '../data/questions.json';
import reportsRaw from '../data/reports.json';
import resultsRaw from '../data/results.json';
import {
  MessageSquare,
  Layers,
  CheckCircle2,
  Clock,
  Send,
  CheckCheck,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowUpDown,
  Calendar,
  RotateCcw
} from 'lucide-react';

interface FacultyTriageConsoleProps {
  user: User;
  onLogout: () => void;
}

export const FacultyTriageConsole: React.FC<FacultyTriageConsoleProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'live_doubts'>('triage');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>(user.subject || 'all');
  const [queueSortMethod, setQueueSortMethod] = useState<'newest' | 'oldest' | 'urgency'>('newest');

  // Live doubts filtering and sorting
  const [doubtsFilter, setDoubtsFilter] = useState<'all' | 'pending' | 'auto_applied' | 'reviewed'>('all');
  const [doubtsSort, setDoubtsSort] = useState<'newest' | 'oldest'>('newest');

  // Modals state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Faculty replying to student doubt state
  const [replyingDoubt, setReplyingDoubt] = useState<LiveDoubt | null>(null);
  const [replyVerdict, setReplyVerdict] = useState<'error_verified' | 'concept_clarified'>('error_verified');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Live reports state (merged static seed + newly submitted student feedback)
  const [liveReports, setLiveReports] = useState<StudentReport[]>(() => {
    const saved = localStorage.getItem('acadza_live_reports');
    return saved ? JSON.parse(saved) : (reportsRaw as StudentReport[]);
  });

  // Live in-memory & localStorage state
  const [resultsState, setResultsState] = useState<ReportResult[]>(() => {
    const saved = localStorage.getItem('acadza_results');
    return saved ? JSON.parse(saved) : (resultsRaw as unknown as ReportResult[]);
  });

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => {
    const saved = localStorage.getItem('acadza_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  const [liveDoubts, setLiveDoubts] = useState<LiveDoubt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch full queue data (reports + triage results + doubts)
  const loadQueueData = async () => {
    setIsRefreshing(true);
    const { reports, results } = await fetchQueueData(user.subject);
    if (reports && reports.length > 0) {
      setLiveReports(reports);
      localStorage.setItem('acadza_live_reports', JSON.stringify(reports));
    }
    if (results && results.length > 0) {
      setResultsState((prev) => {
        const map = new Map<string, ReportResult>();
        prev.forEach(r => map.set(r.reportId, r));
        results.forEach(r => {
          if (!map.has(r.reportId)) {
            map.set(r.reportId, r);
          }
        });
        return Array.from(map.values());
      });
    }

    const doubts = await fetchLiveDoubts(user.subject);
    setLiveDoubts(doubts);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadQueueData();
    const interval = setInterval(loadQueueData, 4000);
    return () => clearInterval(interval);
  }, [user.subject]);

  // Index questions by _id
  const questionsMap = useMemo(() => {
    const map: Record<string, QuestionData> = {};
    (questionsRaw as unknown as QuestionData[]).forEach((q) => {
      map[q._id] = q;
    });
    return map;
  }, []);

  // Compute prioritized, grouped queue using liveReports
  const allGroups = useMemo(() => {
    return groupReportsByQuestion(
      questionsMap,
      liveReports,
      resultsState
    );
  }, [questionsMap, liveReports, resultsState]);

  // Filter groups strictly by the professor's subject expertise
  const groups = useMemo(() => {
    const targetSubject = user.role === 'admin' ? selectedSubject : user.subject;
    if (!targetSubject || targetSubject.toLowerCase() === 'all') {
      return allGroups;
    }
    return allGroups.filter(
      (g) => g.question.subject.toLowerCase() === targetSubject.toLowerCase()
    );
  }, [allGroups, user, selectedSubject]);

  // Selected question ID in queue
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups.length > 0 ? groups[0].questionId : null
  );

  useEffect(() => {
    if (groups.length > 0 && (!selectedGroupId || !groups.find((g) => g.questionId === selectedGroupId))) {
      setSelectedGroupId(groups[0].questionId);
    }
  }, [groups, selectedGroupId]);

  const currentGroup = useMemo(() => {
    return groups.find((g) => g.questionId === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('acadza_results', JSON.stringify(resultsState));
  }, [resultsState]);

  useEffect(() => {
    localStorage.setItem('acadza_audit_log', JSON.stringify(auditEntries));
  }, [auditEntries]);

  // Stats calculation for the professor's subject queue
  const stats = useMemo(() => {
    return {
      total: groups.length,
      needsReview: groups.filter((g) => g.primaryResult.route === 'faculty_review').length,
      autoApplied: groups.filter((g) => g.primaryResult.route === 'auto_apply').length,
      noChange: groups.filter((g) => g.primaryResult.route === 'no_change').length,
    };
  }, [groups]);

  // Filtered & Sorted Live Doubts
  const filteredAndSortedDoubts = useMemo(() => {
    let list = [...liveDoubts];

    // Status filter
    if (doubtsFilter === 'pending') {
      list = list.filter((d) => d.status === 'pending');
    } else if (doubtsFilter === 'auto_applied') {
      list = list.filter((d) => d.status === 'auto_applied');
    } else if (doubtsFilter === 'reviewed') {
      list = list.filter((d) => d.status === 'reviewed' || d.status === 'dismissed');
    }

    // Time of arrival sort
    list.sort((a, b) => {
      const timeA = new Date(a.reportedAt).getTime() || 0;
      const timeB = new Date(b.reportedAt).getTime() || 0;
      return doubtsSort === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [liveDoubts, doubtsFilter, doubtsSort]);

  // Open Reply Modal for Doubt
  const handleOpenReplyModal = (doubt: LiveDoubt) => {
    setReplyingDoubt(doubt);
    setReplyVerdict('error_verified');
    setReplyText(
      'You were completely right! We verified your doubt against the formula and have updated the question in our question bank. Thank you for catching this error!'
    );
  };

  const handleVerdictChange = (verdict: 'error_verified' | 'concept_clarified') => {
    setReplyVerdict(verdict);
    if (verdict === 'error_verified') {
      setReplyText(
        'You were completely right! We verified your doubt against the formula and have updated the question in our question bank. Thank you for catching this error!'
      );
    } else {
      setReplyText(
        'Thank you for raising this doubt. We checked the derivation carefully: the official answer key and solution steps remain verified as correct. Keep up the good practice!'
      );
    }
  };

  const handleSendReplyToStudent = async () => {
    if (!replyingDoubt || !replyText.trim()) return;

    setIsSendingReply(true);
    await sendProfessorReply(
      replyingDoubt.reportId,
      replyText.trim(),
      replyVerdict,
      user.name
    );
    setIsSendingReply(false);
    setReplyingDoubt(null);
    await loadQueueData();
  };

  // Action handlers for AI triage
  const handleApprove = (comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: currentGroup.questionId,
      reportId: res.reportId,
      reviewer: `${user.name} (${user.subject || 'Admin'})`,
      action: 'approve',
      previousRoute: res.route,
      newRoute: 'auto_apply',
      editApplied: res.edit,
      comment: comment || 'Faculty approved AI repair recommendation.',
      timestamp: new Date().toISOString(),
    };

    setAuditEntries((prev) => [entry, ...prev]);

    setResultsState((prev) =>
      prev.map((item) => {
        if (item.questionId === currentGroup.questionId) {
          return { ...item, route: 'auto_apply' };
        }
        return item;
      })
    );
  };

  const handleEditApprove = (customEdit: EditProposal, comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: currentGroup.questionId,
      reportId: res.reportId,
      reviewer: `${user.name} (${user.subject || 'Admin'})`,
      action: 'edit_approve',
      previousRoute: res.route,
      newRoute: 'auto_apply',
      editApplied: customEdit,
      comment: comment || 'Faculty modified and approved AI edit.',
      timestamp: new Date().toISOString(),
    };

    setAuditEntries((prev) => [entry, ...prev]);

    setResultsState((prev) =>
      prev.map((item) => {
        if (item.questionId === currentGroup.questionId) {
          return { ...item, route: 'auto_apply', edit: customEdit };
        }
        return item;
      })
    );
  };

  const handleReject = (comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: currentGroup.questionId,
      reportId: res.reportId,
      reviewer: `${user.name} (${user.subject || 'Admin'})`,
      action: 'reject',
      previousRoute: res.route,
      newRoute: 'no_change',
      editApplied: null,
      comment: comment || 'Faculty rejected report (confirmed no error or bad report).',
      timestamp: new Date().toISOString(),
    };

    setAuditEntries((prev) => [entry, ...prev]);

    setResultsState((prev) =>
      prev.map((item) => {
        if (item.questionId === currentGroup.questionId) {
          return { ...item, route: 'no_change', edit: null };
        }
        return item;
      })
    );
  };

  const handleUpdateStudentReply = (newReply: string) => {
    if (!currentGroup) return;
    setResultsState((prev) =>
      prev.map((item) => {
        if (item.questionId === currentGroup.questionId) {
          return { ...item, student_reply: newReply };
        }
        return item;
      })
    );
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleApprove();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReject('Quick keyboard dismissal');
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = groups.findIndex((g) => g.questionId === selectedGroupId);
        if (currentIndex < groups.length - 1) {
          setSelectedGroupId(groups[currentIndex + 1].questionId);
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = groups.findIndex((g) => g.questionId === selectedGroupId);
        if (currentIndex > 0) {
          setSelectedGroupId(groups[currentIndex - 1].questionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [groups, selectedGroupId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navigation with Subject Badge & User Identity */}
      <Navbar
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenBonus={() => setIsBonusOpen(true)}
        stats={stats}
        user={user}
        onLogout={onLogout}
        selectedSubject={selectedSubject}
        onSubjectChange={(sub) => setSelectedSubject(sub)}
      />

      {/* Mode Subheader Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('triage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'triage'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>AI Triage & Review Queue ({groups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_doubts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'live_doubts'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Student Doubts & Replies ({liveDoubts.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadQueueData}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Refresh reports from backend database"
          >
            <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync Live Data</span>
          </button>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Queue: <strong>{user.subject ? `${user.subject} Dept` : selectedSubject}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'triage' ? (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Prioritized Queue Sidebar with Arrival Sorting */}
          <QueueSidebar
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={(id) => setSelectedGroupId(id)}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortMethod={queueSortMethod}
            onSortMethodChange={(s) => setQueueSortMethod(s)}
          />

          {/* Center / Right: Question Review Workspace */}
          <main className="flex-1 flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden bg-white">
            {currentGroup ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Question & Solution View */}
                <div className="flex-1 overflow-y-auto">
                  <QuestionViewer group={currentGroup} />
                </div>

                {/* Bottom Pane: Diff + Student Reply + Actions */}
                <div className="shrink-0 bg-white border-t border-slate-200">
                  <DiffViewer result={currentGroup.primaryResult} />
                  
                  <div className="p-4 pt-2">
                    <StudentReplyCard
                      reply={currentGroup.primaryResult.student_reply}
                      onUpdateReply={handleUpdateStudentReply}
                    />
                  </div>

                  <ActionControls
                    group={currentGroup}
                    onApprove={handleApprove}
                    onEditApprove={handleEditApprove}
                    onReject={handleReject}
                  />
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-600">No questions in this subject queue</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  All reports for {user.subject || selectedSubject} have either been resolved or no new reports match the active filter.
                </p>
              </div>
            )}
          </main>

        </div>
      ) : (
        /* Live Doubts & Responses Tab with Arrival Sorting & Separations */
        <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
          
          {/* Header & Controls Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Student Doubts & Explanations ({user.subject || selectedSubject})
              </h2>
              <p className="text-xs text-slate-500">
                Sorted by student arrival timestamp across status separations.
              </p>
            </div>
            
            <button
              type="button"
              onClick={loadQueueData}
              className="self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Doubts</span>
            </button>
          </div>

          {/* Separation Filters + Arrival Time Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
            
            {/* Status Separations: All, Pending, Auto-Applied, Reviewed/Dismissed */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Status:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                {[
                  { id: 'all', label: `All (${liveDoubts.length})` },
                  { id: 'pending', label: `Review (${liveDoubts.filter(d => d.status === 'pending').length})` },
                  { id: 'auto_applied', label: `Auto (${liveDoubts.filter(d => d.status === 'auto_applied').length})` },
                  { id: 'reviewed', label: `Dismissed (${liveDoubts.filter(d => d.status === 'reviewed' || d.status === 'dismissed').length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDoubtsFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      doubtsFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Arrival Sort Controls */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Arrival:</span>
              </span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDoubtsSort('newest')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                    doubtsSort === 'newest'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show newest arrival feedback first"
                >
                  <Clock className="w-3 h-3" />
                  <span>Newest First</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDoubtsSort('oldest')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                    doubtsSort === 'oldest'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show oldest arrival feedback first"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Oldest First</span>
                </button>
              </div>
            </div>

          </div>

          {/* List of Doubts */}
          {filteredAndSortedDoubts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              No student doubts match the current status filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedDoubts.map((doubt) => {
                const isCorrected = doubt.status === 'auto_applied' || doubt.verdict === 'error_verified';
                const isClarified = doubt.verdict === 'concept_clarified';
                const isPending = doubt.status === 'pending';

                return (
                  <div
                    key={doubt.reportId}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {doubt.studentId}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            QID: {doubt.questionId.slice(0, 10)}...
                          </span>
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {doubt.subject}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Arrival: {new Date(doubt.reportedAt).toLocaleDateString()} {new Date(doubt.reportedAt).toLocaleTimeString()}</span>
                          </span>
                        </div>

                        <div className="text-xs text-slate-800 font-medium pt-1">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">
                            Student Feedback:
                          </span>
                          "<FormattedMathText text={doubt.comment} />"
                        </div>
                      </div>

                      {/* Right Action / Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(doubt)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reply to Student</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(doubt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Update Reply
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupId(doubt.questionId);
                            setActiveTab('triage');
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition-colors"
                        >
                          Open in Triage
                        </button>
                      </div>
                    </div>

                    {/* Faculty Response if already sent */}
                    {doubt.studentReply && (
                      <div
                        className={`p-3 rounded-lg border text-xs leading-relaxed ${
                          isCorrected
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : isClarified
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            {isCorrected ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accepted: Student was right &bull; Question corrected</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Concept Clarified: Question verified sound</span>
                              </>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Sent to student portal
                          </span>
                        </div>
                        <p className="mt-0.5"><FormattedMathText text={doubt.studentReply} /></p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESPOND TO STUDENT DOUBT                           */}
      {/* ========================================================= */}
      {replyingDoubt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Respond to Student Doubt
                </h3>
                <p className="text-xs text-slate-500">
                  Report #{replyingDoubt.reportId} &bull; {replyingDoubt.subject} Department
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingDoubt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Student Comment Reference */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Student's Query:
                </span>
                <p className="text-slate-900 font-semibold italic">
                  "{replyingDoubt.comment}"
                </p>
              </div>

              {/* Verdict Selector Radio Cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Evaluation Verdict:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Option 1: Student is correct */}
                  <button
                    type="button"
                    onClick={() => handleVerdictChange('error_verified')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      replyVerdict === 'error_verified'
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Student is Correct</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Accept mistake & confirm that correction has been applied to question.
                    </p>
                  </button>

                  {/* Option 2: Student has misconception */}
                  <button
                    type="button"
                    onClick={() => handleVerdictChange('concept_clarified')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      replyVerdict === 'concept_clarified'
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Question is Sound</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Explain why official answer is correct & clarify student's misconception.
                    </p>
                  </button>

                </div>
              </div>

              {/* Reply Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Explanation Message for Student:
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
                  placeholder="Type explanation to explain concept or confirm correction..."
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyingDoubt(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingReply || !replyText.trim()}
                onClick={handleSendReplyToStudent}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingReply ? 'Sending...' : 'Send to Student'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entries={auditEntries}
      />

      {/* Bonus Defects Modal */}
      <BonusDefectsModal
        isOpen={isBonusOpen}
        onClose={() => setIsBonusOpen(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

    </div>
  );
};
