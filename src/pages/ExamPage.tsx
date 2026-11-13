import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deleteOfflineRecord, readOfflineRecord, readOfflineRecords, saveOfflineRecord } from '../lib/examOffline';
import { signInAnonymously, signOut } from 'firebase/auth';
import { BookOpen, Clock3, Plus, ClipboardList, Trophy, ArrowLeft, ChevronRight, CheckCircle2, Link as LinkIcon, Play, Save, Copy, ExternalLink } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_SUBJECTS } from '../data/subjects';

type Question = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; prompt: string; options: string[]; answer?: number; points: number; sourceFormId?: string };
type Exam = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; duration: number; questionIds: string[]; formUrl?: string; status: 'Aktif' | 'Draft'; createdAt: string };
type Attempt = { id: string; examId: string; examTitle: string; studentId: string; studentName: string; className: string; answers: Record<string, number>; score?: number; total?: number; status: 'Mengerjakan' | 'Selesai'; startedAt: string; submittedAt?: string };

const cls = ['VII', 'VIII', 'IX'];
const makeExamLink = (id: string) => { const url = new URL(window.location.href); url.search = ''; url.searchParams.set('ujian', id); return url.toString(); };
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#16B364] focus:ring-2 focus:ring-bg-[#E3F7EC]';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#16B364] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0B8F4D] disabled:cursor-not-allowed disabled:opacity-50';

function classLevel(value: string) { return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
export const ExamPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { students, classes, settings } = useData();
  const { firebaseUser, currentUser } = useAuth();
  const isVerifiedExamAdmin = firebaseUser?.email?.toLowerCase() === 'amiruddin@smpialwasi-maros.sch.id';
  const canManageExamQuestions = Boolean(firebaseUser && !firebaseUser.isAnonymous && ['super_admin', 'kepala_sekolah', 'operator', 'guru', 'wali_kelas'].includes(currentUser?.role || ''));
  const [examStudents, setExamStudents] = useState(students);
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
  const [verifiedStudentName, setVerifiedStudentName] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishedResult, setFinishedResult] = useState<{ title: string; studentName: string; className: string } | null>(null);
  const [selectedResultExamId, setSelectedResultExamId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    let unQ = () => {};
    let unE = () => {};
    let unA = () => {};
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
          setStudentId(session.studentId || '');
          setVerifiedStudentName(session.studentName || '');
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
          setStudentClass(cachedIdentity.className || '');
          setVerifiedStudentName(cachedIdentity.studentName || '');
        }
        if (!navigator.onLine) return;

        if (!isVerifiedExamAdmin && !auth.currentUser) await signInAnonymously(auth);
        if (!active || !auth.currentUser) return;

        if (!active) return;

        unQ = onSnapshot(collection(db, 'examPublicQuestions'), snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id, answer: undefined } as Question));
          setQuestions(rows);
          setOfflineReady(true);
          void saveOfflineRecord('cache:questions', rows);
        }, e => setMessage('Bank soal belum dapat dibaca: ' + e.message));

        unE = onSnapshot(collection(db, 'exams'), snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id } as Exam));
          setExams(rows);
          setOfflineReady(true);
          void saveOfflineRecord('cache:exams', rows);
        }, e => setMessage('Data ujian belum dapat dibaca: ' + e.message));

        if (isVerifiedExamAdmin) {
          unA = onSnapshot(collection(db, 'examAttempts'), snap => {
            setAttempts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Attempt)));
          }, e => console.warn(e));
        }
      } catch (e) {
        console.warn('Persiapan akses ujian:', e);
        if (active) setMessage('Akses ujian belum siap. Periksa koneksi dan akun Firebase.');
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
    };
  }, [isVerifiedExamAdmin]);

  useEffect(() => {
    if (!isVerifiedExamAdmin || !attempts.length || !exams.length) return;
    let cancelled = false;
    const gradeCompletedAttempts = async () => {
      const pending = attempts.filter(attempt =>
        attempt.status === 'Selesai' &&
        (typeof attempt.score !== 'number' || typeof attempt.total !== 'number')
      );
      for (const attempt of pending) {
        if (cancelled) return;
        const exam = exams.find(item => item.id === attempt.examId);
        if (!exam || !exam.questionIds.length) continue;
        try {
          const keySnapshots = await Promise.all(
            exam.questionIds.map(questionId => getDoc(doc(db, 'examAnswerKeys', questionId)))
          );
          if (keySnapshots.some(snapshot => !snapshot.exists())) continue;
          let score = 0;
          let total = 0;
          exam.questionIds.forEach((questionId, index) => {
            const key = keySnapshots[index]?.data();
            if (!key) return;
            const points = Number(key.points) || 1;
            total += points;
            if (attempt.answers?.[questionId] === key.answer) score += points;
          });
          if (!cancelled && total > 0) {
            await updateDoc(doc(db, 'examAttempts', attempt.id), {
              score,
              total,
              percent: Math.round((score / total) * 100),
              gradedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Penilaian otomatis ujian gagal:', attempt.id, error);
        }
      }
    };
    void gradeCompletedAttempts();
    return () => { cancelled = true; };
  }, [isVerifiedExamAdmin, attempts, exams]);

  useEffect(() => {
    if (!linkedExamId || !exams.length || studentId) return;
    const linkedExam = exams.find(item => item.id === linkedExamId);
    if (linkedExam) setStudentClass(linkedExam.className);
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
    if (!isVerifiedExamAdmin) { setMessage('Hanya admin sekolah yang dapat menerbitkan ujian.'); return; }
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
    const name = verifiedStudentName.trim();
    if (!name) { setMessage('Masukkan nama lengkap terlebih dahulu.'); return; }
    if (!studentClass) { setMessage('Pilih kelas terlebih dahulu.'); return; }
    try {
      await auth.authStateReady();
      if (auth.currentUser && !auth.currentUser.isAnonymous) await signOut(auth);
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser?.uid;
      if (!uid || !auth.currentUser?.isAnonymous) throw new Error('Mode tamu belum tersedia. Coba buka kembali tautan ujian.');
      const guestId = 'TAMU-' + uid;
      await saveOfflineRecord('student:identity', { studentId: guestId, studentName: name, className: studentClass, ownerUid: uid });
      setStudentId(guestId);
      setVerifiedStudentName(name);
      setMessage('Mode tamu aktif. Silakan mulai ujian.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tidak dapat masuk sebagai tamu. Periksa koneksi internet.');
    }
  };

  const startExam = async (exam: Exam) => {
    const student = examStudents.find(s => s.id === studentId);
    if (!studentId || !verifiedStudentName) { setMessage('Verifikasi ID Ujian siswa terlebih dahulu.'); return; }
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
      const id = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      const endAt = Date.now() + exam.duration * 60 * 1000;
      const attempt = { examId: exam.id, examTitle: exam.title, studentId, studentName: student?.name || verifiedStudentName, className: student?.className || studentClass, answers: {}, ownerUid: sessionOwnerUid, status: 'Mengerjakan', startedAt };
      if (navigator.onLine) await setDoc(doc(db, 'examAttempts', id), attempt);
      await saveOfflineRecord('session:active', { exam, attemptId: id, studentId, className: student?.className || studentClass, answers: {}, deadlineAt: endAt, studentName: student?.name || verifiedStudentName, ownerUid: sessionOwnerUid });
      setOwnerUid(sessionOwnerUid);
      setAttemptId(id); setAnswers({}); setCurrentQuestion(0); setActiveExam(exam); setDeadlineAt(endAt); setSecondsLeft(exam.duration * 60); setSection('take'); setMessage(navigator.onLine ? '' : 'Mode offline aktif. Jawaban disimpan pada perangkat dan akan disinkronkan saat internet kembali.');
    } catch (e) { setMessage('Tidak dapat memulai ujian. Pastikan data ujian sudah tersimpan di perangkat.'); }
  };

  const finishExam = async (forced = false) => {
    if (!activeExam || !attemptId || saving) return;
    setSaving(true);
    const student = examStudents.find(s => s.id === studentId);
    const submittedAt = new Date().toISOString();
    let stableOwnerUid = ownerUid;
    try {
      await auth.authStateReady();
      if (navigator.onLine && !auth.currentUser) await signInAnonymously(auth);
      const currentUid = auth.currentUser?.uid || '';
      if (stableOwnerUid && currentUid && stableOwnerUid !== currentUid) throw new Error('Sesi Firebase berubah. Pengiriman dihentikan demi menjaga kepemilikan jawaban.');
      if (!stableOwnerUid) stableOwnerUid = currentUid;
      if (stableOwnerUid) setOwnerUid(stableOwnerUid);
      const payload = { examId: activeExam.id, examTitle: activeExam.title, studentId, studentName: student?.name || verifiedStudentName || 'Siswa', className: student?.className || studentClass, ownerUid: stableOwnerUid, answers, status: 'Selesai', startedAt: new Date(deadlineAt - activeExam.duration * 60 * 1000).toISOString(), submittedAt, autoSubmitted: forced };
      await saveOfflineRecord('pending:' + attemptId, { id: attemptId, ...payload });
      setFinishedResult({ title: activeExam.title, studentName: payload.studentName, className: payload.className });
      if (navigator.onLine) {
        if (!auth.currentUser) await signInAnonymously(auth);
        if (!stableOwnerUid) throw new Error('Identitas sesi Firebase belum tersedia.');
        await setDoc(doc(db, 'examAttempts', attemptId), payload, { merge: true });
        await deleteOfflineRecord('pending:' + attemptId);
        setMessage(forced ? 'Waktu habis. Jawaban terkirim otomatis.' : 'Jawaban berhasil dikirim.');
      } else {
        setMessage('Ujian selesai secara offline. Hasil tersimpan di perangkat dan akan dikirim otomatis saat internet kembali.');
      }
      await deleteOfflineRecord('session:active');
      setActiveExam(null); setSection('results');
    } catch (e) {
      setMessage('Hasil tetap tersimpan di perangkat. Sinkronisasi akan dicoba kembali saat internet tersedia.');
      await deleteOfflineRecord('session:active');
      setActiveExam(null); setSection('results');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    if (section !== 'take' || !activeExam || !deadlineAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && attemptId) void finishExam(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [section, activeExam, deadlineAt, attemptId]);

  useEffect(() => {
    if (section !== 'take' || !attemptId || !activeExam) return;
    const session = { exam: activeExam, attemptId, studentId, className: studentClass, answers, deadlineAt, ownerUid };
    void saveOfflineRecord('session:active', session);
    const timer = window.setTimeout(() => {
      if (navigator.onLine && auth.currentUser?.uid && ownerUid && auth.currentUser.uid === ownerUid) updateDoc(doc(db, 'examAttempts', attemptId), { answers, lastSavedAt: new Date().toISOString() }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, section, attemptId, activeExam, studentId, studentClass, deadlineAt, ownerUid]);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const syncPending = async () => {
      try {
        await auth.authStateReady();
        if (!auth.currentUser) await signInAnonymously(auth);
        const syncUid = auth.currentUser?.uid || '';
        if (!syncUid) throw new Error('UID Firebase tidak tersedia.');
        if (section === 'take' && activeExam && attemptId) {
          if (ownerUid && ownerUid !== syncUid) throw new Error('Sesi Firebase berubah; sinkronisasi dihentikan.');
          if (!ownerUid) { setOwnerUid(syncUid); await saveOfflineRecord('session:active', { exam: activeExam, attemptId, studentId, className: studentClass, answers, deadlineAt, ownerUid: syncUid }); }
          const student = examStudents.find(item => item.id === studentId);
          await setDoc(doc(db, 'examAttempts', attemptId), {
            examId: activeExam.id, examTitle: activeExam.title, studentId, ownerUid: syncUid,
            studentName: student?.name || verifiedStudentName || 'Siswa', className: student?.className || studentClass,
            answers, status: 'Mengerjakan', startedAt: new Date(deadlineAt - activeExam.duration * 60000).toISOString()
          }, { merge: true });
          await updateDoc(doc(db, 'examAttempts', attemptId), { answers, lastSavedAt: new Date().toISOString() });
        }
        const pending = await readOfflineRecords<any>('pending:');
        for (const item of pending) {
          if (cancelled) return;
          if (item.ownerUid && item.ownerUid !== syncUid) { console.warn('Hasil offline dilewati karena UID tidak cocok:', item.id); continue; }
          await setDoc(doc(db, 'examAttempts', item.id), { ...item, ownerUid: item.ownerUid || syncUid }, { merge: true });
          await deleteOfflineRecord('pending:' + item.id);
        }
        if (pending.length) setMessage(pending.length + ' hasil ujian offline berhasil disinkronkan ke server.');
      } catch (e) { console.warn('Sinkronisasi ujian offline tertunda:', e); }
    };
    void syncPending();
    return () => { cancelled = true; };
  }, [isOnline, section, activeExam, attemptId, answers, studentId, studentClass, examStudents, deadlineAt, ownerUid]);

  const fmt = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
  const studentEntry = () => <div className="mx-auto max-w-xl space-y-4">
    <div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#16B364]"><BookOpen size={30}/></div><h2 className="text-2xl font-black text-slate-800">Ruang Ujian Siswa</h2><p className="mt-1 text-sm text-slate-500">Masuk sebagai tamu. Tidak perlu login Google atau membuat akun.</p></div>
    <div className={panel+' space-y-3'}>
      <div><label className="mb-1 block text-xs font-bold text-slate-600">Nama lengkap</label><input className={field} value={verifiedStudentName} onChange={e=>setVerifiedStudentName(e.target.value)} placeholder="Ketik nama lengkap" disabled={Boolean(studentId)}/></div>
      <div><label className="mb-1 block text-xs font-bold text-slate-600">Kelas</label>{linkedExamId?<input className={field} value={studentClass || 'Memuat kelas ujian…'} readOnly/>:<select className={field} value={studentClass} onChange={e=>setStudentClass(e.target.value)} disabled={Boolean(studentId)}><option value="">Pilih kelas</option>{classes.map(item=><option key={item} value={item}>{item}</option>)}</select>}</div>
      {studentId?<div className="rounded-xl border border-[#B7E8CD] bg-[#F7FCF9] p-3"><p className="text-xs font-bold text-[#0B8F4D]">MODE TAMU AKTIF</p><p className="mt-1 font-extrabold">{verifiedStudentName}</p><p className="text-sm text-slate-500">{studentClass}</p><button className="mt-3 text-xs font-bold text-rose-600" onClick={()=>{setStudentId('');void deleteOfflineRecord('student:identity');}}>Ganti identitas</button></div>:<button className={btn+' w-full'} onClick={()=>void enterGuestMode()}>Lanjutkan sebagai tamu</button>}
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
    return <div className="mx-auto max-w-xl space-y-4"><div className={panel+' text-center'}><Trophy size={42} className="mx-auto text-amber-500"/><h2 className="mt-3 text-2xl font-black">Hasil Ujian</h2>{result?<><p className="mt-2 font-bold">{result.title}</p><p className="mt-1 text-sm text-slate-500">{result.studentName} · {result.className}</p><p className="my-5 text-lg font-bold text-[#0B8F4D]">Jawaban berhasil disimpan</p><p className="text-sm text-slate-600">Nilai menunggu pemeriksaan guru.</p></>:<p className="mt-3 text-sm text-slate-500">Hasil sedang disimpan.</p>}<button className={btn+' mt-5'} onClick={()=>{setSection('student');setAttemptId('');setFinishedResult(null);}}>Kembali</button></div></div>;
  }

  return <div className="space-y-5">
    {!linkedExamId&&<section className="relative isolate overflow-hidden rounded-[24px] border border-[#D5EADB] bg-gradient-to-br from-white via-[#E3F7EC] to-[#E7F6EF] px-5 py-5 shadow-sm md:px-7 md:py-6">
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
    {section==='results'&&<div className={panel}><div className="mb-4 flex items-center justify-between gap-3"><button className="flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>selectedResultExamId?setSelectedResultExamId(''):setSection('home')}><ArrowLeft size={16}/> {selectedResultExamId?'Daftar Ujian':'Kembali'}</button>{selectedResultExam&&<span className="rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-bold text-[#0B8F4D]">{selectedResultAttempts.length} peserta</span>}</div><h3 className="mb-3 text-lg font-black">{selectedResultExam?selectedResultExam.title:'Hasil Ujian'}</h3>{!selectedResultExam?<div className="space-y-3">{resultExamGroups.map(exam=><button key={exam.id} onClick={()=>setSelectedResultExamId(exam.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#16B364] hover:bg-[#F7FCF9]"><span className="min-w-0"><strong className="block truncate">{exam.title}</strong><span className="mt-1 block text-xs text-slate-500">{exam.subject?exam.subject+' · ':''}{exam.className} · {exam.attempts.length} peserta</span></span><ChevronRight className="shrink-0 text-[#0B8F4D]"/></button>)}{!resultExamGroups.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada ujian atau hasil pengerjaan siswa.</p>}</div>:<><p className="mb-3 text-sm text-slate-500">{selectedResultExam.subject} · {selectedResultExam.className}</p><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-3">Nama Siswa</th><th className="p-3">Kelas</th><th className="p-3">Skor</th><th className="p-3">Nilai</th><th className="p-3">Status</th></tr></thead><tbody>{selectedResultAttempts.map(a=><tr key={a.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{a.studentName}</td><td className="p-3">{a.className}</td><td className="p-3 font-bold">{a.status==='Selesai'&&typeof a.score==='number'&&typeof a.total==='number'?a.score+' / '+a.total:'—'}</td><td className="p-3 font-bold text-[#0B8F4D]">{a.status==='Selesai'?typeof a.score==='number'&&typeof a.total==='number'?Math.round(a.score/Math.max(1,a.total)*100):'Sedang diperiksa':'—'}</td><td className="p-3">{a.status==='Selesai'?(typeof a.score==='number'?'Selesai':'Menunggu pemeriksaan'):a.status}</td></tr>)}</tbody></table></div>{!selectedResultAttempts.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada siswa yang mengerjakan ujian ini.</p>}</>}</div>}
  </div>;
};
