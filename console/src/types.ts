export interface EditProposal {
  field: string;
  find: string;
  replace: string;
}

export interface ReportResult {
  reportId: string;
  questionId: string;
  verdict: string;
  repair: string | null;
  edit: EditProposal | null;
  route: 'auto_apply' | 'faculty_review' | 'no_change';
  confidence: number;
  evidence: string;
  student_reply: string;
}

export interface StudentReport {
  reportId: string;
  questionId: string;
  studentId: string;
  source: string;
  reportedAt: string;
  comment: string;
}

export interface QuestionData {
  _id: string;
  qid?: string | null;
  questionType: 'scq' | 'mcq' | 'integerQuestion';
  subject: string;
  chapter: string;
  concept?: string | null;
  subConcept?: string | null;
  level?: string;
  error?: number;
  updatedAt?: string;
  scq?: {
    question: string;
    solution: string;
    answer: string;
    quesImages: string[];
    solutionImages: string[];
  };
  mcq?: {
    question: string;
    solution: string;
    answer: string[] | string;
    quesImages: string[];
    solutionImages: string[];
  };
  integerQuestion?: {
    question: string;
    solution: string;
    answer: number | string;
    quesImages: string[];
    solutionImages: string[];
  };
}

export interface AuditEntry {
  id: string;
  questionId: string;
  reportId: string;
  reviewer: string;
  action: 'approve' | 'edit_approve' | 'reject';
  previousRoute: string;
  newRoute: string;
  editApplied: EditProposal | null;
  comment?: string;
  timestamp: string;
}

export interface QuestionGroup {
  questionId: string;
  question: QuestionData;
  reports: StudentReport[];
  primaryResult: ReportResult;
  urgencyScore: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface User {
  username: string;
  name: string;
  role: 'student' | 'professor' | 'admin';
  subject: string | null;
  token?: string;
}

export interface QuestionTestResult {
  questionId: string;
  subject: string;
  chapter: string;
  questionType: 'scq' | 'mcq' | 'integerQuestion';
  questionText: string;
  solutionText: string;
  quesImages?: string[];
  solutionImages?: string[];
  correctAnswer: string;
  studentAnswer: string | null;
  status: 'correct' | 'wrong' | 'unattempted';
}

export interface TestStats {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  scorePercent: number;
}

export interface LiveDoubt {
  reportId: string;
  questionId: string;
  studentId: string;
  subject: string;
  comment: string;
  status: 'pending' | 'reviewed' | 'auto_applied' | 'dismissed';
  reportedAt: string;
  verdict?: string;
  studentReply?: string;
  facultyName?: string;
}

export interface StudentDoubtItem {
  reportId: string;
  questionId: string;
  subject: string;
  studentComment: string;
  status: string;
  verdict: string;
  isResolved: boolean;
  isCorrected: boolean;
  studentReply: string;
  facultyName: string;
  reportedAt: string;
  resolvedAt?: string;
  questionDetails?: {
    questionText: string;
    chapter: string;
    correctAnswer: string;
  };
}
