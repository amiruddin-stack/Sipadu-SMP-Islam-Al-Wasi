import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gradeExamAttemptWithAdmin,
  type AdminAuthLike,
  type AdminFirestoreLike,
} from './examGradingService.ts';

function createMockDb(seed: Record<string, Record<string, Record<string, unknown>>>) {
  const updated: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];

  const adminDb: AdminFirestoreLike = {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            async get() {
              const docData = seed[name]?.[id];
              return {
                exists: Boolean(docData),
                data: () => docData,
              };
            },
            async update(data: Record<string, unknown>) {
              updated.push({ collection: name, id, data });
              if (!seed[name]) seed[name] = {};
              seed[name][id] = { ...(seed[name][id] || {}), ...data };
            },
          };
        },
      };
    },
  };

  return { adminDb, updated };
}

const mockAuth: AdminAuthLike = {
  async verifyIdToken(token: string) {
    if (token === 'valid-student-token') return { uid: 'student-uid-1' };
    if (token === 'other-student-token') return { uid: 'student-uid-2' };
    throw new Error('invalid token');
  },
};

test('gradeExamAttemptWithAdmin rejects invalid idToken with 401', async () => {
  const { adminDb } = createMockDb({});
  const res = await gradeExamAttemptWithAdmin({
    idToken: 'bad-token',
    attemptId: 'att-1',
    adminAuth: mockAuth,
    adminDb,
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('gradeExamAttemptWithAdmin rejects reading another student attempt with 403', async () => {
  const { adminDb } = createMockDb({
    examAttempts: {
      'att-1': { ownerUid: 'student-uid-1', status: 'Selesai', examId: 'ex-1', answers: { q1: 0 } },
    },
  });
  const res = await gradeExamAttemptWithAdmin({
    idToken: 'other-student-token',
    attemptId: 'att-1',
    adminAuth: mockAuth,
    adminDb,
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('gradeExamAttemptWithAdmin reads examAttempts via Admin SDK, grades full and partial keys, and updates result', async () => {
  const { adminDb, updated } = createMockDb({
    examAttempts: {
      'att-1': {
        ownerUid: 'student-uid-1',
        status: 'Selesai',
        examId: 'ex-1',
        answers: { q1: 1, q2: 2, q3: 0 },
      },
    },
    exams: {
      'ex-1': { questionIds: ['q1', 'q2', 'q3'] },
    },
    examAnswerKeys: {
      q1: { answer: 1, points: 2 },
      q2: { answer: 'A', points: 2 },
    },
  });

  const res = await gradeExamAttemptWithAdmin({
    idToken: 'valid-student-token',
    attemptId: 'att-1',
    adminAuth: mockAuth,
    adminDb,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.score, 2);
  assert.equal(res.body.total, 4);
  assert.equal(res.body.percent, 50);
  assert.match(String(res.body.gradingIssue), /Nilai sementara/);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].collection, 'examAttempts');
  assert.equal(updated[0].id, 'att-1');
  assert.equal(updated[0].data.score, 2);
  assert.equal(updated[0].data.total, 4);
  assert.equal(updated[0].data.percent, 50);
});

test('gradeExamAttemptWithAdmin returns alreadyGraded without overwriting complete attempt', async () => {
  const { adminDb, updated } = createMockDb({
    examAttempts: {
      'att-1': {
        ownerUid: 'student-uid-1',
        status: 'Selesai',
        examId: 'ex-1',
        score: 9,
        total: 10,
        percent: 90,
        gradingIssue: '',
      },
    },
  });

  const res = await gradeExamAttemptWithAdmin({
    idToken: 'valid-student-token',
    attemptId: 'att-1',
    adminAuth: mockAuth,
    adminDb,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.alreadyGraded, true);
  assert.equal(res.body.percent, 90);
  assert.equal(updated.length, 0);
});
