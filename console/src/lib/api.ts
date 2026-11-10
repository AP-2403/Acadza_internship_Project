import { User, QuestionTestResult, TestStats, LiveDoubt, StudentDoubtItem } from '../types';
import questionsRaw from '../data/questions.json';

const API_BASE = 'http://localhost:8000/api';

async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, user: { ...data.user, token: data.token } };
      }
    }
  } catch (err) {
    console.warn('Backend login error, falling back to local auth', err);
  }

  // Local fallback for guest accounts
  const GUESTS: Record<string, { pwd: string; name: string; role: 'student' | 'professor' | 'admin'; subject: string | null }> = {
    student: { pwd: 'guest123', name: 'Aarav Sharma (JEE Aspirant)', role: 'student', subject: null },
    physics_prof: { pwd: 'guest123', name: 'Prof. H. C. Verma', role: 'professor', subject: 'Physics' },
    zoology_prof: { pwd: 'guest123', name: 'Prof. R. N. Mukherjee', role: 'professor', subject: 'Zoology' },
    botany_prof: { pwd: 'guest123', name: 'Prof. Sunita Das', role: 'professor', subject: 'Botany' },
    admin: { pwd: 'admin123', name: 'Dean of Academics (Admin)', role: 'admin', subject: null }
  };

  const account = GUESTS[username.toLowerCase().trim()];
  if (account && account.pwd === password.trim()) {
    return {
      success: true,
      user: {
        username: username.toLowerCase().trim(),
        name: account.name,
        role: account.role,
        subject: account.subject,
        token: `token_${username}_${Date.now()}`
      }
    };
  }

  return { success: false, error: 'Invalid username or password' };
}

export async function submitStudentTest(
  answers: Record<string, string>,
  studentUsername: string
): Promise<{ stats: TestStats; results: QuestionTestResult[] }> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const res = await fetch(`${API_BASE}/student/submit-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_username: studentUsername, answers })
      });
      if (res.ok) {
        const data = await res.json();
        return { stats: data.stats, results: data.results };
      }
    }
  } catch (err) {
    console.warn('Backend scoring error, falling back to client-side evaluation', err);
  }

  const qs = questionsRaw as any[];
  let correct = 0;
  let incorrect = 0;
  let attempted = 0;

  const results: QuestionTestResult[] = qs.map((q) => {
    const qid = q._id;
    const qType = q.questionType || 'scq';
    const subObj = q[qType] || {};
    const questionText = subObj.question || '';
    const solutionText = subObj.solution || '';
    const rawAns = subObj.answer;
    const correctAnsStr = Array.isArray(rawAns) ? rawAns.join(', ') : String(rawAns || '').trim();

    const studentAns = answers[qid];
    let status: 'correct' | 'wrong' | 'unattempted' = 'unattempted';

    if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
      attempted++;
      const sNorm = String(studentAns).toUpperCase().replace(/[\s,]/g, '');
      const cNorm = correctAnsStr.toUpperCase().replace(/[\s,]/g, '');
      if (sNorm === cNorm) {
        status = 'correct';
        correct++;
      } else {
        status = 'wrong';
        incorrect++;
      }
    }

    return {
      questionId: qid,
      subject: q.subject || 'Physics',
      chapter: q.chapter || 'General',
      questionType: qType,
      questionText,
      solutionText,
      quesImages: subObj.quesImages || [],
      solutionImages: subObj.solutionImages || [],
      correctAnswer: correctAnsStr,
      studentAnswer: studentAns ? String(studentAns) : null,
      status
    };
  });

  const total = qs.length;
  const scorePercent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  return {
    stats: { total, attempted, correct, incorrect, scorePercent },
    results
  };
}

export async function submitStudentDoubt(
  questionId: string,
  comment: string,
  studentId: string
): Promise<{ success: boolean; message: string; reportId: string }> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const res = await fetch(`${API_BASE}/student/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, comment, studentId })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message, reportId: data.reportId };
      }
    }
  } catch (err) {
    console.warn('Backend feedback submission error, saving locally', err);
  }

  const newId = `R_LOCAL_${Date.now()}`;
  const saved = localStorage.getItem('acadza_student_doubts');
  const doubts: LiveDoubt[] = saved ? JSON.parse(saved) : [];
  
  const q = (questionsRaw as any[]).find(x => x._id === questionId);
  const subj = q ? q.subject : 'Physics';

  doubts.unshift({
    reportId: newId,
    questionId,
    studentId,
    subject: subj,
    comment,
    status: 'pending',
    reportedAt: new Date().toISOString()
  });
  localStorage.setItem('acadza_student_doubts', JSON.stringify(doubts));

  return {
    success: true,
    message: `Doubt recorded and forwarded to ${subj} Faculty Queue!`,
    reportId: newId
  };
}

export async function fetchLiveDoubts(subject: string | null): Promise<LiveDoubt[]> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const url = subject && subject.toLowerCase() !== 'all'
        ? `${API_BASE}/professor/reports?subject=${encodeURIComponent(subject)}`
        : `${API_BASE}/professor/reports`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data.reports || []).map((r: any) => ({
          reportId: r.reportId,
          questionId: r.questionId,
          studentId: r.studentId,
          subject: r.subject,
          comment: r.comment,
          status: r.status,
          reportedAt: r.reportedAt,
          verdict: r.verdict,
          studentReply: r.student_reply,
          facultyName: r.facultyName
        }));
      }
    }
  } catch (err) {
    console.warn('Backend reports error, loading from local state', err);
  }

  const saved = localStorage.getItem('acadza_student_doubts');
  const doubts: LiveDoubt[] = saved ? JSON.parse(saved) : [];
  if (subject && subject.toLowerCase() !== 'all') {
    return doubts.filter(d => d.subject.toLowerCase() === subject.toLowerCase());
  }
  return doubts;
}

export async function fetchStudentDoubts(studentId: string = 'student'): Promise<StudentDoubtItem[]> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const res = await fetch(`${API_BASE}/student/my-doubts?studentId=${encodeURIComponent(studentId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.doubts || [];
      }
    }
  } catch (err) {
    console.warn('Failed to fetch student doubts from backend', err);
  }

  // Local fallback
  const saved = localStorage.getItem('acadza_student_doubts');
  const doubts: LiveDoubt[] = saved ? JSON.parse(saved) : [];
  return doubts.map((d) => {
    const q = (questionsRaw as any[]).find(x => x._id === d.questionId);
    const qDetails = q ? q[q.questionType] : null;
    return {
      reportId: d.reportId,
      questionId: d.questionId,
      subject: d.subject,
      studentComment: d.comment,
      status: d.status,
      verdict: d.verdict || 'pending_review',
      isResolved: d.status !== 'pending',
      isCorrected: d.status === 'auto_applied',
      studentReply: d.studentReply || 'Your doubt has been submitted and is currently being evaluated by the subject faculty.',
      facultyName: d.facultyName || `Prof. (${d.subject} Dept)`,
      reportedAt: d.reportedAt,
      questionDetails: qDetails ? {
        questionText: qDetails.question || '',
        chapter: q.chapter || '',
        correctAnswer: String(qDetails.answer || '')
      } : undefined
    };
  });
}

export async function sendProfessorReply(
  reportId: string,
  replyText: string,
  verdict: 'error_verified' | 'concept_clarified',
  facultyName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const online = await isBackendOnline();
    if (online) {
      const res = await fetch(`${API_BASE}/professor/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, replyText, verdict, facultyName })
      });
      if (res.ok) {
        return { success: true, message: 'Response sent back to student!' };
      }
    }
  } catch (err) {
    console.warn('Backend reply error, saving locally', err);
  }

  // Local fallback
  const saved = localStorage.getItem('acadza_student_doubts');
  if (saved) {
    const doubts: LiveDoubt[] = JSON.parse(saved);
    const updated = doubts.map(d => {
      if (d.reportId === reportId) {
        return {
          ...d,
          status: (verdict === 'error_verified' ? 'auto_applied' : 'reviewed') as any,
          verdict,
          studentReply: replyText,
          facultyName
        };
      }
      return d;
    });
    localStorage.setItem('acadza_student_doubts', JSON.stringify(updated));
  }

  return { success: true, message: 'Response saved locally!' };
}
