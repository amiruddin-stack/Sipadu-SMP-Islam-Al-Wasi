import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { deleteOfflineRecord, readOfflineRecord, readOfflineRecords, saveOfflineRecord } from '../lib/examOffline';
import {
  buildAttemptCreatePayload,
  buildAttemptFinishPatch,
  computeExamGrade,
  sanitizeAnswersMap,
  normalizeAnswerKeyIndex,
  normalizeStudentAnswerIndex,
  type AnswerKeyRecord,
} from '../lib/examGrading';
import { signInAnonymously, signOut } from 'firebase/auth';
import { BookOpen, Clock3, Plus, ClipboardList, Trophy, ArrowLeft, ChevronRight, CheckCircle2, Link as LinkIcon, Play, Save, Copy, ExternalLink, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_SUBJECTS } from '../data/subjects';

type Question = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; prompt: string; options: string[]; answer?: number; points: number; sourceFormId?: string };
type Exam = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; duration: number; questionIds: string[]; formUrl?: string; status: 'Aktif' | 'Draft'; createdAt: string };
type ExamStudent = { id: string; name: string; className: string; status?: string };
type Attempt = { id: string; examId: string; examTitle: string; studentId: string; studentName: string; className: string; answers: Record<string, number>; score?: number; total?: number; percent?: number; gradingIssue?: string; gradedAt?: string; status: 'Mengerjakan' | 'Selesai'; startedAt: string; submittedAt?: string };

const cls = ['VII', 'VIII', 'IX'];
const makeExamLink = (id: string) => { const url = new URL(window.location.href); url.search = ''; url.searchParams.set('ujian', id); return url.toString(); };
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#16B364] focus:ring-2 focus:ring-bg-[#E3F7EC]';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#16B364] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0B8F4D] disabled:cursor-not-allowed disabled:opacity-50';

function classLevel(value: string) {
  const normalized = value.trim().toUpperCase().replace(/^KELAS\s+/, '');
  const match = normalized.match(/^(VIII|VII|IX)(?=$|[\s(-])/);
  return match ? match[1] : normalized.replace(/[^A-Z]/g, '');
}
function classDisplayName(value: string) {
  const level = classLevel(value);
  const labels: Record<string, string> = { VII: 'VII (Tujuh)', VIII: 'VIII (Delapan)', IX: 'IX (Sembilan)' };
  return labels[level] || value.trim();
}
export const ExamPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { classes, settings } = useData();
  const { firebaseUser, currentUser } = useAuth();
  const isVerifiedExamAdmin = firebaseUser?.email?.toLowerCase() === 'amiruddin@smpialwasi-maros.sch.id';
  const canManageExamQuestions = Boolean(firebaseUser && !firebaseUser.isAnonymous && ['super_admin', 'kepala_sekolah', 'operator', 'guru', 'wali_kelas'].includes(currentUser?.role || ''));
  const [examStudents, setExamStudents] = useState<ExamStudent[]>([]);
  const [rosterLoadState, setRosterLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [selectedRosterStudentId, setSelectedRosterStudentId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [section, setSection] = useState<'home' | 'student' | 'create' | 'manage' | 'share' | 'results' | 'take'>('home');
  const [level, setLevel] = useState('VII');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [shareLink, setShareLink] = useState('');
  const linkedExamId = new URLSearchParams(window.location.search).get('ujian') || '';
  const [duration, setDuration] = useState(60);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [ownerUid, setOwnerUid] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [verifiedStudentName, setVerifiedStudentName] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regrading, setRegrading] = useState(false);
  const [finishedResult, setFinishedResult] = useState<{ attemptId?: string; title: string; studentName: string; className: string; score?: number; total?: number; percent?: number; gradingIssue?: string; gradingError?: string } | null>(null);
  const [selectedResultExamId, setSelectedResultExamId] = useState('');
  const [selectedAnswerAttemptId, setSelectedAnswerAttemptId] = useState('');
  const [answerDetails, setAnswerDetails] = useState<any[]>([]);
  const [exportingResults, setExportingResults] = useState(false);
  const [message, setMessage] = useState('');
  const answersRef = useRef<Record<string, number>>({});
  const autoGradedAttemptsRef = useRef<Map<string, string>>(new Map());
  const savingRef = useRef(false);
  answersRef.current = answers;
  savingRef.current = saving;

  useEffect(() => {
    let active = true;
    let unQ = () => {};
    let unE = () => {};
    let unA = () => {};
    let unS = () => {};
    const setNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', setNetwork);
    window.addEventListener('offline', setNetwork);

    const initialize = async () => {
      try {
        const [cachedQuestions, cachedExams, session, cachedIdentity, cachedBundle] = await Promise.all([
          readOfflineRecord<Question[]>('cache:questions'),
          readOfflineRecord<Exam[]>('cache:exams'),
          readOfflineRecord<any>('session:active'),
          readOfflineRecord<any>('student:identity'),
          linkedExamId ? readOfflineRecord<any>('cache:exam:' + linkedExamId) : Promise.resolve(null)
        ]);
        if (!active) return;
        if (linkedExamId) setSection('student');
        if (cachedQuestions) setQuestions(cachedQuestions);
        if (cachedExams) setExams(cachedExams);
        if (cachedBundle?.exam && Array.isArray(cachedBundle.questions)) {
          setExams(current => current.some(item => item.id === cachedBundle.exam.id) ? current : [...current, cachedBundle.exam]);
          setQuestions(current => [...current.filter(item => !cachedBundle.questions.some((q: Question) => q.id === item.id)), ...cachedBundle.questions]);
        }
        if (session?.exam && session?.attemptId && session?.deadlineAt && (!linkedExamId || session.exam.id === linkedExamId)) {
          setActiveExam(session.exam);
          setAnswers(session.answers || {});
          setAttemptId(session.attemptId);
          setOwnerUid(session.ownerUid || '');
          setStartedAt(session.startedAt || new Date(session.deadlineAt - (session.exam?.duration || 60) * 60 * 1000).toISOString());
          setStudentId(session.studentId || '');
          setVerifiedStudentName(session.studentName || cachedIdentity?.studentName || '');
          setStudentClass(session.className || '');
          setDeadlineAt(session.deadlineAt);
          setSecondsLeft(Math.max(0, Math.ceil((session.deadlineAt - Date.now()) / 1000)));
          setSection('take');
          setMessage('Ujian sebelumnya dipulihkan dari penyimpanan perangkat.');
        }
        setOfflineReady(Boolean(cachedQuestions?.length && cachedExams?.length));
        await auth.authStateReady();
        if (cachedIdentity && auth.currentUser?.uid === cachedIdentity.ownerUid) {
          setStudentId(cachedIdentity.studentId || '');
          setSelectedRosterStudentId(cachedIdentity.studentId || '');
          setStudentClass(cachedIdentity.className || '');
          setVerifiedStudentName(cachedIdentity.studentName || '');
        }
        if (!navigator.onLine) { setRosterLoadState('error'); setMessage('Daftar siswa belum tersedia saat offline. Hubungkan internet dan hubungi admin sekolah.'); return; }

        if (!isVerifiedExamAdmin && !auth.currentUser) await signInAnonymously(auth);
        if (!active || !auth.currentUser) return;

        if (!active) return;

        unS = onSnapshot(collection(db, 'studentExamDirectory'), snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id } as ExamStudent));
          const validRows = rows.filter(s => s.name && s.className && s.status === 'Aktif');
          setExamStudents(validRows);
          setRosterLoadState(validRows.length ? 'ready' : 'empty');
          if (!validRows.length) setMessage('Daftar siswa belum tersedia. Hubungi admin sekolah.');
          else setMessage('');
        }, e => {
          console.error('Gagal memuat direktori siswa:', e);
          setExamStudents([]);
          setRosterLoadState('error');
          setMessage('Daftar siswa belum tersedia. Hubungi admin sekolah.');
        });
        
        unQ = onSnapshot(collection(db, 'examPublicQuestions'), snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id, answer: undefined } as Question));
          setQuestions(rows);
          setOfflineReady(true);
          void saveOfflineRecord('cache:questions', rows);
        }, e => setMessage('Bank soal belum dapat dibaca: ' + e.message));

        const examsSource = canManageExamQuestions
          ? collection(db, 'exams')
          : query(collection(db, 'exams'), where('status', '==', 'Aktif'));
        unE = onSnapshot(examsSource, snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id } as Exam));
          setExams(rows);
          setOfflineReady(true);
          void saveOfflineRecord('cache:exams', rows);
        }, e => setMessage('Data ujian belum dapat dibaca: ' + e.message));

        if (canManageExamQuestions) {
          unA = onSnapshot(collection(db, 'examAttempts'), snap => {
            setAttempts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Attempt)));
          }, e => console.warn(e));
        }
      } catch (e) {
        console.warn('Persiapan akses ujian:', e);
        if (active) { setRosterLoadState('error'); setMessage('Daftar siswa belum tersedia. Hubungi admin sekolah dan periksa koneksi internet.'); }
      }
    };

    void initialize();
    return () => {
      active = false;
      window.removeEventListener('online', setNetwork);
      window.removeEventListener('offline', setNetwork);
      unQ();
      unE();
      unA();
      unS();
    };
  }, [isVerifiedExamAdmin, canManageExamQuestions]);



  useEffect(() => {
    if (!linkedExamId || !exams.length || studentId) return;
    const linkedExam = exams.find(item => item.id === linkedExamId);
    if (linkedExam) setStudentClass(current => current || linkedExam.className);
  }, [linkedExamId, exams, studentId]);

  const selectedClassNames = useMemo(() => classes.filter(c => classLevel(c) === level), [classes, level]);
  const classQuestions = questions.filter(q => classLevel(q.className) === level && (!subject || q.subject === subject));
  const currentExamQuestions = activeExam ? activeExam.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[] : [];
  const resultExamGroups = useMemo(() => {
    const grouped = new Map<string, { id: string; title: string; subject: string; className: string; attempts: Attempt[] }>();
    exams.forEach(exam => grouped.set(exam.id, { id: exam.id, title: exam.title, subject: exam.subject, className: exam.className, attempts: [] }));
    attempts.forEach(attempt => {
      const group = grouped.get(attempt.examId) || { id: attempt.examId, title: attempt.examTitle || 'Ujian', subject: '', className: attempt.className, attempts: [] };
      group.attempts.push(attempt);
      grouped.set(attempt.examId, group);
    });
    return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title, 'id'));
  }, [exams, attempts]);
  const selectedResultExam = resultExamGroups.find(item => item.id === selectedResultExamId);
  const selectedResultAttempts = selectedResultExam?.attempts || [];

  useEffect(() => {
    let cancelled = false;
    const loadAnswerDetails = async () => {
      if (!selectedAnswerAttemptId || !selectedResultExam) {
        setAnswerDetails([]);
        return;
      }
      const attempt = selectedResultAttempts.find(item => item.id === selectedAnswerAttemptId);
      const exam = exams.find(item => item.id === selectedResultExam.id);
      if (!attempt || !exam) {
        setAnswerDetails([]);
        return;
      }
      const rows = await Promise.all(exam.questionIds.map(async (qid, index) => {
        const question = questions.find(item => item.id === qid);
        let key: AnswerKeyRecord | null = null;
        try {
          key = await readOfflineRecord<AnswerKeyRecord>('exam:key:' + qid);
        } catch {
          key = null;
        }
        if (!key || key.answer === undefined || key.answer === null) {
          try {
            const keySnap = await getDoc(doc(db, 'examAnswerKeys', qid));
            if (keySnap.exists()) key = keySnap.data() as AnswerKeyRecord;
          } catch {
            key = null;
          }
        }
        const given = normalizeStudentAnswerIndex(attempt.answers?.[qid]);
        const correctIndex = normalizeAnswerKeyIndex(key?.answer);
        const correct = given === null || correctIndex === null ? null : given === correctIndex;
        const points = Math.max(0, Number(question?.points ?? key?.points ?? 1) || 0);
        return {
          id: qid,
          number: index + 1,
          prompt: question?.prompt || 'Soal tidak ditemukan',
          studentAnswer: given === null ? 'Belum dijawab' : String.fromCharCode(65 + given) + '. ' + (question?.options?.[given] || ''),
          correctAnswer: correctIndex === null ? 'Kunci belum tersedia' : String.fromCharCode(65 + correctIndex) + '. ' + (question?.options?.[correctIndex] || ''),
          correct,
          points,
          earned: correct === true ? points : 0,
        };
      }));
      if (!cancelled) setAnswerDetails(rows);
    };
    void loadAnswerDetails();
    return () => { cancelled = true; };
  }, [selectedAnswerAttemptId, selectedResultExamId, attempts, exams, questions]);
  const availableExams = exams.filter(e => e.status === 'Aktif' && classLevel(e.className) === classLevel(studentClass || level) && (!linkedExamId || e.id === linkedExamId));
  const questionPackages = useMemo(() => {
    const groups = new Map<string, { key: string; title: string; questions: Question[] }>();
    classQuestions.forEach(q => {
      const packageTitle = q.title || 'Paket Soal';
      const key = [q.subject, classLevel(q.className), q.sourceFormId || packageTitle].join('::');
      const group = groups.get(key) || { key, title: packageTitle, questions: [] };
      group.questions.push(q);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [classQuestions]);

  useEffect(() => {
    if (!questions.length || !exams.length) return;
    exams.forEach(exam => {
      const bundleQuestions = exam.questionIds.map(id => questions.find(question => question.id === id)).filter(Boolean) as Question[];
      if (bundleQuestions.length === exam.questionIds.length && bundleQuestions.length > 0) {
        void saveOfflineRecord('cache:exam:' + exam.id, { exam, questions: bundleQuestions });
      }
    });
  }, [exams, questions]);

  const addQuestion = async () => {
    if (!canManageExamQuestions) { setMessage('Silakan login menggunakan akun guru sekolah untuk menyimpan soal.'); return; }
    if (!questionText.trim() || options.some(o => !o.trim()) || !subject) { setMessage('Lengkapi mapel, pertanyaan, dan semua pilihan jawaban.'); return; }
    setSaving(true);
    try {
      const questionRef = doc(collection(db, 'examPublicQuestions'));
      await setDoc(questionRef, { title: title.trim() || 'Bank Soal ' + subject, subject, className: selectedClassNames[0] || level, academicYear: settings.activeAcademicYear, semester: settings.activeSemester, prompt: questionText.trim(), options, points: 1, createdAt: new Date().toISOString() });
      await setDoc(doc(db, 'examAnswerKeys', questionRef.id), { answer: correct, points: 1, createdAt: new Date().toISOString() });
      setQuestionText(''); setOptions(['','','','']); setCorrect(0); setMessage('Soal berhasil disimpan ke bank soal.');
    } catch (e) { setMessage('Gagal menyimpan soal. Pastikan login Firebase aktif.'); }
    finally { setSaving(false); }
  };


  const createExam = async () => {
    if (!canManageExamQuestions) { setMessage('Login menggunakan akun Google sekolah untuk menerbitkan ujian.'); return; }
    if (!title.trim() || !subject || !selectedQuestions.length) { setMessage('Isi nama ujian, mapel, dan pilih minimal satu soal.'); return; }
    setSaving(true);
    try {
      const created = await addDoc(collection(db, 'exams'), { title: title.trim(), subject, className: selectedClassNames[0] || level, academicYear: settings.activeAcademicYear, semester: settings.activeSemester, duration, questionIds: selectedQuestions, status: 'Aktif', createdAt: new Date().toISOString() });
      setShareLink(makeExamLink(created.id));
      setMessage('Ujian berhasil dibuat. Bagikan tautan ini kepada siswa.');
      setSection('share'); setSelectedQuestions([]);
    } catch (e) { setMessage('Gagal membuat ujian. Periksa koneksi dan autentikasi Firebase.'); }
    finally { setSaving(false); }
  };

  const enterGuestMode = async () => {
    const selectedStudent = examStudents.find(s => s.id === selectedRosterStudentId);
    if (!selectedStudent) { setMessage('Pilih nama siswa dari daftar terlebih dahulu.'); return; }
    if (!studentClass || classLevel(selectedStudent.className || '') !== classLevel(studentClass)) { setMessage('Nama siswa tidak sesuai dengan kelas yang dipilih.'); return; }
    const name = selectedStudent.name;
    try {
      await auth.authStateReady();
      if (auth.currentUser && !auth.currentUser.isAnonymous) await signOut(auth);
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser?.uid;
      if (!uid || !auth.currentUser?.isAnonymous) throw new Error('Mode tamu belum tersedia. Coba buka kembali tautan ujian.');
      await saveOfflineRecord('student:identity', { studentId: selectedStudent.id, studentName: name, className: studentClass, ownerUid: uid });
      setStudentId(selectedStudent.id);
      setVerifiedStudentName(name);
      setMessage('Mode tamu aktif. Silakan mulai ujian.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tidak dapat masuk sebagai tamu. Periksa koneksi internet.');
    }
  };

  const gradeAttemptsAsTeacher = async (targetAttempts: Attempt[], forceRegrade = false) => {
    if (!canManageExamQuestions || !targetAttempts.length) return;
    setRegrading(true);
    try {
      const keyCache = new Map<string, AnswerKeyRecord | null>();
      const examCache = new Map<string, Exam | null>();
      exams.forEach(exam => examCache.set(exam.id, exam));

      let gradedCount = 0;
      for (const item of targetAttempts) {
        if (item.status !== 'Selesai' && item.status !== 'Mengerjakan') continue;

        let exam = examCache.get(item.examId) || null;
        if (!exam) {
          try {
            const examSnap = await getDoc(doc(db, 'exams', item.examId));
            if (examSnap.exists()) {
              exam = { ...examSnap.data(), id: examSnap.id } as Exam;
              examCache.set(item.examId, exam);
            }
          } catch {
            // Continue if exam lookup fails
          }
        }
        if (!exam || !Array.isArray(exam.questionIds) || !exam.questionIds.length) continue;

        const keyMap: Record<string, AnswerKeyRecord | null> = {};
        const packagePoints: Record<string, number> = {};
        for (const qid of exam.questionIds) {
          const packageQuestion = questions.find(question => question.id === String(qid));
          if (packageQuestion && Number.isFinite(Number(packageQuestion.points)) && Number(packageQuestion.points) > 0) {
            packagePoints[String(qid)] = Number(packageQuestion.points);
          }
          const keyId = String(qid);
          if (!keyCache.has(keyId)) {
            let loadedKey: AnswerKeyRecord | null = null;
            try {
              loadedKey = await readOfflineRecord<AnswerKeyRecord>('exam:key:' + keyId);
            } catch {
              loadedKey = null;
            }
            if (!loadedKey || loadedKey.answer === undefined || loadedKey.answer === null) {
              try {
                const keySnap = await getDoc(doc(db, 'examAnswerKeys', keyId));
                if (keySnap.exists()) {
                  loadedKey = keySnap.data() as AnswerKeyRecord;
                } else if (isVerifiedExamAdmin) {
                  const legacySnap = await getDoc(doc(db, 'examQuestions', keyId));
                  if (legacySnap.exists() && legacySnap.data()?.answer !== undefined) {
                    loadedKey = legacySnap.data() as AnswerKeyRecord;
                  }
                }
                if (loadedKey?.answer !== undefined && loadedKey?.answer !== null) {
                  await saveOfflineRecord('exam:key:' + keyId, loadedKey);
                }
              } catch {
                loadedKey = null;
              }
            }
            keyCache.set(keyId, loadedKey);
          }
          keyMap[keyId] = keyCache.get(keyId) || null;
        }

        const grade = computeExamGrade(exam.questionIds, item.answers || {}, keyMap, packagePoints);
        await updateDoc(doc(db, 'examAttempts', item.id), {
          score: grade.score,
          total: grade.total,
          percent: grade.percent,
          gradingIssue: grade.gradingIssue,
          gradedAt: new Date().toISOString(),
        });
        gradedCount += 1;
      }

      if (forceRegrade) {
        setMessage(gradedCount ? `${gradedCount} pengerjaan selesai diperiksa ulang.` : 'Tidak ada pengerjaan selesai yang perlu diperiksa.');
      }
    } catch (error) {
      if (forceRegrade) {
        setMessage(error instanceof Error ? error.message : 'Pemeriksaan nilai belum berhasil.');
      }
    } finally {
      setRegrading(false);
    }
  };

  const exportExamResults = async () => {
    if (!selectedResultExam) return;
    const exam = exams.find(item => item.id === selectedResultExam.id);
    if (!exam) {
      setMessage('Paket ujian tidak ditemukan untuk diekspor.');
      return;
    }
    setExportingResults(true);
    try {
      const summaryRows = selectedResultAttempts.map(attempt => ({
        'Nama Siswa': attempt.studentName,
        'ID Siswa': attempt.studentId,
        'Kelas': attempt.className,
        'Status': attempt.status,
        'Poin Diperoleh': typeof attempt.score === 'number' ? attempt.score : '',
        'Total Poin': typeof attempt.total === 'number' ? attempt.total : '',
        'Nilai': typeof attempt.percent === 'number' ? attempt.percent : '',
        'Mulai': attempt.startedAt || '',
        'Selesai': attempt.submittedAt || '',
      }));
      const detailRows: Record<string, unknown>[] = [];
      for (const attempt of selectedResultAttempts) {
        for (let index = 0; index < exam.questionIds.length; index++) {
          const qid = exam.questionIds[index];
          const question = questions.find(item => item.id === qid);
          let key: AnswerKeyRecord | null = null;
          try {
            key = await readOfflineRecord<AnswerKeyRecord>('exam:key:' + qid);
          } catch {
            key = null;
          }
          if (!key || key.answer === undefined || key.answer === null) {
            try {
              const keySnap = await getDoc(doc(db, 'examAnswerKeys', qid));
              if (keySnap.exists()) key = keySnap.data() as AnswerKeyRecord;
            } catch {
              key = null;
            }
          }
          const given = normalizeStudentAnswerIndex(attempt.answers?.[qid]);
          const correctIndex = normalizeAnswerKeyIndex(key?.answer);
          const isCorrect = given === null || correctIndex === null ? null : given === correctIndex;
          const points = Math.max(0, Number(question?.points ?? key?.points ?? 1) || 0);
          detailRows.push({
            'Nama Siswa': attempt.studentName,
            'Kelas': attempt.className,
            'Nomor Soal': index + 1,
            'Pertanyaan': question?.prompt || 'Soal tidak ditemukan',
            'Jawaban Siswa': given === null ? 'Belum dijawab' : String.fromCharCode(65 + given) + '. ' + (question?.options?.[given] || ''),
            'Kunci Jawaban': correctIndex === null ? 'Belum tersedia' : String.fromCharCode(65 + correctIndex) + '. ' + (question?.options?.[correctIndex] || ''),
            'Hasil': isCorrect === null ? 'Belum dapat dinilai' : isCorrect ? 'Benar' : 'Salah',
            'Bobot Poin': points,
            'Poin Diperoleh': isCorrect === true ? points : 0,
          });
        }
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Rekap Nilai');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), 'Detail Jawaban');
      const safeTitle = selectedResultExam.title.replace(/[^a-z0-9_-]+/gi, '_');
      XLSX.writeFile(workbook, 'SIMPATIK_Hasil_' + safeTitle + '.xlsx');
      setMessage('Rekap nilai dan detail jawaban berhasil diekspor ke Excel.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ekspor hasil ujian gagal.');
    } finally {
      setExportingResults(false);
    }
  };

  useEffect(() => {
    if (!canManageExamQuestions) return;
    const ungraded = attempts.filter(a => {
      if (a.status !== 'Mengerjakan' && a.status !== 'Selesai') return false;
      const signature = JSON.stringify(a.answers || {});
      return autoGradedAttemptsRef.current.get(a.id) !== signature;
    });
    if (!ungraded.length) return;
    ungraded.forEach(a => autoGradedAttemptsRef.current.set(a.id, JSON.stringify(a.answers || {})));
    void gradeAttemptsAsTeacher(ungraded, false);
  }, [section, canManageExamQuestions, attempts, exams]);

  useEffect(() => {
    if (section !== 'results' || activeExam || !finishedResult?.attemptId) return;
    const targetId = finishedResult.attemptId;
    const unsub = onSnapshot(doc(db, 'examAttempts', targetId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (typeof data.score === 'number' && typeof data.total === 'number') {
        const percent = typeof data.percent === 'number' ? data.percent : (data.total > 0 ? Math.round((data.score / data.total) * 100) : 0);
        setFinishedResult(current => current && current.attemptId === targetId
          ? { ...current, score: data.score, total: data.total, percent, gradingIssue: typeof data.gradingIssue === 'string' ? data.gradingIssue : '', gradingError: undefined }
          : current
        );
        void deleteOfflineRecord('pending:' + targetId);
      }
    }, () => {});
    return () => unsub();
  }, [section, activeExam, finishedResult?.attemptId]);

  const startExam = async (exam: Exam) => {
    const student = examStudents.find(s => s.id === studentId);
    if (!studentId || !verifiedStudentName) { setMessage('Verifikasi ID Ujian siswa terlebih dahulu.'); return; }
    if (!navigator.onLine) { setMessage('Koneksi internet diperlukan untuk memulai ujian agar sistem dapat mencegah pengerjaan ulang.'); return; }
    let examQuestions = exam.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
    if (examQuestions.length !== exam.questionIds.length) {
      const cachedBundle = await readOfflineRecord<{ exam: Exam; questions: Question[] }>('cache:exam:' + exam.id);
      if (cachedBundle?.exam?.id === exam.id && cachedBundle.questions?.length === exam.questionIds.length) {
        examQuestions = cachedBundle.questions;
        setQuestions(current => [...current.filter(item => !examQuestions.some(q => q.id === item.id)), ...examQuestions]);
      }
    }
    if (examQuestions.length !== exam.questionIds.length) { setMessage('Paket soal belum lengkap tersimpan di perangkat. Hubungkan internet sekali untuk memuat seluruh soal.'); return; }
    await saveOfflineRecord('cache:exam:' + exam.id, { exam, questions: examQuestions });
    try {
      await auth.authStateReady();
      if (navigator.onLine && !auth.currentUser) await signInAnonymously(auth);
      const sessionOwnerUid = auth.currentUser?.uid || '';
      if (sessionOwnerUid) {
        const priorAttempts = await getDocs(query(
          collection(db, 'examAttempts'),
          where('ownerUid', '==', sessionOwnerUid)
        ));
        const finishedDoc = priorAttempts.docs.find(snapshot => snapshot.data().examId === exam.id && snapshot.data().status === 'Selesai');
        if (finishedDoc) {
          const data = finishedDoc.data();
          const scoreHint = typeof data.score === 'number' && typeof data.total === 'number' && data.total > 0
            ? ' Nilai terakhir Anda: ' + (typeof data.percent === 'number' ? data.percent : Math.round((data.score / data.total) * 100)) + '.'
            : '';
          setMessage('Anda sudah mengerjakan soal ini. Anda tidak dapat mengerjakan ujian yang sama untuk kedua kalinya.' + scoreHint);
          return;
        }
      }
      const id = crypto.randomUUID();
      const started = new Date().toISOString();
      const endAt = Date.now() + exam.duration * 60 * 1000;
      const resolvedName = student?.name || verifiedStudentName;
      const resolvedClass = student?.className || studentClass;
      const attempt = buildAttemptCreatePayload({
        examId: exam.id,
        examTitle: exam.title,
        studentId,
        studentName: resolvedName,
        className: resolvedClass,
        answers: {},
        ownerUid: sessionOwnerUid,
        startedAt: started,
      });
      if (navigator.onLine) await setDoc(doc(db, 'examAttempts', id), attempt);
      await saveOfflineRecord('session:active', { exam, attemptId: id, studentId, className: resolvedClass, answers: {}, deadlineAt: endAt, startedAt: started, studentName: resolvedName, ownerUid: sessionOwnerUid });
      setOwnerUid(sessionOwnerUid);
      setStartedAt(started);
      setAttemptId(id); setAnswers({}); setCurrentQuestion(0); setActiveExam(exam); setDeadlineAt(endAt); setSecondsLeft(exam.duration * 60); setSection('take'); setMessage(navigator.onLine ? '' : 'Mode offline aktif. Jawaban disimpan pada perangkat dan akan disinkronkan saat internet kembali.');
    } catch (e) { setMessage('Tidak dapat memulai ujian. Pastikan data ujian sudah tersimpan di perangkat.'); }
  };

  const syncSubmittedAttemptToFirestore = async (
    targetAttemptId: string,
    createData: { examId: string; examTitle: string; studentId: string; studentName: string; className: string; ownerUid: string; startedAt: string },
    cleanAnswers: Record<string, number>,
    submittedAt: string,
    forced: boolean
  ) => {
    const attemptRef = doc(db, 'examAttempts', targetAttemptId);
    const existingSnap = await getDoc(attemptRef);
    if (!existingSnap.exists()) {
      await setDoc(attemptRef, buildAttemptCreatePayload({ ...createData, answers: {} }));
      await updateDoc(attemptRef, buildAttemptFinishPatch(cleanAnswers, submittedAt, forced));
      return null;
    }
    const existingData = existingSnap.data();
    if (existingData?.status === 'Mengerjakan') {
      await updateDoc(attemptRef, buildAttemptFinishPatch(cleanAnswers, submittedAt, forced));
      return null;
    }
    if (typeof existingData?.score === 'number' && typeof existingData?.total === 'number' && !existingData?.gradingIssue) {
      return {
        score: existingData.score,
        total: existingData.total,
        percent: typeof existingData.percent === 'number' ? existingData.percent : (existingData.total > 0 ? Math.round((existingData.score / existingData.total) * 100) : 0),
        gradingIssue: typeof existingData.gradingIssue === 'string' ? existingData.gradingIssue : '',
      };
    }
    return null;
  };

  const finishExam = async (forced = false) => {
    if (!activeExam || !attemptId || saving) return;
    setSaving(true);
    const student = examStudents.find(s => s.id === studentId);
    const submittedAt = new Date().toISOString();
    const cleanAnswers = sanitizeAnswersMap(forced ? answersRef.current : answers);
    const resolvedName = student?.name || verifiedStudentName || 'Siswa';
    const resolvedClass = student?.className || studentClass;
    const stableStartedAt = startedAt || new Date(deadlineAt - activeExam.duration * 60 * 1000).toISOString();
    let stableOwnerUid = ownerUid;
    try {
      await auth.authStateReady();
      if (navigator.onLine && !auth.currentUser) await signInAnonymously(auth);
      const currentUid = auth.currentUser?.uid || '';
      if (stableOwnerUid && currentUid && stableOwnerUid !== currentUid) throw new Error('Sesi Firebase berubah. Pengiriman dihentikan demi menjaga kepemilikan jawaban.');
      if (!stableOwnerUid) stableOwnerUid = currentUid;
      if (stableOwnerUid) setOwnerUid(stableOwnerUid);

      const pendingRecord = {
        id: attemptId,
        examId: activeExam.id,
        examTitle: activeExam.title,
        studentId,
        studentName: resolvedName,
        className: resolvedClass,
        ownerUid: stableOwnerUid,
        answers: cleanAnswers,
        status: 'Selesai' as const,
        startedAt: stableStartedAt,
        submittedAt,
        autoSubmitted: forced,
      };
      await saveOfflineRecord('pending:' + attemptId, pendingRecord);
      setFinishedResult({ attemptId, title: activeExam.title, studentName: resolvedName, className: resolvedClass });

      if (navigator.onLine) {
        if (!auth.currentUser) await signInAnonymously(auth);
        if (!stableOwnerUid) throw new Error('Identitas sesi Firebase belum tersedia.');
        const alreadyGraded = await syncSubmittedAttemptToFirestore(
          attemptId,
          {
            examId: activeExam.id,
            examTitle: activeExam.title,
            studentId,
            studentName: resolvedName,
            className: resolvedClass,
            ownerUid: stableOwnerUid,
            startedAt: stableStartedAt,
          },
          cleanAnswers,
          submittedAt,
          forced
        );
        if (alreadyGraded) {
          setFinishedResult(current => current ? { ...current, ...alreadyGraded, gradingError: undefined } : current);
          setMessage((forced ? 'Waktu habis. ' : '') + 'Jawaban terkirim. Nilai: ' + alreadyGraded.percent + '.');
        } else {
          setMessage((forced ? 'Waktu habis. ' : '') + 'Jawaban terkirim dan tersimpan. SIMPATIK admin akan menghitung nilai secara otomatis.');
        }
        await deleteOfflineRecord('pending:' + attemptId);      } else {
        setMessage('Ujian selesai secara offline. Hasil tersimpan di perangkat dan akan dikirim otomatis saat internet kembali.');
      }
      await deleteOfflineRecord('session:active');
      setActiveExam(null); setSection('results');
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'Sinkronisasi akan dicoba kembali saat internet tersedia.';
      setFinishedResult(current => current ? { ...current, gradingError: reason } : current);
      setMessage('Hasil tetap tersimpan di perangkat. ' + reason);
      await deleteOfflineRecord('session:active');
      setActiveExam(null); setSection('results');
    } finally { setSaving(false); }
  };

  const finishExamRef = useRef(finishExam);
  finishExamRef.current = finishExam;

  useEffect(() => {
    if (section !== 'take' || !activeExam || !deadlineAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && attemptId) void finishExamRef.current(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [section, activeExam, deadlineAt, attemptId]);

  useEffect(() => {
    if (section !== 'take' || !attemptId || !activeExam) return;
    const clean = sanitizeAnswersMap(answers);
    const session = { exam: activeExam, attemptId, studentId, studentName: verifiedStudentName, className: studentClass, answers: clean, deadlineAt, startedAt, ownerUid };
    void saveOfflineRecord('session:active', session);
    const timer = window.setTimeout(() => {
      if (navigator.onLine && auth.currentUser?.uid && ownerUid && auth.currentUser.uid === ownerUid) {
        updateDoc(doc(db, 'examAttempts', attemptId), { answers: clean, lastSavedAt: new Date().toISOString() }).catch(() => {});
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, section, attemptId, activeExam, studentId, verifiedStudentName, studentClass, deadlineAt, startedAt, ownerUid]);

  useEffect(() => {
    if (!isOnline || savingRef.current) return;
    let cancelled = false;
    const syncPending = async () => {
      if (savingRef.current) return;
      try {
        await auth.authStateReady();
        if (!auth.currentUser) await signInAnonymously(auth);
        const syncUid = auth.currentUser?.uid || '';
        if (!syncUid) throw new Error('UID Firebase tidak tersedia.');
        if (section === 'take' && activeExam && attemptId) {
          if (ownerUid && ownerUid !== syncUid) throw new Error('Sesi Firebase berubah; sinkronisasi dihentikan.');
          const resolvedStartedAt = startedAt || new Date(deadlineAt - activeExam.duration * 60000).toISOString();
          if (!ownerUid) {
            setOwnerUid(syncUid);
            await saveOfflineRecord('session:active', { exam: activeExam, attemptId, studentId, studentName: verifiedStudentName, className: studentClass, answers, deadlineAt, startedAt: resolvedStartedAt, ownerUid: syncUid });
          }
          const student = examStudents.find(item => item.id === studentId);
          const attemptRef = doc(db, 'examAttempts', attemptId);
          const existingSnap = await getDoc(attemptRef);
          if (!existingSnap.exists()) {
            await setDoc(attemptRef, buildAttemptCreatePayload({
              examId: activeExam.id,
              examTitle: activeExam.title,
              studentId,
              ownerUid: syncUid,
              studentName: student?.name || verifiedStudentName || 'Siswa',
              className: student?.className || studentClass,
              answers: sanitizeAnswersMap(answers),
              startedAt: resolvedStartedAt,
            }));
          } else if (existingSnap.data()?.status === 'Mengerjakan') {
            await updateDoc(attemptRef, { answers: sanitizeAnswersMap(answers), lastSavedAt: new Date().toISOString() });
          }
        }
        const pending = await readOfflineRecords<any>('pending:');
        let syncedCount = 0;
        for (const item of pending) {
          if (cancelled) return;
          if (item.ownerUid && item.ownerUid !== syncUid) { console.warn('Hasil offline dilewati karena UID tidak cocok:', item.id); continue; }
          const cleanAnswers = sanitizeAnswersMap(item.answers || {});
          const alreadyGraded = await syncSubmittedAttemptToFirestore(
            item.id,
            {
              examId: item.examId,
              examTitle: item.examTitle,
              studentId: item.studentId,
              studentName: item.studentName || 'Siswa',
              className: item.className,
              ownerUid: item.ownerUid || syncUid,
              startedAt: item.startedAt || new Date().toISOString(),
            },
            cleanAnswers,
            item.submittedAt || new Date().toISOString(),
            Boolean(item.autoSubmitted)
          );
          if (alreadyGraded) {
            setFinishedResult(current => current && current.attemptId === item.id ? { ...current, ...alreadyGraded, gradingError: undefined } : current);
          }
          await deleteOfflineRecord('pending:' + item.id);
          syncedCount += 1;
        }
        if (syncedCount) setMessage(syncedCount + ' hasil ujian berhasil dikirim ke Firebase. SIMPATIK admin menghitung nilai secara lokal.');
      } catch (e) { console.warn('Sinkronisasi ujian offline tertunda:', e); }
    };
    void syncPending();
    return () => { cancelled = true; };
  }, [isOnline, section, activeExam, attemptId, answers, studentId, verifiedStudentName, studentClass, examStudents, deadlineAt, startedAt, ownerUid]);

  const fmt = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
  const rosterNames = examStudents
    .filter(s => classLevel(s.className || '') === classLevel(studentClass))
    .sort((a,b)=>a.name.localeCompare(b.name,'id'));
  const studentEntry = () => <div className="mx-auto max-w-xl space-y-4">
    <div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#16B364]"><BookOpen size={30}/></div><h2 className="text-2xl font-black text-slate-800">Ruang Ujian Siswa</h2><p className="mt-1 text-sm text-slate-500">Masuk sebagai tamu. Tidak perlu login Google atau membuat akun.</p></div>
    <div className={panel+' space-y-3'}>
      <div className="rounded-xl border border-[#B7E8CD] bg-[#F7FCF9] px-4 py-3"><p className="text-xs font-bold text-[#0B8F4D]">KELAS UJIAN</p><p className="mt-1 text-lg font-black text-slate-800">{studentClass ? classDisplayName(studentClass) : 'Memuat kelas ujian…'}</p></div>
      <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama siswa</label><select className={field} value={selectedRosterStudentId} onChange={e=>{const found=examStudents.find(s=>s.id===e.target.value);setSelectedRosterStudentId(e.target.value);setVerifiedStudentName(found?.name||'')}} disabled={Boolean(studentId)||!studentClass}><option value="">Pilih nama siswa</option>{rosterNames.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      {studentId?<div className="rounded-xl border border-[#B7E8CD] bg-[#F7FCF9] p-3"><p className="text-xs font-bold text-[#0B8F4D]">IDENTITAS SISWA TERVERIFIKASI DARI DATA SIMPATIK</p><p className="mt-1 font-extrabold">{verifiedStudentName}</p><p className="text-sm text-slate-500">{studentClass}</p><button className="mt-3 text-xs font-bold text-rose-600" onClick={()=>{setStudentId('');setSelectedRosterStudentId('');setVerifiedStudentName('');void deleteOfflineRecord('student:identity');}}>Ganti identitas</button></div>:<button className={btn+' w-full'} disabled={!selectedRosterStudentId||!studentClass||!examStudents.length} onClick={()=>void enterGuestMode()}>Lanjutkan sebagai siswa</button>}
      {rosterLoadState === 'loading' && <p role="status" className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Memuat daftar siswa…</p>}
      {(rosterLoadState === 'empty' || rosterLoadState === 'error') && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Daftar siswa belum tersedia, hubungi admin sekolah.</p>}
    </div>
    {studentId && <div className="space-y-3"><h3 className="font-bold text-slate-700">Ujian tersedia</h3>{availableExams.map(ex=><div key={ex.id} className={panel}><div className="flex items-start justify-between gap-3"><div><h4 className="font-extrabold">{ex.title}</h4><p className="mt-1 text-xs text-slate-500">{ex.subject} · {ex.duration} menit · {ex.questionIds.length} soal</p></div><button className={btn} onClick={()=>void startExam(ex)}><Play size={15}/> Mulai</button></div></div>)}{!availableExams.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada ujian aktif untuk kelas ini.</p>}</div>}
  </div>;

  if (section === 'take' && activeExam) {
    const q = currentExamQuestions[currentQuestion];
    const done = Object.keys(answers).length;
    return <div className="mx-auto max-w-5xl space-y-4 pb-10">
      <div className="sticky top-0 z-20 rounded-2xl bg-white p-4 shadow-md"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#0B8F4D]">{activeExam.subject}</p><h2 className="font-black">{activeExam.title}</h2></div><div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-black tabular-nums ${secondsLeft < 300 ? 'bg-rose-50 text-rose-600' : 'bg-[#E3F7EC] text-[#0B8F4D]'}`}><Clock3 size={18}/>{fmt(secondsLeft)}</div></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{done} dari {currentExamQuestions.length} dijawab</span><span>{Math.round(done / Math.max(1,currentExamQuestions.length)*100)}%</span></div><div className="mt-2 flex flex-wrap gap-1.5">{currentExamQuestions.map((item,i)=><button key={item.id} onClick={()=>setCurrentQuestion(i)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${answers[item.id] !== undefined ? 'bg-[#16B364] text-white' : 'bg-slate-100 text-slate-600'} `}>{i+1}</button>)}</div></div>
      {q && <div className={panel}><p className="text-xs font-bold text-[#0B8F4D]">SOAL {currentQuestion+1} / {currentExamQuestions.length}</p><h3 className="my-4 text-lg font-bold leading-relaxed">{q.prompt}</h3><div className="space-y-2">{q.options.map((opt,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${answers[q.id]===i?'border-[#16B364] bg-[#E3F7EC]':'border-slate-200 hover:bg-slate-50'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${answers[q.id]===i?'bg-[#0B8F4D] text-white':'bg-slate-100 text-slate-600'}`}>{String.fromCharCode(65+i)}</span>{opt}</button>)}</div><div className="mt-6 flex items-center justify-between gap-2"><button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40" disabled={currentQuestion===0} onClick={()=>setCurrentQuestion(i=>i-1)}>Sebelumnya</button>{currentQuestion<currentExamQuestions.length-1?<button className={btn} onClick={()=>setCurrentQuestion(i=>i+1)}>Berikutnya</button>:<button className={btn} disabled={saving} onClick={()=>void finishExam(false)}><CheckCircle2 size={16}/> Selesaikan ujian</button>}</div></div>}
      <p className="text-center text-xs text-slate-400"><Save size={13} className="mr-1 inline"/> Jawaban disimpan otomatis saat dipilih.</p>
      {message&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
    </div>;
  }

  if (section === 'results' && !activeExam && finishedResult) {
    const result = finishedResult;
    const isGradedWithKeys = typeof result.score === 'number' && typeof result.total === 'number' && result.total > 0;
    const isGradedWithoutKeys = typeof result.score === 'number' && typeof result.total === 'number' && result.total === 0;
    return <div className="mx-auto max-w-xl space-y-4"><div className={panel+' text-center'}><Trophy size={42} className="mx-auto text-amber-500"/><h2 className="mt-3 text-2xl font-black">Hasil Ujian</h2>{result?<><p className="mt-2 font-bold">{result.title}</p><p className="mt-1 text-sm text-slate-500">{result.studentName} · {result.className}</p>{isGradedWithKeys ? <><p className="my-5 text-4xl font-black text-[#0B8F4D]">{result.percent ?? Math.round((result.score! / Math.max(1,result.total!))*100)}</p><p className="text-sm font-bold text-slate-600">Skor: {result.score} / {result.total}</p><div className="mt-3 inline-flex rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-bold text-[#0B8F4D]">{result.gradingIssue ? 'Nilai Sementara' : 'Selesai Dinilai'}</div><p className="mt-2 text-sm text-slate-600">{result.gradingIssue ? 'Nilai sementara dihitung dari soal yang sudah memiliki kunci jawaban.' : 'Penilaian otomatis telah selesai dan tersimpan.'}</p>{result.gradingIssue&&<p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{result.gradingIssue}</p>}</> : isGradedWithoutKeys ? <><p className="my-5 text-lg font-bold text-[#0B8F4D]">Jawaban berhasil disimpan</p><div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Menunggu Kunci Jawaban</div><p className="mt-2 text-sm text-slate-600">{result.gradingIssue || 'Belum ada soal yang dapat dinilai karena kunci jawaban belum tersedia.'}</p></> : <><p className="my-5 text-lg font-bold text-[#0B8F4D]">Jawaban berhasil disimpan</p><div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Sedang diperiksa</div><p className="mt-2 text-sm text-slate-600">Penilaian otomatis sedang diproses.</p>{result.gradingError&&<p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{result.gradingError}</p>}</>}</>:<p className="mt-3 text-sm text-slate-500">Hasil sedang disimpan.</p>}<button className={btn+' mt-5'} onClick={()=>{setSection('student');setAttemptId('');setFinishedResult(null);}}>Kembali</button></div></div>;
  }

  return <div className="space-y-5">
    {!linkedExamId&&<section className="relative isolate overflow-hidden rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-7 md:py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{backgroundImage:'radial-gradient(circle at 82% 16%, rgba(160,226,206,0.45) 0%, rgba(198,240,226,0.25) 30%, transparent 60%), radial-gradient(circle at 12% 26%, rgba(192,238,222,0.35) 0%, transparent 45%), linear-gradient(180deg, #F5FAF8 0%, #FFFFFF 100%)'}}/>
      <div className="flex items-center gap-3">
        {onBack&&<button type="button" onClick={onBack} aria-label="Kembali ke beranda" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CDE8D8] bg-white/90 text-[#0B8F4D] shadow-sm transition hover:bg-[#E3F7EC]"><ArrowLeft size={20}/></button>}
        <div><p className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">SIMPATIK · AKADEMIK</p><h2 className="text-2xl font-black text-[#17334B] md:text-3xl">Ujian</h2><p className="mt-1 text-sm text-slate-600">Buat, kelola, dan pantau ujian siswa.</p></div>
      </div>
    </section>}
    {offlineReady&&<div className="flex items-center gap-2 rounded-xl bg-[#E3F7EC] px-3 py-2 text-xs font-semibold text-[#0B8F4D]"><Save size={14}/> Soal dan data ujian tersimpan di perangkat untuk akses tanpa internet.</div>}
    {message&&<div className="rounded-xl bg-[#E3F7EC] p-3 text-sm text-[#076B3A]">{message}</div>}
    {section==='student'&&<div>{!linkedExamId&&<button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button>}{studentEntry()}</div>}
    {section==='home'&&<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <button className={panel+' flex min-h-[170px] flex-col items-start gap-4 text-left transition hover:-translate-y-0.5 hover:border-[#16B364] hover:shadow-md'} onClick={()=>setSection('create')}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#0B8F4D]"><Plus size={23}/></span><span className="min-w-0 flex-1"><strong className="block font-extrabold">Buat Ujian</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Susun ujian dari paket soal di Bank Soal Mapel.</span></span><ChevronRight className="self-end text-slate-400" size={20}/></button>
      <button className={panel+' flex min-h-[170px] flex-col items-start gap-4 text-left transition hover:-translate-y-0.5 hover:border-[#16B364] hover:shadow-md'} onClick={()=>setSection('manage')}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#0B8F4D]"><ClipboardList size={22}/></span><span className="min-w-0 flex-1"><strong className="block font-extrabold">Kelola Ujian</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Atur status ujian dan bagikan tautan pengerjaan.</span></span><ChevronRight className="self-end text-slate-400" size={20}/></button>
      <button className={panel+' flex min-h-[170px] flex-col items-start gap-4 text-left transition hover:-translate-y-0.5 hover:border-[#16B364] hover:shadow-md'} onClick={()=>setSection('results')}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#0B8F4D]"><Trophy size={22}/></span><span className="min-w-0 flex-1"><strong className="block font-extrabold">Hasil Ujian</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Pantau peserta dan hasil pengerjaan siswa.</span></span><ChevronRight className="self-end text-slate-400" size={20}/></button>
    </div>}    {section==='create'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-4 text-lg font-black">Buat Ujian</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><label className="mb-1 block text-xs font-bold">Tahun ajaran</label><input className={field} value={settings.activeAcademicYear} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Semester</label><input className={field} value={settings.activeSemester} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Kelas</label><select className={field} value={level} onChange={e=>setLevel(e.target.value)}>{cls.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Mata pelajaran</label><select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{SCHOOL_SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></div></div><label className="mb-1 mt-3 block text-xs font-bold">Nama ujian</label><input className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nama ujian"/><label className="mb-1 mt-3 block text-xs font-bold">Durasi (menit)</label><input type="number" min="1" max="240" className={field+' max-w-40'} value={duration} onChange={e=>setDuration(Math.max(1,Number(e.target.value)))}/><h4 className="mb-2 mt-5 font-extrabold">Pilih soal dari bank soal</h4><div className="max-h-96 space-y-3 overflow-auto rounded-xl border border-slate-200 p-3">{questionPackages.map(pkg=>{const ids=pkg.questions.map(q=>q.id);const allSelected=ids.length>0&&ids.every(id=>selectedQuestions.includes(id));return <div key={pkg.key} className="rounded-xl border border-slate-200 p-3"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={allSelected} onChange={e=>setSelectedQuestions(current=>e.target.checked?Array.from(new Set([...current,...ids])):current.filter(id=>!ids.includes(id)))}/><span className="min-w-0"><strong className="block text-sm">{pkg.title}</strong><small className="text-slate-500">{pkg.questions.length} soal dalam satu paket · {pkg.questions[0]?.subject} · {pkg.questions[0]?.className}</small></span></label><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-[#0B8F4D]">Pratinjau isi paket</summary><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">{pkg.questions.map(q=><li key={q.id}>{q.prompt}</li>)}</ol></details></div>})}{!questionPackages.length&&<p className="text-sm text-slate-500">Belum ada paket soal untuk kelas dan mapel ini. Impor soal melalui menu Mapel terlebih dahulu.</p>}</div><button className={btn+' mt-4'} disabled={saving} onClick={()=>void createExam()}><Plus size={16}/> Terbitkan Ujian ({selectedQuestions.length} soal)</button></div>}
    {section==='manage'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-3 text-lg font-black">Kelola Ujian</h3><div className="space-y-3">{exams.map(ex=><div key={ex.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-extrabold">{ex.title}</p><p className="mt-1 text-xs text-slate-500">{ex.className} · {ex.subject} · {ex.duration} menit · {ex.questionIds.length} soal</p><span className={'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold '+(ex.status==='Aktif'?'bg-[#E3F7EC] text-[#0B8F4D]':'bg-slate-100 text-slate-600')}>{ex.status}</span></div><div className="flex flex-wrap gap-2"><button className="rounded-xl border border-[#16B364] px-3 py-2 text-xs font-bold text-[#0B8F4D]" onClick={()=>{const url=makeExamLink(ex.id);setShareLink(url);setSection('share');}}><Copy size={14} className="mr-1 inline"/>Bagikan link</button><button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={()=>void updateDoc(doc(db,'exams',ex.id),{status:ex.status==='Aktif'?'Draft':'Aktif'})}>{ex.status==='Aktif'?'Nonaktifkan':'Aktifkan'}</button></div></div></div>)}{!exams.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada ujian. Buat ujian terlebih dahulu.</p>}</div>
    </div>}
    {section==='share'&&<div className={panel+' mx-auto max-w-2xl'}><div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#0B8F4D]"><LinkIcon size={28}/></div><h3 className="mt-3 text-xl font-black">Ujian berhasil dibuat</h3><p className="mt-1 text-sm text-slate-500">Bagikan tautan ini kepada siswa. Saat dibuka, siswa langsung masuk ke halaman ujian.</p></div><label className="mb-2 mt-5 block text-xs font-bold">Link pengerjaan siswa</label><div className="flex flex-col gap-2 sm:flex-row"><input className={field+' min-w-0'} readOnly value={shareLink}/><button className={btn+' shrink-0'} onClick={()=>void navigator.clipboard.writeText(shareLink)}><Copy size={15}/> Salin link</button></div><a href={shareLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0B8F4D]">Buka halaman siswa <ExternalLink size={14}/></a><div className="mt-5 flex flex-wrap gap-2"><button className={btn} onClick={()=>setSection('manage')}>Ke Kelola Ujian</button><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600" onClick={()=>setSection('home')}>Kembali ke menu</button></div></div>}
    {section==='results'&&<div className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button className="flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>selectedResultExamId?setSelectedResultExamId(''):setSection('home')}><ArrowLeft size={16}/> {selectedResultExamId?'Daftar Ujian':'Kembali'}</button><div className="flex items-center gap-2">{canManageExamQuestions&&selectedResultAttempts.some(a=>a.status==='Selesai')&&<button type="button" disabled={regrading} onClick={()=>void gradeAttemptsAsTeacher(selectedResultAttempts, true)} className="inline-flex items-center gap-1.5 rounded-full border border-[#16B364] bg-white px-3 py-1 text-xs font-bold text-[#0B8F4D] transition hover:bg-[#E3F7EC] disabled:opacity-50"><RefreshCw size={13} className={regrading?'animate-spin':''}/> {regrading?'Memeriksa…':'Hitung Ulang Nilai'}</button>}{selectedResultExam&&<button type="button" disabled={exportingResults} onClick={()=>void exportExamResults()} className="inline-flex items-center gap-1.5 rounded-full border border-[#16B364] bg-white px-3 py-1 text-xs font-bold text-[#0B8F4D] disabled:opacity-50"><FileSpreadsheet size={14}/>{exportingResults?'Mengekspor…':'Ekspor Excel'}</button>}{selectedResultExam&&<span className="rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-bold text-[#0B8F4D]">{selectedResultAttempts.length} peserta</span>}</div></div><h3 className="mb-3 text-lg font-black">{selectedResultExam?selectedResultExam.title:'Hasil Ujian'}</h3>{!selectedResultExam?<div className="space-y-3">{resultExamGroups.map(exam=><button key={exam.id} onClick={()=>setSelectedResultExamId(exam.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#16B364] hover:bg-[#F7FCF9]"><span className="min-w-0"><strong className="block truncate">{exam.title}</strong><span className="mt-1 block text-xs text-slate-500">{exam.subject?exam.subject+' · ':''}{exam.className} · {exam.attempts.length} peserta</span></span><ChevronRight className="shrink-0 text-[#0B8F4D]"/></button>)}{!resultExamGroups.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada ujian atau hasil pengerjaan siswa.</p>}</div>:<><p className="mb-3 text-sm text-slate-500">{selectedResultExam.subject} · {selectedResultExam.className}</p><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-3">Nama Siswa</th><th className="p-3">Kelas</th><th className="p-3">Skor</th><th className="p-3">Nilai</th><th className="p-3">Status</th><th className="p-3">Jawaban</th></tr></thead><tbody>{selectedResultAttempts.map(a=>{const hasScore=typeof a.score==='number'&&typeof a.total==='number';const hasKeys=hasScore&&a.total!>0;const computedPercent=hasKeys?(typeof a.percent==='number'?a.percent:Math.round(a.score!/Math.max(1,a.total!)*100)):null;return <tr key={a.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{a.studentName}</td><td className="p-3">{a.className}</td><td className="p-3 font-bold">{hasScore?(hasKeys?a.score+' / '+a.total:'0 / 0'):'—'}</td><td className="p-3 font-bold text-[#0B8F4D]">{a.status==='Selesai'?(hasKeys?computedPercent:(hasScore?'Belum ada kunci':'Sedang diperiksa')):'—'}</td><td className="p-3">{a.status!=='Selesai'?a.status:hasKeys?(a.gradingIssue?<div><span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Nilai sementara</span><p className="mt-1 text-xs text-slate-500">{a.gradingIssue}</p></div>:<span className="inline-flex rounded-full bg-[#E3F7EC] px-2.5 py-0.5 text-xs font-bold text-[#0B8F4D]">Selesai dinilai</span>):hasScore?<span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Menunggu kunci jawaban</span>:<div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-600">{a.gradingIssue||'Menunggu penilaian otomatis'}</span>{canManageExamQuestions&&<button type="button" disabled={regrading} onClick={()=>void gradeAttemptsAsTeacher([a], true)} className="rounded-lg border border-[#16B364] px-2.5 py-1 text-xs font-bold text-[#0B8F4D] hover:bg-[#E3F7EC] disabled:opacity-50">Nilai sekarang</button>}</div>}</td><td className="p-3"><button type="button" onClick={()=>setSelectedAnswerAttemptId(current=>current===a.id?'':a.id)} className="rounded-lg border border-[#B7E8CD] px-2.5 py-1.5 text-xs font-bold text-[#0B8F4D]">{selectedAnswerAttemptId===a.id?'Tutup':'Lihat jawaban'}</button></td></tr>;})}</tbody></table></div>{selectedAnswerAttemptId&&<div className="mt-4 rounded-xl border border-[#D5EADB] bg-[#F7FCF9] p-4"><div className="mb-3 flex items-center justify-between gap-2"><h4 className="font-extrabold">Detail jawaban: {selectedResultAttempts.find(item=>item.id===selectedAnswerAttemptId)?.studentName||'Siswa'}</h4><button type="button" onClick={()=>setSelectedAnswerAttemptId('')} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Tutup</button></div><div className="space-y-3">{answerDetails.map(row=><div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-[#0B8F4D]">SOAL {row.number}</p><p className="mt-1 text-sm font-semibold">{row.prompt}</p><div className="mt-2 grid gap-1 text-xs text-slate-600"><p>Jawaban siswa: <strong>{row.studentAnswer}</strong></p><p>Kunci jawaban: <strong>{row.correctAnswer}</strong></p><p>Hasil: <strong>{row.correct===true?'Benar':row.correct===false?'Salah':'Belum dapat dinilai'}</strong> · Poin: <strong>{row.earned}/{row.points}</strong></p></div></div>)}</div></div>}{!selectedResultAttempts.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada siswa yang mengerjakan ujian ini.</p>}</>}</div>}
  </div>;
};
