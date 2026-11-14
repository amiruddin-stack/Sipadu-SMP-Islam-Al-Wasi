import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttemptCreatePayload,
  buildAttemptFinishPatch,
  computeExamGrade,
  normalizeAnswerKeyIndex,
  normalizeStudentAnswerIndex,
  parseGradingApiResponse,
  sanitizeAnswersMap,
} from './examGrading';

test('normalizeAnswerKeyIndex handles numbers, numeric strings, and letters', () => {
  assert.equal(normalizeAnswerKeyIndex(0), 0);
  assert.equal(normalizeAnswerKeyIndex(2), 2);
  assert.equal(normalizeAnswerKeyIndex('1'), 1);
  assert.equal(normalizeAnswerKeyIndex('A'), 0);
  assert.equal(normalizeAnswerKeyIndex('d'), 3);
  assert.equal(normalizeAnswerKeyIndex(null), null);
  assert.equal(normalizeAnswerKeyIndex(undefined), null);
  assert.equal(normalizeAnswerKeyIndex(''), null);
});

test('normalizeStudentAnswerIndex rejects null/empty so unanswered never matches key 0', () => {
  assert.equal(normalizeStudentAnswerIndex(0), 0);
  assert.equal(normalizeStudentAnswerIndex('0'), 0);
  assert.equal(normalizeStudentAnswerIndex(null), null);
  assert.equal(normalizeStudentAnswerIndex(undefined), null);
  assert.equal(normalizeStudentAnswerIndex(''), null);
  assert.equal(normalizeStudentAnswerIndex(-1), null);
});

test('computeExamGrade calculates full score accurately', () => {
  const result = computeExamGrade(
    ['q1', 'q2', 'q3'],
    { q1: 0, q2: 2, q3: 1 },
    {
      q1: { answer: 0, points: 2 },
      q2: { answer: 2, points: 3 },
      q3: { answer: 3, points: 5 },
    }
  );
  assert.equal(result.score, 5);
  assert.equal(result.total, 10);
  assert.equal(result.percent, 50);
  assert.equal(result.isPartial, false);
  assert.equal(result.hasNoKeys, false);
  assert.equal(result.gradingIssue, '');
});

test('computeExamGrade computes temporary score when some questions lack answer keys', () => {
  const result = computeExamGrade(
    ['q1', 'q2', 'q3', 'q4'],
    { q1: 1, q2: 0, q3: 2, q4: 3 },
    {
      q1: { answer: 1, points: 1 },
      q2: null,
      q3: { answer: 2, points: 1 },
    }
  );
  assert.equal(result.score, 2);
  assert.equal(result.total, 4);
  assert.equal(result.percent, 50);
  assert.equal(result.gradedCount, 2);
  assert.equal(result.missingCount, 2);
  assert.equal(result.isPartial, true);
  assert.equal(result.hasNoKeys, false);
  assert.match(result.gradingIssue, /Nilai sementara/);
});

test('computeExamGrade handles exam where no questions have keys without crashing', () => {
  const result = computeExamGrade(['q1', 'q2'], { q1: 0 }, {});
  assert.equal(result.score, 0);
  assert.equal(result.total, 0);
  assert.equal(result.percent, 0);
  assert.equal(result.hasNoKeys, true);
  assert.match(result.gradingIssue, /Belum ada kunci jawaban/);
});


test('computeExamGrade prioritizes the points assigned in the exam package', () => {
  const result = computeExamGrade(
    ['q1', 'q2'],
    { q1: 0, q2: 1 },
    {
      q1: { answer: 0, points: 1 },
      q2: { answer: 0, points: 1 },
    },
    { q1: 5, q2: 15 }
  );
  assert.equal(result.score, 5);
  assert.equal(result.total, 20);
  assert.equal(result.percent, 25);
});

test('parseGradingApiResponse supports direct, string-number, nested, and zero-key responses', () => {
  const direct = parseGradingApiResponse({ success: true, score: 8, total: 10, percent: 80, gradingIssue: '' });
  assert.deepEqual(direct, { score: 8, total: 10, percent: 80, gradingIssue: '', alreadyGraded: false });

  const nested = parseGradingApiResponse({
    success: true,
    data: { score: '3', total: '4', gradingIssue: '1 dari 5 soal belum memiliki kunci jawaban.' },
  });
  assert.equal(nested.score, 3);
  assert.equal(nested.total, 4);
  assert.equal(nested.percent, 75);
  assert.match(nested.gradingIssue, /belum memiliki kunci/);

  const zeroTotal = parseGradingApiResponse({ success: true, score: 0, total: 0, percent: 0 });
  assert.equal(zeroTotal.score, 0);
  assert.equal(zeroTotal.total, 0);
  assert.match(zeroTotal.gradingIssue, /Belum ada kunci jawaban/);
});

test('Firestore payload builders strictly enforce allowed keys per firestore.rules', () => {
  const createPayload = buildAttemptCreatePayload({
    examId: 'exam-1',
    examTitle: 'UH 1',
    studentId: 'std-1',
    studentName: 'Budi',
    className: 'VII (Tujuh)',
    answers: { q1: 0, q2: null },
    ownerUid: 'uid-1',
    startedAt: '2026-11-13T00:00:00.000Z',
  });
  assert.deepEqual(Object.keys(createPayload).sort(), [
    'answers',
    'className',
    'examId',
    'examTitle',
    'ownerUid',
    'startedAt',
    'status',
    'studentId',
    'studentName',
  ]);
  assert.deepEqual(createPayload.answers, { q1: 0 });
  assert.equal(createPayload.status, 'Mengerjakan');

  const finishPatch = buildAttemptFinishPatch(
    sanitizeAnswersMap({ q1: 1, q2: undefined }),
    '2026-11-13T00:10:00.000Z',
    false
  );
  assert.deepEqual(Object.keys(finishPatch).sort(), [
    'answers',
    'autoSubmitted',
    'status',
    'submittedAt',
  ]);
  assert.equal(finishPatch.status, 'Selesai');
  assert.deepEqual(finishPatch.answers, { q1: 1 });
});
