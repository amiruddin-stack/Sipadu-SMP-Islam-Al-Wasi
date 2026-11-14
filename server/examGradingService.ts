import { computeExamGrade, type AnswerKeyRecord } from '../src/lib/examGrading.ts';

export interface AdminDocSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface AdminDocRef {
  get(): Promise<AdminDocSnapshot>;
  update(data: Record<string, unknown>): Promise<unknown>;
}

export interface AdminCollectionRef {
  doc(id: string): AdminDocRef;
}

export interface AdminFirestoreLike {
  collection(name: string): AdminCollectionRef;
}

export interface AdminAuthLike {
  verifyIdToken(token: string): Promise<{ uid: string }>;
}

export interface GradeExamServiceResponse {
  status: number;
  body: Record<string, unknown>;
}

export async function gradeExamAttemptWithAdmin(params: {
  idToken: string;
  attemptId: string;
  adminAuth: AdminAuthLike;
  adminDb: AdminFirestoreLike;
}): Promise<GradeExamServiceResponse> {
  const idToken = String(params.idToken || '').trim();
  const attemptId = String(params.attemptId || '').trim();

  if (!idToken || !attemptId || attemptId.length > 160) {
    return {
      status: 400,
      body: { success: false, message: 'Token atau ID pengerjaan tidak lengkap.' },
    };
  }

  let uid = '';
  try {
    const decoded = await params.adminAuth.verifyIdToken(idToken);
    uid = decoded?.uid || '';
  } catch {
    return {
      status: 401,
      body: { success: false, message: 'Token login siswa tidak sah atau sudah kedaluwarsa.' },
    };
  }

  if (!uid) {
    return {
      status: 401,
      body: { success: false, message: 'Identitas Firebase tidak valid.' },
    };
  }

  const attemptRef = params.adminDb.collection('examAttempts').doc(attemptId);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) {
    return {
      status: 404,
      body: { success: false, message: 'Data pengerjaan tidak ditemukan.' },
    };
  }

  const attempt = attemptSnap.data() || {};
  if (attempt.ownerUid !== uid) {
    return {
      status: 403,
      body: { success: false, message: 'Akses pengerjaan ditolak.' },
    };
  }
  if (attempt.status !== 'Selesai') {
    return {
      status: 400,
      body: { success: false, message: 'Siswa belum menyelesaikan ujian.' },
    };
  }

  if (
    typeof attempt.score === 'number' &&
    typeof attempt.total === 'number' &&
    attempt.total > 0 &&
    !attempt.gradingIssue
  ) {
    return {
      status: 200,
      body: {
        success: true,
        alreadyGraded: true,
        score: attempt.score,
        total: attempt.total,
        percent:
          typeof attempt.percent === 'number'
            ? attempt.percent
            : Math.round((attempt.score / Math.max(1, attempt.total)) * 100),
        gradingIssue: '',
      },
    };
  }

  const examId = String(attempt.examId || '').trim();
  if (!examId) {
    return {
      status: 400,
      body: { success: false, message: 'Data ujian tidak lengkap.' },
    };
  }

  const examSnap = await params.adminDb.collection('exams').doc(examId).get();
  const exam = examSnap.exists ? examSnap.data() : undefined;
  const questionIds = Array.isArray(exam?.questionIds)
    ? exam.questionIds.map((id) => String(id))
    : [];
  if (!questionIds.length) {
    return {
      status: 404,
      body: { success: false, message: 'Paket soal tidak ditemukan.' },
    };
  }

  const keyMap: Record<string, AnswerKeyRecord | null> = {};
  for (const qid of questionIds) {
    const keySnap = await params.adminDb.collection('examAnswerKeys').doc(qid).get();
    if (keySnap.exists && keySnap.data()?.answer !== undefined && keySnap.data()?.answer !== null) {
      keyMap[qid] = keySnap.data() as AnswerKeyRecord;
      continue;
    }
    const legacySnap = await params.adminDb.collection('examQuestions').doc(qid).get();
    if (legacySnap.exists && legacySnap.data()?.answer !== undefined && legacySnap.data()?.answer !== null) {
      keyMap[qid] = legacySnap.data() as AnswerKeyRecord;
      continue;
    }
    keyMap[qid] = null;
  }

  const answers =
    attempt.answers && typeof attempt.answers === 'object'
      ? (attempt.answers as Record<string, unknown>)
      : {};
  const computed = computeExamGrade(questionIds, answers, keyMap);
  const result = {
    score: computed.score,
    total: computed.total,
    percent: computed.percent,
    gradingIssue: computed.gradingIssue,
    gradedAt: new Date().toISOString(),
  };

  await attemptRef.update(result);

  return {
    status: 200,
    body: {
      success: true,
      ...result,
    },
  };
}
