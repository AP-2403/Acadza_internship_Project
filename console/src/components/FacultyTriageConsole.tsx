import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './Navbar';
import { QueueSidebar } from './QueueSidebar';
import { QuestionViewer } from './QuestionViewer';
import { DiffViewer } from './DiffViewer';
import { StudentReplyCard } from './StudentReplyCard';
import { ActionControls } from './ActionControls';
import { AuditLogModal } from './AuditLogModal';
import { BonusDefectsModal } from './BonusDefectsModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { FocusTriageView } from './FocusTriageView';
import { FacultySolutionCopilot } from './FacultySolutionCopilot';

import { QuestionData, StudentReport, ReportResult, AuditEntry, EditProposal, User, LiveDoubt } from '../types';
import { groupReportsByQuestion } from '../lib/urgency';
import { 
  fetchLiveDoubts, 
  fetchQueueData, 
  sendProfessorReply, 
  approveQuestionFix, 
  rejectQuestionReport,
  callAIAssist,
  updateQuestionSolutionInDb,
  fetchAuditLog,
  AIAssistResponse
} from '../lib/api';
import { FormattedMathText } from './FormattedMath';
import { useDemoTour } from '../context/DemoTourContext';

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
  RotateCcw,
  Mic,
  MicOff,
  Sparkles,
  Database,
  AlertTriangle,
  Check
} from 'lucide-react';

interface FacultyTriageConsoleProps {
  user: User;
  onLogout: () => void;
}

export const FacultyTriageConsole: React.FC<FacultyTriageConsoleProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'live_doubts'>('triage');
  const [viewMode, setViewMode] = useState<'focus' | 'split'>('focus');
  const [showFocusCopilot, setShowFocusCopilot] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>(user.subject || 'all');
  const [queueSortMethod, setQueueSortMethod] = useState<'newest' | 'oldest' | 'urgency'>('newest');

  const { isActive: isTourActive, currentStepIndex } = useDemoTour();

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
    const targetSubject = user.role === 'admin' ? selectedSubject : user.subject;
    const { reports, results } = await fetchQueueData(targetSubject);
    if (reports && reports.length > 0) {
      setLiveReports(reports);
      localStorage.setItem('acadza_live_reports', JSON.stringify(reports));
    }
    if (results && results.length > 0) {
      setResultsState((prev) => {
        const map = new Map<string, ReportResult>();
        prev.forEach(r => map.set(r.reportId, r));
        results.forEach(r => {
          map.set(r.reportId, r);
        });
        const updated = Array.from(map.values());
        localStorage.setItem('acadza_results', JSON.stringify(updated));
        return updated;
      });
    }

    const doubts = await fetchLiveDoubts(targetSubject);
    setLiveDoubts(doubts);

    try {
      const serverLogs = await fetchAuditLog(50);
      if (serverLogs && serverLogs.length > 0) {
        setAuditEntries((prev) => {
          const map = new Map<string, AuditEntry>();
          prev.forEach(e => map.set(e.id, e));
          serverLogs.forEach((l: any) => {
            const auditId = `server_${l.id}`;
            const actionType: 'approve' | 'edit_approve' | 'reject' = 
              l.action.includes('reject') ? 'reject' : 
              l.action.includes('edit') ? 'edit_approve' : 'approve';
            map.set(auditId, {
              id: auditId,
              reportId: l.target_type === 'report' ? l.target_id : (l.details?.report_id || ''),
              questionId: l.target_type === 'question' ? l.target_id : (l.details?.question_id || ''),
              action: actionType,
              reviewer: l.actor,
              previousRoute: 'faculty_review',
              newRoute: actionType === 'reject' ? 'no_change' : 'auto_apply',
              editApplied: l.details?.edit || null,
              comment: typeof l.details === 'string' ? l.details : JSON.stringify(l.details),
              timestamp: l.created_at,
            });
          });
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          localStorage.setItem('acadza_audit_log', JSON.stringify(combined));
          return combined;
        });
      }
    } catch (e) {
      console.warn('Could not sync server audit log', e);
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    loadQueueData();
    const interval = setInterval(loadQueueData, 4000);
    return () => clearInterval(interval);
  }, [user.subject, user.role, selectedSubject]);

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

  // Synchronize selectedGroupId when subject or active filter changes
  useEffect(() => {
    const activeSubgroups = groups.filter((g) => {
      if (activeFilter === 'review') return g.primaryResult.route === 'faculty_review';
      if (activeFilter === 'auto') return g.primaryResult.route === 'auto_apply';
      if (activeFilter === 'dismissed') return g.primaryResult.route === 'no_change';
      return true;
    });

    if (activeSubgroups.length > 0) {
      if (!selectedGroupId || !activeSubgroups.find((g) => g.questionId === selectedGroupId)) {
        setSelectedGroupId(activeSubgroups[0].questionId);
      }
    } else {
      setSelectedGroupId(null);
    }
  }, [groups, activeFilter]);

  // Guided Demo Tour State Synchronizer
  useEffect(() => {
    if (!isTourActive) return;

    if (currentStepIndex === 3) {
      // Step 4: Arrived in queue
      setActiveTab('triage');
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].questionId);
      }
    } else if (currentStepIndex === 4) {
      // Step 5: Zen Focus View
      setActiveTab('triage');
      setViewMode('focus');
      setShowFocusCopilot(false);
    } else if (currentStepIndex === 5 || currentStepIndex === 6) {
      // Steps 6 & 7: Voice Co-Pilot & Sanity Check
      setActiveTab('triage');
      setShowFocusCopilot(true);
    } else if (currentStepIndex === 7) {
      // Step 8: Pedagogical Reply Synthesis & 1-Click Approval
      setActiveTab('triage');
      setShowFocusCopilot(false);
    } else if (currentStepIndex === 8) {
      // Step 9: Dean Multi-Department
      setActiveTab('triage');
    }
  }, [isTourActive, currentStepIndex, groups, selectedGroupId]);

  const currentGroup = useMemo(() => {
    return groups.find((g) => g.questionId === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  // Action status toast notification banner
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Helper to advance to the next question in the current filtered queue
  const advanceToNextGroup = (finishedQid: string) => {
    const remaining = groups.filter((g) => {
      if (activeFilter === 'review') {
        return g.questionId !== finishedQid && g.primaryResult.route === 'faculty_review';
      }
      return g.questionId !== finishedQid;
    });

    if (remaining.length > 0) {
      setSelectedGroupId(remaining[0].questionId);
    } else {
      setSelectedGroupId(null);
    }
  };

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

  // Subject breakdown counts for Dean filtering & Navbar indicators
  const subjectBreakdown = useMemo(() => {
    const counts = {
      all: allGroups.length,
      physics: 0,
      zoology: 0,
      botany: 0,
      physicsReview: 0,
      zoologyReview: 0,
      botanyReview: 0,
    };
    allGroups.forEach((g) => {
      const sub = (g.question.subject || '').toLowerCase();
      const needsRev = g.primaryResult.route === 'faculty_review';
      if (sub === 'physics') {
        counts.physics++;
        if (needsRev) counts.physicsReview++;
      } else if (sub === 'zoology') {
        counts.zoology++;
        if (needsRev) counts.zoologyReview++;
      } else if (sub === 'botany') {
        counts.botany++;
        if (needsRev) counts.botanyReview++;
      }
    });
    return counts;
  }, [allGroups]);

  // Department-filtered doubts (for Dean segmentation and Faculty subject scoping)
  const departmentDoubts = useMemo(() => {
    const activeSubject = user.role === 'admin' ? selectedSubject : user.subject;
    if (activeSubject && activeSubject.toLowerCase() !== 'all') {
      return liveDoubts.filter((d) => d.subject?.toLowerCase() === activeSubject.toLowerCase());
    }
    return liveDoubts;
  }, [liveDoubts, user, selectedSubject]);

  // Filtered & Sorted Live Doubts
  const filteredAndSortedDoubts = useMemo(() => {
    let list = [...departmentDoubts];

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
  }, [departmentDoubts, doubtsFilter, doubtsSort]);

  // Modal speech dictation and AI assist state
  const [isModalRecording, setIsModalRecording] = useState(false);
  const modalRecognitionRef = useRef<any>(null);
  const [modalAiResult, setModalAiResult] = useState<AIAssistResponse | null>(null);
  const [isModalAnalyzing, setIsModalAnalyzing] = useState(false);
  const [modalUpdateDb, setModalUpdateDb] = useState(false);

  // Toggle voice dictation in modal
  const toggleModalRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice dictation is supported in modern browsers like Google Chrome, Safari, and Microsoft Edge.');
      return;
    }

    if (isModalRecording && modalRecognitionRef.current) {
      try {
        modalRecognitionRef.current.stop();
      } catch {}
      setIsModalRecording(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setReplyText((prev) => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
        }
      };

      recognition.onerror = () => setIsModalRecording(false);
      recognition.onend = () => setIsModalRecording(false);

      modalRecognitionRef.current = recognition;
      try {
        recognition.start();
        setIsModalRecording(true);
      } catch {
        setIsModalRecording(false);
      }
    }
  };

  // Run AI Formula Check & Pedagogical Synthesis in modal
  const handleModalAiAnalyze = async () => {
    if (!replyingDoubt || !replyText.trim()) return;
    setIsModalAnalyzing(true);
    const result = await callAIAssist(
      replyingDoubt.questionId,
      replyText,
      replyingDoubt.comment,
      replyingDoubt.reportId
    );
    setIsModalAnalyzing(false);
    if (result) {
      setModalAiResult(result);
      setReplyText(result.studentReply);
      if (result.studentIsCorrect) {
        setReplyVerdict('error_verified');
      }
    }
  };

  // 1-Click Accept Suggested Correction in modal
  const handleAcceptModalCorrection = () => {
    if (!modalAiResult?.sanity.suggestedCorrection) return;
    const newText = replyText + ' -> ' + modalAiResult.sanity.suggestedCorrection;
    setReplyText(newText);
    handleModalAiAnalyze();
  };

  // Open Reply Modal for Doubt
  const handleOpenReplyModal = (doubt: LiveDoubt) => {
    setReplyingDoubt(doubt);
    setReplyVerdict('error_verified');
    setModalAiResult(null);
    setModalUpdateDb(false);
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

    // If faculty selected to update official solution in Question Bank
    if (modalUpdateDb && modalAiResult?.officialSolutionHtml) {
      await updateQuestionSolutionInDb(
        replyingDoubt.questionId,
        modalAiResult.officialSolutionHtml,
        modalAiResult.newAnswerKey || undefined,
        undefined,
        user.name,
        replyingDoubt.reportId
      );
    }

    await sendProfessorReply(
      replyingDoubt.reportId,
      replyText.trim(),
      replyVerdict,
      user.name
    );
    setIsSendingReply(false);
    setReplyingDoubt(null);
    setModalAiResult(null);
    setModalUpdateDb(false);
    await loadQueueData();

    setActionNotice('Explanation sent to student and question bank updated!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Action handlers for AI triage & question patching
  const handleApprove = async (comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;
    const qid = currentGroup.questionId;

    // 1. Call backend to apply surgical patch to question and update reports
    await approveQuestionFix(
      qid,
      res.reportId,
      res.edit,
      comment || 'Faculty approved AI repair recommendation.',
      `${user.name} (${user.subject || 'Admin'})`
    );

    // 2. Record audit log entry
    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: qid,
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

    // 3. Update local state
    setResultsState((prev) =>
      prev.map((item) => {
        if (item.questionId === qid) {
          return { ...item, route: 'auto_apply', verdict: 'error_verified' };
        }
        return item;
      })
    );

    // 4. Reload queue data and remove from current review panel
    await loadQueueData();
    advanceToNextGroup(qid);

    // 5. Toast notice
    setActionNotice('Question patched & updated! Feedback removed from active review queue.');
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleEditApprove = async (customEdit: EditProposal, comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;
    const qid = currentGroup.questionId;

    await approveQuestionFix(
      qid,
      res.reportId,
      customEdit,
      comment || 'Faculty modified and approved AI edit.',
      `${user.name} (${user.subject || 'Admin'})`
    );

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: qid,
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
        if (item.questionId === qid) {
          return { ...item, route: 'auto_apply', edit: customEdit, verdict: 'error_verified' };
        }
        return item;
      })
    );

    await loadQueueData();
    advanceToNextGroup(qid);

    setActionNotice('Custom fix applied & saved to question bank! Removed from active review panel.');
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleReject = async (comment?: string) => {
    if (!currentGroup) return;
    const res = currentGroup.primaryResult;
    const qid = currentGroup.questionId;

    await rejectQuestionReport(
      qid,
      res.reportId,
      comment,
      `${user.name} (${user.subject || 'Admin'})`
    );

    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      questionId: qid,
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
        if (item.questionId === qid) {
          return { ...item, route: 'no_change', edit: null, verdict: 'concept_sound' };
        }
        return item;
      })
    );

    await loadQueueData();
    advanceToNextGroup(qid);

    setActionNotice('Report rejected & question verified sound. Removed from review panel.');
    setTimeout(() => setActionNotice(null), 4500);
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
        subjectCounts={subjectBreakdown}
      />

      {/* Dean Department Segmentation Control Bar */}
      {user?.role === 'admin' && (
        <div id="tour-dean-dept-bar" className="bg-slate-900 border-b border-slate-800 text-white px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏛️</span>
            <span className="text-xs font-bold text-slate-100">Dean Department Segmentation:</span>
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              Filter triage and doubts across academic faculties
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedSubject === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>🌐 All Departments</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedSubject === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-900 text-slate-300'
              }`}>
                {subjectBreakdown.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubject('Physics')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedSubject === 'Physics'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>⚛️ Physics</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedSubject === 'Physics' ? 'bg-purple-700 text-white' : 'bg-slate-900 text-slate-300'
              }`}>
                {subjectBreakdown.physics}
              </span>
              {subjectBreakdown.physicsReview > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${subjectBreakdown.physicsReview} need review`} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubject('Zoology')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedSubject === 'Zoology'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>🧬 Zoology</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedSubject === 'Zoology' ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-slate-300'
              }`}>
                {subjectBreakdown.zoology}
              </span>
              {subjectBreakdown.zoologyReview > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${subjectBreakdown.zoologyReview} need review`} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubject('Botany')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedSubject === 'Botany'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>🌿 Botany</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedSubject === 'Botany' ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-300'
              }`}>
                {subjectBreakdown.botany}
              </span>
              {subjectBreakdown.botanyReview > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${subjectBreakdown.botanyReview} need review`} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode Subheader Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
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
              <span>AI Triage Queue ({groups.length})</span>
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
              <span>Student Doubts ({departmentDoubts.length})</span>
            </button>
          </div>

          {/* Mode Switcher: Calm Focus vs Split Inspector */}
          {activeTab === 'triage' && (
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'focus'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Zen Focus Mode: single question view, minimal side-clutter"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>🧘 Calm Focus</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Split Inspector: full multi-column view"
              >
                <Layers className="w-3 h-3 text-blue-600" />
                <span>📊 Split Inspector</span>
              </button>
            </div>
          )}
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
              Queue: <strong>{user.subject ? `${user.subject} Dept` : (selectedSubject === 'all' ? 'All Departments' : `${selectedSubject} Dept`)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'triage' ? (
        viewMode === 'focus' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Live Action Notice Banner */}
            {actionNotice && (
              <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span>{actionNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionNotice(null)}
                  className="text-emerald-100 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentGroup ? (
              <FocusTriageView
                group={currentGroup}
                groups={groups}
                currentIndex={Math.max(0, groups.findIndex((g) => g.questionId === selectedGroupId))}
                onSelectIndex={(idx) => {
                  if (groups[idx]) setSelectedGroupId(groups[idx].questionId);
                }}
                onApprove={handleApprove}
                onEditApprove={handleEditApprove}
                onReject={handleReject}
                onOpenCopilot={() => setShowFocusCopilot(true)}
                onUpdateReply={handleUpdateStudentReply}
                facultyName={user.name}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-600">All caught up! Zero questions awaiting review</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Every student report for {user.subject ? `${user.subject} Dept` : (selectedSubject === 'all' ? 'all departments' : `${selectedSubject} Dept`)} has been verified and resolved.
                </p>
              </div>
            )}
          </div>
        ) : (
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
              {/* Live Action Notice Banner */}
              {actionNotice && (
                <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                    <span>{actionNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionNotice(null)}
                    className="text-emerald-100 hover:text-white p-0.5 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                        questionGroup={currentGroup}
                        facultyName={user.name}
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
                    All reports for {user.subject ? `${user.subject} Dept` : (selectedSubject === 'all' ? 'all departments' : `${selectedSubject} Dept`)} have either been resolved or no new reports match the active filter.
                  </p>
                </div>
              )}
            </main>
          </div>
        )
      ) : (
        /* Live Doubts & Responses Tab with Arrival Sorting & Separations */
        <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
          
          {/* Header & Controls Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Student Doubts & Explanations ({user.subject ? `${user.subject} Dept` : (selectedSubject === 'all' ? 'All Departments' : `${selectedSubject} Dept`)})
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
                  { id: 'all', label: `All (${departmentDoubts.length})` },
                  { id: 'pending', label: `Needs Reply (${departmentDoubts.filter(d => d.status === 'pending').length})` },
                  { id: 'auto_applied', label: `Auto-Resolved (${departmentDoubts.filter(d => d.status === 'auto_applied').length})` },
                  { id: 'reviewed', label: `Replied / Closed (${departmentDoubts.filter(d => d.status === 'reviewed' || d.status === 'dismissed').length})` },
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
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            doubt.subject?.toLowerCase() === 'physics' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            doubt.subject?.toLowerCase() === 'zoology' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            doubt.subject?.toLowerCase() === 'botany' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
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

              {/* Reply Textarea & Voice/AI Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Explanation Message for Student:
                  </label>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Voice Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleModalRecording}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                        isModalRecording
                          ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      {isModalRecording ? (
                        <>
                          <MicOff className="w-3 h-3" />
                          <span>Listening... Click to Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3" />
                          <span>Dictate with Voice</span>
                        </>
                      )}
                    </button>

                    {/* AI Polish & Formula Verify Button */}
                    <button
                      type="button"
                      disabled={isModalAnalyzing || !replyText.trim()}
                      onClick={handleModalAiAnalyze}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs disabled:opacity-40"
                    >
                      <Sparkles className={`w-3 h-3 ${isModalAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isModalAnalyzing ? 'Verifying...' : 'AI Verify & Polish'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 leading-relaxed"
                    placeholder="Type or speak your approach e.g. 'Supply voltage in series LCR is root of 40 squared plus 30 squared which is 50 V so student is right and answer is option A'..."
                  />

                  {isModalRecording && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                      <span>Recording Voice...</span>
                    </div>
                  )}
                </div>

                {/* AI Sanity Check & Question-Back in Modal */}
                {modalAiResult && (
                  <div className="space-y-2 mt-2">
                    {modalAiResult.sanity.hasDiscrepancy ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-start gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="uppercase text-[10px] text-amber-700 font-extrabold block">
                              AI Formula Sanity Check
                            </span>
                            <p className="mt-0.5 leading-relaxed">{modalAiResult.sanity.questionBack}</p>
                          </div>
                        </div>

                        {modalAiResult.sanity.suggestedCorrection && (
                          <div className="flex items-center justify-between bg-white/90 p-2 rounded-lg border border-amber-200 text-[11px]">
                            <span className="font-mono text-slate-700">
                              Suggestion: <strong>{modalAiResult.sanity.suggestedCorrection}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={handleAcceptModalCorrection}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold">Formula & Calculations Verified Sound: </span>
                          <span className="text-emerald-800">
                            {modalAiResult.sanity.verifiedPoints.join(' • ') || 'Physics steps and numbers are verified.'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Update Question Bank DB checkbox */}
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="modalUpdateDb"
                        checked={modalUpdateDb}
                        onChange={(e) => setModalUpdateDb(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="modalUpdateDb" className="cursor-pointer text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Database className="w-3 h-3 text-indigo-600" />
                          <span>Update Question Bank in Database with this solution</span>
                        </span>
                        <span className="text-slate-500 block">
                          Permanently saves this derivation in the question bank for all future tests.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
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

      {/* Focus Mode Voice & Solution Co-Pilot Modal */}
      {showFocusCopilot && currentGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <FacultySolutionCopilot
              questionGroup={currentGroup}
              facultyName={user.name}
              initialReply={currentGroup.primaryResult.student_reply}
              studentDoubtText={currentGroup.reports[0]?.comment}
              onApplyReply={(replyText, updatedOfficialSolution, newAnswerKey) => {
                handleUpdateStudentReply(replyText);
                setShowFocusCopilot(false);
                setActionNotice("Faculty explanation & updated derivation ready to dispatch!");
                setTimeout(() => setActionNotice(null), 4000);
              }}
              onClose={() => setShowFocusCopilot(false)}
            />
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
