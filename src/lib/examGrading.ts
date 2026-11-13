export type AnswerKeyRecord = {
  answer?: unknown;
  points?: unknown;
};

export type ExamGradeResult = {
  score: number;
  total: number;
  percent: number;
  gradedCount: number;
  missingCount: number;
  missingQuestionIds: string[];
  correctCount: number;
  isPartial: boolean;
  hasNoKeys: boolean;
  gradingIssue: string;
};

export type ParsedGradingResponse = {
  score: number;
  total: number;
  percent: number;
  gradingIssue: string;
  alreadyGraded?: boolean;
};

export function normalizeAnswerKeyIndex(rawAnswer: unknown): number | null {
  if (rawAnswer === undefined || rawAnswer === null) return null;
  if (typeof rawAnswer === 'number') {
    return Number.isInteger(rawAnswer) && rawAnswer >= 0 ? rawAnswer : null;
  }
  if (typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
    }
    const upper = trimmed.toUpperCase();
    if (/^[A-Z]$/.test(upper)) {
      return upper.charCodeAt(0) - 65;
    }
  }
  return null;
}

export function normalizeStudentAnswerIndex(rawGiven: unknown): number | null {
  if (rawGiven === undefined || rawGiven === null) return null;
  if (typeof rawGiven === 'number') {
    return Number.isInteger(rawGiven) && rawGiven >= 0 ? rawGiven : null;
  }
  if (typeof rawGiven === 'string') {
    const trimmed = rawGiven.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

export function sanitizeAnswersMap(answers: Record<string, unknown>): Record<string, number> {
  const clean: Record<string, number> = {};
  if (!answers || typeof answers !== 'object') return clean;
  Object.entries(answers).forEach(([questionId, value]) => {
    const normalized = normalizeStudentAnswerIndex(value);
    if (normalized !== null) {
      clean[questionId] = normalized;
    }
  });
  return clean;
}

export function computeExamGrade(
  questionIds: string[],
  answers: Record<string, unknown>,
  keyMap: Record<string, AnswerKeyRecord | null | undefined>
): ExamGradeResult {
  let score = 0;
  let total = 0;
  let correctCount = 0;
  const missingQuestionIds: string[] = [];

  questionIds.forEach((rawQuestionId) => {
    const questionId = String(rawQuestionId);
    const key = keyMap[questionId];
    const normalizedKey = normalizeAnswerKeyIndex(key?.answer);
    if (normalizedKey === null) {
      missingQuestionIds.push(questionId);
      return;
    }

    const rawPoints = Number(key?.points);
    const points = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : 1;
    total += points;

    const given = normalizeStudentAnswerIndex(answers?.[questionId]);
    if (given !== null && given === normalizedKey) {
      score += points;
      correctCount += 1;
    }
  });

  const gradedCount = questionIds.length - missingQuestionIds.length;
  const missingCount = missingQuestionIds.length;
  const hasNoKeys = gradedCount === 0 || total <= 0;
  const isPartial = missingCount > 0 && gradedCount > 0;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  let gradingIssue = '';
  if (questionIds.length === 0) {
    gradingIssue = 'Paket soal ujian tidak ditemukan.';
  } else if (hasNoKeys) {
    gradingIssue =
      'Belum ada kunci jawaban untuk soal pada ujian ini. Menunggu kunci jawaban dari guru.';
  } else if (isPartial) {
    gradingIssue = `${missingCount} dari ${questionIds.length} soal belum memiliki kunci jawaban. Nilai sementara hanya menghitung ${gradedCount} soal yang sudah memiliki kunci.`;
  }

  return {
    score,
    total,
    percent,
    gradedCount,
    missingCount,
    missingQuestionIds,
    correctCount,
    isPartial,
    hasNoKeys,
    gradingIssue,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parseGradingApiResponse(raw: unknown): ParsedGradingResponse {
  let payload: any = raw;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      throw new Error('Respons server penilaian tidak berformat JSON.');
    }
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Respons penilaian otomatis kosong.');
  }
  if (payload.success === false) {
    throw new Error(String(payload.message || payload.error || 'Penilaian otomatis belum berhasil.'));
  }

  const candidate =
    payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload.result && typeof payload.result === 'object'
        ? payload.result
        : payload;

  const score = toFiniteNumber(candidate.score ?? candidate.skor);
  const total = toFiniteNumber(candidate.total ?? candidate.maxScore ?? candidate.totalPoints);

  if (score === null || total === null) {
    throw new Error('Respons penilaian belum memuat skor.');
  }

  const parsedPercent = toFiniteNumber(candidate.percent ?? candidate.nilai ?? candidate.percentage);
  const percent =
    parsedPercent !== null
      ? Math.round(parsedPercent)
      : total > 0
        ? Math.round((score / total) * 100)
        : 0;

  const gradingIssue =
    typeof candidate.gradingIssue === 'string'
      ? candidate.gradingIssue
      : total === 0
        ? 'Belum ada kunci jawaban untuk soal pada ujian ini.'
        : '';

  return {
    score,
    total,
    percent,
    gradingIssue,
    alreadyGraded: Boolean(candidate.alreadyGraded ?? payload.alreadyGraded),
  };
}

export function buildAttemptCreatePayload(input: {
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  className: string;
  answers?: Record<string, unknown>;
  ownerUid: string;
  startedAt: string;
}) {
  return {
    examId: input.examId,
    examTitle: input.examTitle,
    studentId: input.studentId,
    studentName: input.studentName || 'Siswa',
    className: input.className,
    answers: sanitizeAnswersMap(input.answers || {}),
    ownerUid: input.ownerUid,
    status: 'Mengerjakan' as const,
    startedAt: input.startedAt,
  };
}

export function buildAttemptFinishPatch(
  answers: Record<string, unknown>,
  submittedAt: string,
  autoSubmitted: boolean
) {
  return {
    answers: sanitizeAnswersMap(answers),
    status: 'Selesai' as const,
    submittedAt,
    autoSubmitted,
  };
}
