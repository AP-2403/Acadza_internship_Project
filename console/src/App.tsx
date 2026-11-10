import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { QueueSidebar } from './components/QueueSidebar';
import { QuestionViewer } from './components/QuestionViewer';
import { DiffViewer } from './components/DiffViewer';
import { StudentReplyCard } from './components/StudentReplyCard';
import { ActionControls } from './components/ActionControls';
import { AuditLogModal } from './components/AuditLogModal';
import { BonusDefectsModal } from './components/BonusDefectsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

import { QuestionData, StudentReport, ReportResult, AuditEntry, EditProposal } from './types';
import { groupReportsByQuestion } from './lib/urgency';

// Import bundled static datasets
import questionsRaw from './data/questions.json';
import reportsRaw from './data/reports.json';
import resultsRaw from './data/results.json';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Live in-memory & localStorage state
  const [resultsState, setResultsState] = useState<ReportResult[]>(() => {
    const saved = localStorage.getItem('acadza_results');
    return saved ? JSON.parse(saved) : (resultsRaw as unknown as ReportResult[]);
  });

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => {
    const saved = localStorage.getItem('acadza_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  // Index questions by _id
  const questionsMap = useMemo(() => {
    const map: Record<string, QuestionData> = {};
    (questionsRaw as unknown as QuestionData[]).forEach((q) => {
      map[q._id] = q;
    });
    return map;
  }, []);

  // Compute prioritized, grouped queue
  const groups = useMemo(() => {
    return groupReportsByQuestion(
      questionsMap,
      reportsRaw as StudentReport[],
      resultsState
    );
  }, [questionsMap, resultsState]);

  // Selected question ID in queue
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups.length > 0 ? groups[0].questionId : null
  );

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

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: groups.length,
      needsReview: groups.filter((g) => g.primaryResult.route === 'faculty_review').length,
      autoApplied: groups.filter((g) => g.primaryResult.route === 'auto_apply').length,
      noChange: groups.filter((g) => g.primaryResult.route === 'no_change').length,
    };
  }, [groups]);

  // Action handlers
  const handleApprove = (comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;

    // Record audit entry
    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: currentGroup.questionId,
      reportId: res.reportId,
      reviewer: 'Prof. A. Sharma (Physics Lead)',
      action: 'approve',
      previousRoute: res.route,
      newRoute: 'auto_apply',
      editApplied: res.edit,
      comment: comment || 'Faculty approved AI repair recommendation.',
      timestamp: new Date().toISOString(),
    };

    setAuditEntries((prev) => [entry, ...prev]);

    // Update result state for all reports associated with this question
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
      reviewer: 'Prof. A. Sharma (Physics Lead)',
      action: 'edit_approve',
      previousRoute: res.route,
      newRoute: 'auto_apply',
      editApplied: customEdit,
      comment: comment || 'Faculty manually modified and approved surgical replacement.',
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

  const handleReject = (reason: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: currentGroup.questionId,
      reportId: res.reportId,
      reviewer: 'Prof. A. Sharma (Physics Lead)',
      action: 'reject',
      previousRoute: res.route,
      newRoute: 'no_change',
      editApplied: null,
      comment: `Rejected: ${reason}`,
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
      // Don't trigger if user is typing in input or textarea
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${darkMode ? 'dark' : ''}`}>
      
      {/* Top Navigation */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenBonus={() => setIsBonusOpen(true)}
        stats={stats}
      />

      {/* Main Workspace: Left Sidebar + Center Review Pane */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Prioritized Queue Sidebar */}
        <QueueSidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={(id) => setSelectedGroupId(id)}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Center / Right: Question Review Workspace */}
        <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
          {currentGroup ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Question & Solution View */}
              <div className="flex-1 overflow-y-auto">
                <QuestionViewer group={currentGroup} />
              </div>

              {/* Bottom Pane: Diff + Student Reply + Actions */}
              <div className="shrink-0 bg-slate-900/90 border-t border-slate-800">
                <DiffViewer result={currentGroup.primaryResult} />
                
                <div className="p-4 pt-0">
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
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a question from the queue to start reviewing.
            </div>
          )}
        </main>

      </div>

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

export default App;

