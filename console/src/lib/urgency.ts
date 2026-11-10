import { QuestionGroup, QuestionData, StudentReport, ReportResult } from '../types';

export function calculateUrgency(
  question: QuestionData,
  reports: StudentReport[],
  result: ReportResult
): { score: number; level: 'critical' | 'high' | 'medium' | 'low' } {
  let score = 0;

  // 1. Report volume weight (duplicate reports increase urgency significantly)
  score += reports.length * 2.5;

  // 2. High-stakes defect weighting (wrong answer keys cause rank swings & negative marking)
  if (result.repair === 'answer_key') {
    score += 4.5;
  } else if (result.repair === 'stem_data') {
    score += 3.5;
  } else if (result.repair === 'option_repair') {
    score += 3.0;
  } else if (result.repair === 'type_mismatch' || result.repair === 'identical_options') {
    score += 2.5;
  }

  // 3. Faculty Review route priority (unresolved questions needing human decision)
  if (result.route === 'faculty_review') {
    score += 3.0;
  } else if (result.route === 'auto_apply') {
    score += 1.5;
  }

  // 4. Multiple reports on same defect
  if (reports.length > 1) {
    score += 2.0;
  }

  // Normalize / determine level
  let level: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (score >= 9.0) {
    level = 'critical';
  } else if (score >= 6.5) {
    level = 'high';
  } else if (score >= 4.0) {
    level = 'medium';
  }

  return { score: parseFloat(score.toFixed(1)), level };
}

export function groupReportsByQuestion(
  questions: Record<string, QuestionData>,
  reports: StudentReport[],
  results: ReportResult[]
): QuestionGroup[] {
  const resultMap = new Map<string, ReportResult>();
  results.forEach(r => resultMap.set(r.reportId, r));

  const questionReportsMap = new Map<string, StudentReport[]>();
  reports.forEach(r => {
    const list = questionReportsMap.get(r.questionId) || [];
    list.push(r);
    questionReportsMap.set(r.questionId, list);
  });

  const groups: QuestionGroup[] = [];

  questionReportsMap.forEach((qReports, qid) => {
    const question = questions[qid];
    if (!question) return;

    // Pick primary result (prefer defect or highest confidence)
    const qResults = qReports
      .map(r => resultMap.get(r.reportId))
      .filter((r): r is ReportResult => !!r);

    const primaryResult =
      qResults.find(r => r.route === 'faculty_review') ||
      qResults.find(r => r.route === 'auto_apply') ||
      qResults[0];

    if (!primaryResult) return;

    const { score, level } = calculateUrgency(question, qReports, primaryResult);

    groups.push({
      questionId: qid,
      question,
      reports: qReports,
      primaryResult,
      urgencyScore: score,
      urgencyLevel: level,
    });
  });

  // Sort descending by Urgency Score
  return groups.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

