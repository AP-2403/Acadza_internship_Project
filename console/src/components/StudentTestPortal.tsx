import React, { useState, useMemo } from 'react';
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
  Award
} from 'lucide-react';
import { User, QuestionTestResult, TestStats } from '../types';
import { submitStudentTest, submitStudentDoubt } from '../lib/api';
import questionsRaw from '../data/questions.json';

interface StudentTestPortalProps {
  user: User;
  onLogout: () => void;
}

export const StudentTestPortal: React.FC<StudentTestPortalProps> = ({ user, onLogout }) => {
  const [phase, setPhase] = useState<'solving' | 'results'>('solving');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results state
  const [stats, setStats] = useState<TestStats | null>(null);
  const [results, setResults] = useState<QuestionTestResult[]>([]);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Feedback input state per question: { [qid]: comment }
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, { reportId: string; message: string }>>({});
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState<string | null>(null);

  const questions = useMemo(() => questionsRaw as any[], []);

  // Filtered solving questions by subject if desired
  const [solvingSubject, setSolvingSubject] = useState<'all' | 'Physics' | 'Zoology' | 'Botany'>('all');

  const visibleSolvingQuestions = useMemo(() => {
    if (solvingSubject === 'all') return questions;
    return questions.filter((q) => q.subject === solvingSubject);
  }, [questions, solvingSubject]);

  const currentQuestion = visibleSolvingQuestions[currentIndex] || visibleSolvingQuestions[0];
  const currentQId = currentQuestion ? currentQuestion._id : '';

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

  // Submit full test paper
  const handleSubmitTest = async () => {
    const answeredCount = Object.keys(answers).length;
    const confirmMsg = `You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to finish and submit the test?`;
    if (!window.confirm(confirmMsg)) return;

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
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">Acadza Student Portal</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                JEE / NEET Test Suite
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Welcome, <span className="font-semibold text-slate-700">{user.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {phase === 'solving' ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Standard Test Time</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>{isSubmitting ? 'Evaluating...' : 'Submit Test Paper'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPhase('solving');
                setAnswers({});
                setCurrentIndex(0);
              }}
              className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Test</span>
            </button>
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
                      {currentQuestion.chapter || 'General Physics'}
                    </span>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {currentQuestion.questionType}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {answers[currentQId] ? (
                      <span className="text-emerald-600 flex items-center gap-1">
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
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                        onClick={handleSubmitTest}
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
                {Object.keys(answers).length} / {questions.length} Answered
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
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 inline-block"></span>
                <span>Not Attempted</span>
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

                // Status border and badge style
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

                    {/* ========================================================= */}
                    {/* FEEDBACK & DOUBT SUBMISSION AREA UNDER EVERY QUESTION      */}
                    {/* ========================================================= */}
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

    </div>
  );
};
