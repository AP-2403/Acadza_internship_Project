import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  LogOut,
  Sparkles,
  ChevronRight,
  MessageSquarePlus,
  AlertTriangle,
  Award,
  BookOpen,
  FileText,
  Check,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { User, QuestionTestResult, TestStats, StudentDoubtItem } from '../types';
import { submitStudentTest, submitStudentDoubt, fetchStudentDoubts } from '../lib/api';
import questionsRaw from '../data/questions.json';

interface StudentTestPortalProps {
  user: User;
  onLogout: () => void;
}

export const StudentTestPortal: React.FC<StudentTestPortalProps> = ({ user, onLogout }) => {
  // Navigation phases: 'library' (dashboard), 'solving' (taking test), 'results' (review & doubts), 'doubts' (faculty responses)
  const [phase, setPhase] = useState<'library' | 'solving' | 'results' | 'doubts'>('library');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app modal states
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [hasAgreedInstructions, setHasAgreedInstructions] = useState(false);

  // Results state
  const [stats, setStats] = useState<TestStats | null>(null);
  const [results, setResults] = useState<QuestionTestResult[]>([]);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Feedback input state per question: { [qid]: comment }
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, { reportId: string; message: string }>>({});
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState<string | null>(null);

  // Student Doubts & Faculty Responses state
  const [myDoubts, setMyDoubts] = useState<StudentDoubtItem[]>([]);
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);

  const questions = useMemo(() => questionsRaw as any[], []);

  // Filtered solving questions by subject
  const [solvingSubject, setSolvingSubject] = useState<'all' | 'Physics' | 'Zoology' | 'Botany'>('all');

  const visibleSolvingQuestions = useMemo(() => {
    if (solvingSubject === 'all') return questions;
    return questions.filter((q) => q.subject === solvingSubject);
  }, [questions, solvingSubject]);

  const currentQuestion = visibleSolvingQuestions[currentIndex] || visibleSolvingQuestions[0];
  const currentQId = currentQuestion ? currentQuestion._id : '';

  // Calculate attempted vs not attempted counts
  const attemptedCount = useMemo(() => Object.keys(answers).length, [answers]);
  const notAttemptedCount = useMemo(() => questions.length - attemptedCount, [questions.length, attemptedCount]);

  // Load student doubts & faculty responses
  const loadDoubts = async () => {
    setIsLoadingDoubts(true);
    const doubts = await fetchStudentDoubts(user.username);
    setMyDoubts(doubts);
    setIsLoadingDoubts(false);
  };

  useEffect(() => {
    loadDoubts();
    const interval = setInterval(loadDoubts, 6000);
    return () => clearInterval(interval);
  }, [user.username]);

  // Handle option selection
  const handleSelectOption = (qid: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: option
    }));
  };

  const handleClearAnswer = (qid: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  // Start test from library
  const handleStartTest = () => {
    setShowInstructionsModal(false);
    setAnswers({});
    setCurrentIndex(0);
    setPhase('solving');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final submission confirmation from custom modal
  const handleConfirmSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);
    const { stats: calculatedStats, results: evaluatedResults } = await submitStudentTest(
      answers,
      user.username
    );
    setStats(calculatedStats);
    setResults(evaluatedResults);
    setIsSubmitting(false);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle individual question doubt submission
  const handleSendDoubt = async (qid: string) => {
    const text = feedbackTexts[qid];
    if (!text || !text.trim()) return;

    setSubmittingFeedbackId(qid);
    const res = await submitStudentDoubt(qid, text.trim(), user.username);
    setSubmittingFeedbackId(null);

    if (res.success) {
      setSubmittedFeedbacks((prev) => ({
        ...prev,
        [qid]: { reportId: res.reportId, message: res.message }
      }));
      setFeedbackTexts((prev) => ({ ...prev, [qid]: '' }));
      loadDoubts(); // Refresh doubts list
    }
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (resultsFilter !== 'all' && r.status !== resultsFilter) return false;
      if (subjectFilter !== 'all' && r.subject.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      return true;
    });
  }, [results, resultsFilter, subjectFilter]);

  // Render question text with MathML
  const renderFormattedHtml = (htmlContent: string) => {
    return (
      <div
        className="question-body text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">Acadza Student Portal</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                JEE & NEET Test Series
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Logged in as <span className="font-semibold text-slate-700">{user.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {/* Main Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setPhase('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                phase === 'library'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Test Library</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadDoubts();
                setPhase('doubts');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                phase === 'doubts'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>My Doubts & Faculty Responses</span>
              {myDoubts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                  {myDoubts.length}
                </span>
              )}
            </button>
          </div>

          {phase === 'solving' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Standard Test Time</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Submit Test Paper</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {phase === 'results' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhase('library')}
                className="px-3.5 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Test Library</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setCurrentIndex(0);
                  setPhase('solving');
                }}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Test</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* PHASE 0: TEST LIBRARY & DASHBOARD                         */}
      {/* ========================================================= */}
      {phase === 'library' && (
        <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white p-6 sm:p-8 shadow-md">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>JEE & NEET All-India Test Series</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {user.name}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed">
                Choose a test paper from your library below. Attempt all questions under realistic exam conditions, receive instant auto-grading, and submit any question doubts straight to the specialized subject faculty.
              </p>
            </div>
          </div>

          {/* Test Paper Library Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Available Test Papers</h2>
                <p className="text-xs text-slate-500">Select a test paper to view syllabus and begin</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                1 Test Assigned
              </span>
            </div>

            {/* Paper 1 Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Paper Info Left */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                      PAPER 1
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-800">
                      Full Syllabus Mock Test
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready to Start</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900">
                    JEE / NEET Comprehensive Mock Examination — Paper 1
                  </h3>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    A rigorous 43-question test covering high-yield JEE & NEET topics across Physics, Zoology, and Botany. Features single-choice, multiple-choice, and numerical integer problems.
                  </p>

                  {/* Subject Breakdown Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Subject Coverage:</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                      ⚛️ Physics (33 Questions)
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      🧬 Zoology (6 Questions)
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                      🌿 Botany (4 Questions)
                    </span>
                  </div>
                </div>

                {/* Paper Stats & Start Action Right */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                  <div className="grid grid-cols-2 gap-4 text-left lg:text-right">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Questions</div>
                      <div className="text-lg font-black text-slate-800">43 Questions</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Duration</div>
                      <div className="text-lg font-black text-slate-800">60 Mins</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Marking Scheme</div>
                      <div className="text-xs font-bold text-slate-700">+4 / -1 / 0</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Faculty Replies</div>
                      <div className="text-xs font-bold text-indigo-600">Active Live</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowInstructionsModal(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>View Instructions & Start</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Test History if completed */}
            {stats && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    <Award className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Previous Attempt Completed
                    </div>
                    <div className="text-xs text-slate-500">
                      Score: <strong className="text-emerald-700">{stats.scorePercent}%</strong> &bull; {stats.correct} Correct, {stats.incorrect} Wrong
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPhase('results')}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                >
                  View Scorecard & Doubts
                </button>
              </div>
            )}

          </div>

        </main>
      )}

      {/* ========================================================= */}
      {/* PHASE 3: MY DOUBTS & FACULTY RESPONSES                    */}
      {/* ========================================================= */}
      {phase === 'doubts' && (
        <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-indigo-600" />
                <span>My Doubts & Faculty Responses</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Every doubt you submit during test review is reviewed by your subject professor. See their explanations and question corrections below.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDoubts}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingDoubts ? 'animate-spin' : ''}`} />
              <span>Refresh Responses</span>
            </button>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Doubts Reported
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {myDoubts.length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Corrections Made (Student Correct)</span>
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {myDoubts.filter((d) => d.isCorrected).length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Concept Clarifications</span>
              </span>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {myDoubts.filter((d) => d.verdict === 'concept_clarified').length}
              </div>
            </div>
          </div>

          {/* List of Doubts */}
          {myDoubts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <MessageSquarePlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Doubts Submitted Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                When you solve a test and report a mistake or ask a doubt under any question, the faculty's explanations and verification feedback will appear right here.
              </p>
              <button
                type="button"
                onClick={() => setPhase('library')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                Go to Test Library
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myDoubts.map((doubt) => {
                const isCorrected = doubt.isCorrected;
                const isClarified = doubt.verdict === 'concept_clarified';
                const isPending = doubt.status === 'pending';

                return (
                  <div
                    key={doubt.reportId}
                    className={`bg-white rounded-2xl border p-6 shadow-sm space-y-4 ${
                      isCorrected
                        ? 'border-emerald-300 border-l-4 border-l-emerald-500'
                        : isClarified
                        ? 'border-blue-300 border-l-4 border-l-blue-500'
                        : 'border-slate-200 border-l-4 border-l-amber-400'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {doubt.subject}
                        </span>
                        {doubt.questionDetails?.chapter && (
                          <span className="text-xs font-medium text-slate-600">
                            {doubt.questionDetails.chapter}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {doubt.questionId.slice(0, 8)}...
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCorrected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Correction Verified & Applied</span>
                          </span>
                        )}
                        {isClarified && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Concept Clarified by Faculty</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Awaiting Faculty Review</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Snippet if available */}
                    {doubt.questionDetails?.questionText && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-h-24 overflow-y-auto">
                        <div className="font-semibold text-slate-400 text-[10px] uppercase mb-1">
                          Question Reference:
                        </div>
                        {renderFormattedHtml(doubt.questionDetails.questionText)}
                      </div>
                    )}

                    {/* Student's reported doubt */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                        Your Reported Doubt:
                      </div>
                      <p className="text-slate-900 font-medium italic">
                        "{doubt.studentComment}"
                      </p>
                    </div>

                    {/* Faculty Explanation Card */}
                    <div
                      className={`p-4 rounded-xl border ${
                        isCorrected
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isClarified
                          ? 'bg-blue-50/70 border-blue-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                              isCorrected ? 'bg-emerald-600' : isClarified ? 'bg-blue-600' : 'bg-amber-600'
                            }`}
                          >
                            👨‍🏫
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {doubt.facultyName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {doubt.subject} Department
                            </div>
                          </div>
                        </div>

                        {doubt.resolvedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(doubt.resolvedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-800 leading-relaxed pt-1">
                        {isCorrected && (
                          <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>You were correct!</span>
                          </div>
                        )}
                        <p>{doubt.studentReply}</p>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </main>
      )}

      {/* ========================================================= */}
      {/* PHASE 1: SOLVING MODE (THE QUESTION PAPER)                 */}
      {/* ========================================================= */}
      {phase === 'solving' && currentQuestion && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Question Solving Area */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Question Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                
                {/* Meta Pills */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                      Q {currentIndex + 1} of {visibleSolvingQuestions.length}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {currentQuestion.subject}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {currentQuestion.chapter || 'General'}
                    </span>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {currentQuestion.questionType}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {answers[currentQId] ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected: Option {answers[currentQId]}
                      </span>
                    ) : (
                      <span className="text-slate-400">Unanswered</span>
                    )}
                  </div>
                </div>

                {/* Question Body */}
                <div className="text-slate-900 text-base leading-relaxed py-2">
                  {renderFormattedHtml(
                    currentQuestion[currentQuestion.questionType]?.question || 'No question text provided.'
                  )}
                </div>

                {/* Question Images if any */}
                {currentQuestion[currentQuestion.questionType]?.quesImages?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {currentQuestion[currentQuestion.questionType].quesImages.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        alt="Question Diagram"
                        className="max-h-60 rounded border border-slate-200"
                      />
                    ))}
                  </div>
                )}

                {/* Options Selection Area */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Select Your Answer:
                  </div>

                  {currentQuestion.questionType === 'integerQuestion' ? (
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Numerical Integer Answer:
                      </label>
                      <input
                        type="text"
                        value={answers[currentQId] || ''}
                        onChange={(e) => handleSelectOption(currentQId, e.target.value)}
                        placeholder="Enter numerical value..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const isSelected = answers[currentQId] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(currentQId, opt)}
                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-slate-300 text-slate-700'
                                }`}
                              >
                                {opt}
                              </span>
                              <span className="text-sm font-semibold">Option {opt}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleClearAnswer(currentQId)}
                    disabled={!answers[currentQId]}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium px-3 py-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    Clear Choice
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {currentIndex < visibleSolvingQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSubmitModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Finish & Submit</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </main>

          {/* Right Question Palette Sidebar */}
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
            <div className="p-4 border-b border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Subject Filter
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['all', 'Physics', 'Zoology', 'Botany'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSolvingSubject(sub);
                      setCurrentIndex(0);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors ${
                      solvingSubject === sub
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sub === 'all' ? 'All (43)' : sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Answered Counter */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Progress:</span>
              <span className="font-bold text-blue-700">
                {attemptedCount} / {questions.length} Answered
              </span>
            </div>

            {/* Numbers Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Question Navigator
              </div>
              <div className="grid grid-cols-5 gap-2">
                {visibleSolvingQuestions.map((q, idx) => {
                  const isAnswered = !!answers[q._id];
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'ring-2 ring-blue-600 ring-offset-1 z-10'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette Legend */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block"></span>
                <span>Answered ({attemptedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 inline-block"></span>
                <span>Not Attempted ({notAttemptedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border-2 border-blue-600 inline-block"></span>
                <span>Current Question</span>
              </div>
            </div>
          </aside>

        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 2: RESULTS & DOUBT REPORTING MODE                    */}
      {/* ========================================================= */}
      {phase === 'results' && stats && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Scorecard Summary Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
                    <Award className="w-4 h-4" />
                    <span>Auto-Graded Test Assessment Result</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Score: {stats.scorePercent}%
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Review your answers below. Have a doubt or notice an error in any question? Type it directly in the feedback box under that question to forward it straight to the subject faculty!
                  </p>
                </div>

                {/* Score Pills Grid */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  
                  {/* Correct (Green) */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[110px]">
                    <div className="text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Correct</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-800 mt-0.5">
                      {stats.correct}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">Green Badge</div>
                  </div>

                  {/* Wrong (Red) */}
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center min-w-[110px]">
                    <div className="text-rose-700 text-xs font-semibold flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Wrong</span>
                    </div>
                    <div className="text-2xl font-black text-rose-800 mt-0.5">
                      {stats.incorrect}
                    </div>
                    <div className="text-[10px] text-rose-600 font-medium">Red Badge</div>
                  </div>

                  {/* Unattempted (Grey) */}
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center min-w-[110px]">
                    <div className="text-slate-600 text-xs font-semibold flex items-center justify-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Unattempted</span>
                    </div>
                    <div className="text-2xl font-black text-slate-700 mt-0.5">
                      {stats.total - stats.attempted}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Grey Badge</div>
                  </div>

                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Filter By Status:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setResultsFilter('all')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        resultsFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({results.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('correct')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        resultsFilter === 'correct'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      🟢 Correct ({stats.correct})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('wrong')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        resultsFilter === 'wrong'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 hover:text-rose-900'
                      }`}
                    >
                      🔴 Wrong ({stats.incorrect})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('unattempted')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        resultsFilter === 'unattempted'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚪ Unattempted ({stats.total - stats.attempted})
                    </button>
                  </div>
                </div>

                {/* Subject Selector Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Subject:</span>
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Subjects (43)</option>
                    <option value="Physics">Physics (33)</option>
                    <option value="Zoology">Zoology (6)</option>
                    <option value="Botany">Botany (4)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions List with Status-Colored Borders & Doubts Area */}
            <div className="space-y-6">
              {filteredResults.map((item, idx) => {
                const isCorrect = item.status === 'correct';
                const isWrong = item.status === 'wrong';
                const isUnattempted = item.status === 'unattempted';

                const borderClass = isCorrect
                  ? 'border-emerald-300 border-l-4 border-l-emerald-500'
                  : isWrong
                  ? 'border-rose-300 border-l-4 border-l-rose-500'
                  : 'border-slate-200 border-l-4 border-l-slate-400';

                const badgeBg = isCorrect
                  ? 'bg-emerald-100 text-emerald-800'
                  : isWrong
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700';

                const feedbackSubmitted = submittedFeedbacks[item.questionId];
                // Check if faculty has already replied to a doubt on this question
                const existingDoubt = myDoubts.find((d) => d.questionId === item.questionId);

                return (
                  <div
                    key={item.questionId}
                    className={`bg-white rounded-xl border p-6 shadow-sm transition-all ${borderClass}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Question #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.subject}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.chapter}
                        </span>
                      </div>

                      {/* Status Tag */}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 ${badgeBg}`}>
                        {isCorrect && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct (+4)</span>
                          </>
                        )}
                        {isWrong && (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Wrong (-1)</span>
                          </>
                        )}
                        {isUnattempted && (
                          <>
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Not Attempted (0)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Question HTML */}
                    <div className="py-2 text-slate-900 text-sm">
                      {renderFormattedHtml(item.questionText)}
                    </div>

                    {/* Answer Comparison Strip */}
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500 block mb-0.5">
                          Your Selected Response:
                        </span>
                        <span
                          className={`font-bold ${
                            isCorrect
                              ? 'text-emerald-700'
                              : isWrong
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.studentAnswer ? `Option ${item.studentAnswer}` : 'None (Skipped)'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block mb-0.5">
                          Official Correct Key:
                        </span>
                        <span className="font-bold text-slate-900">
                          Option {item.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {/* Solution Accordion/Section */}
                    {item.solutionText && (
                      <div className="mt-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                        <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Detailed Step-by-Step Solution</span>
                        </div>
                        <div className="text-xs text-slate-800">
                          {renderFormattedHtml(item.solutionText)}
                        </div>
                      </div>
                    )}

                    {/* Existing Faculty Response if already replied */}
                    {existingDoubt && existingDoubt.studentReply && (
                      <div
                        className={`mt-4 p-4 rounded-xl border ${
                          existingDoubt.isCorrected
                            ? 'bg-emerald-50 border-emerald-200'
                            : existingDoubt.verdict === 'concept_clarified'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              💬 Response from {existingDoubt.facultyName}:
                            </span>
                          </div>
                          {existingDoubt.isCorrected ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                              Correction Made & Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">
                              Concept Explanation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {existingDoubt.studentReply}
                        </p>
                      </div>
                    )}

                    {/* Feedback & Doubt Submission Box */}
                    <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Notice an issue or have a doubt? Ask {item.subject} Faculty
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Submitting here immediately notifies the <strong>{item.subject} Professor</strong> in their dedicated queue.
                      </p>

                      {feedbackSubmitted ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{feedbackSubmitted.message}</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {feedbackSubmitted.reportId}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={feedbackTexts[item.questionId] || ''}
                            onChange={(e) =>
                              setFeedbackTexts((prev) => ({
                                ...prev,
                                [item.questionId]: e.target.value
                              }))
                            }
                            placeholder={`e.g. "I think option ${item.correctAnswer} is wrong because in step 2... please verify with ${item.subject} team."`}
                            className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
                          />

                          {/* Quick Suggestions Chips */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                              {[
                                'Answer key seems incorrect',
                                'Option typo / grammar',
                                'Diagram is missing'
                              ].map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() =>
                                    setFeedbackTexts((prev) => ({
                                      ...prev,
                                      [item.questionId]: chip
                                    }))
                                  }
                                  className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-md transition-colors"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={
                                !feedbackTexts[item.questionId]?.trim() ||
                                submittingFeedbackId === item.questionId
                              }
                              onClick={() => handleSendDoubt(item.questionId)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {submittingFeedbackId === item.questionId
                                  ? 'Routing...'
                                  : `Route to ${item.subject} Prof`}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP MODAL 1: TEST INSTRUCTIONS & CONFIRM TO START       */}
      {/* ========================================================= */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Paper 1 &bull; Instructions & Guidelines
                  </h3>
                  <p className="text-xs text-slate-500">
                    JEE / NEET Comprehensive Mock Examination
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Questions</span>
                  <span className="text-sm font-extrabold text-blue-900">43 Total</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Time Limit</span>
                  <span className="text-sm font-extrabold text-blue-900">60 Minutes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Marking</span>
                  <span className="text-sm font-extrabold text-blue-900">+4 / -1 / 0</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Exam Rules:</h4>
                <ul className="space-y-2 text-slate-600 list-disc pl-4">
                  <li>
                    <strong>Single Choice Questions (SCQ):</strong> Select one correct option out of A, B, C, D. (+4 for correct, -1 for wrong).
                  </li>
                  <li>
                    <strong>Multiple Choice Questions (MCQ):</strong> One or more options may be correct.
                  </li>
                  <li>
                    <strong>Integer Questions:</strong> Type the exact numerical integer value in the input field.
                  </li>
                  <li>
                    <strong>Post-Test Review & Doubt Submission:</strong> After submitting, each question will be marked 🟢 Green (Correct), 🔴 Red (Wrong), or ⚪ Grey (Unattempted). You can write questions or doubts directly under each question to alert the subject faculty, and see their explanations in "My Doubts".
                  </li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={hasAgreedInstructions}
                  onChange={(e) => setHasAgreedInstructions(e.target.value === 'true' || e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  I have read and understood all the instructions above and am ready to start Paper 1.
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasAgreedInstructions}
                onClick={handleStartTest}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Start Test Paper 1</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP MODAL 2: FINAL SUBMIT CONFIRMATION POPUP            */}
      {/* ========================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center font-bold mb-3 shadow-xs">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Confirm Test Submission
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please review your progress before finalizing your submission.
              </p>
            </div>

            {/* Modal Progress Summary */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Attempted */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <div className="text-[11px] font-bold uppercase text-blue-700">
                    Attempted
                  </div>
                  <div className="text-2xl font-black text-blue-900 mt-0.5">
                    {attemptedCount}
                  </div>
                  <div className="text-[10px] text-blue-600 font-medium">Questions Answered</div>
                </div>

                {/* Not Attempted */}
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold uppercase text-slate-600">
                    Not Attempted
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-0.5">
                    {notAttemptedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Questions Remaining</div>
                </div>
              </div>

              {notAttemptedCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">You have {notAttemptedCount} unattempted questions.</strong>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      Once submitted, your answers will be automatically graded and you will not be able to modify them.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Great job! All 43 questions answered.</strong>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Ready to view your auto-graded score and step-by-step solutions.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              >
                No, Keep Solving
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Evaluating...' : 'Yes, Submit Test'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
