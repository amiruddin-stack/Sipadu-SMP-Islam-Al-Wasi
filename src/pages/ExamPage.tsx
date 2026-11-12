import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deleteOfflineRecord, readOfflineRecord, readOfflineRecords, saveOfflineRecord } from '../lib/examOffline';
import { signInAnonymously } from 'firebase/auth';
import { BookOpen, Clock3, FileUp, Plus, ClipboardList, Trophy, ArrowLeft, CheckCircle2, Link as LinkIcon, Play, Save } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

type Question = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; prompt: string; options: string[]; answer?: number; points: number };
type Exam = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; duration: number; questionIds: string[]; formUrl?: string; status: 'Aktif' | 'Draft'; createdAt: string };
type Attempt = { id: string; examId: string; examTitle: string; studentId: string; studentName: string; className: string; answers: Record<string, number>; score?: number; total?: number; status: 'Mengerjakan' | 'Selesai'; startedAt: string; submittedAt?: string };

const cls = ['VII', 'VIII', 'IX'];
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#16B364] focus:ring-2 focus:ring-bg-[#E3F7EC]';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#16B364] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0B8F4D] disabled:cursor-not-allowed disabled:opacity-50';

function classLevel(value: string) { return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
export const ExamPage: React.FC = () => {
  const { students, classes, subjects, settings } = useData();
  const { firebaseUser } = useAuth();
  const isVerifiedExamAdmin = firebaseUser?.email?.toLowerCase() === 'amiruddin@smpialwasi-maros.sch.id';
  const [examStudents, setExamStudents] = useState(students);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [section, setSection] = useState<'home' | 'student' | 'upload' | 'create' | 'results' | 'take'>('home');
  const [level, setLevel] = useState('VII');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [duration, setDuration] = useState(60);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [questionFileName, setQuestionFileName] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishedResult, setFinishedResult] = useState<{ title: string; studentName: string; className: string } | null>(null);
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
        const [cachedQuestions, cachedExams, session] = await Promise.all([
          readOfflineRecord<Question[]>('cache:questions'),
          readOfflineRecord<Exam[]>('cache:exams'),
          readOfflineRecord<any>('session:active')
        ]);
        if (!active) return;
        if (cachedQuestions) setQuestions(cachedQuestions);
        if (cachedExams) setExams(cachedExams);
        if (session?.exam && session?.attemptId && session?.deadlineAt) {
          setActiveExam(session.exam);
          setAnswers(session.answers || {});
          setAttemptId(session.attemptId);
          setStudentId(session.studentId || '');
          setStudentClass(session.className || '');
          setDeadlineAt(session.deadlineAt);
          setSecondsLeft(Math.max(0, Math.ceil((session.deadlineAt - Date.now()) / 1000)));
          setSection('take');
          setMessage('Ujian sebelumnya dipulihkan dari penyimpanan perangkat.');
        }
        setOfflineReady(Boolean(cachedQuestions?.length && cachedExams?.length));
        if (!navigator.onLine) return;

        await auth.authStateReady();
        if (!isVerifiedExamAdmin && !auth.currentUser) await signInAnonymously(auth);
        if (!active || !auth.currentUser) return;

        const snapshot = await getDocs(collection(db, 'students'));
        if (active && !snapshot.empty) {
          setExamStudents(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as typeof students[number])));
        }
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

  const selectedClassNames = useMemo(() => classes.filter(c => classLevel(c) === level), [classes, level]);
  const studentsInClass = useMemo(() => examStudents.filter(s => s.status === 'Aktif' && (studentClass ? s.className === studentClass : classLevel(s.className) === level)).sort((a,b) => a.name.localeCompare(b.name)), [examStudents, studentClass, level]);
  const classQuestions = questions.filter(q => classLevel(q.className) === level && (!subject || q.subject === subject));
  const currentExamQuestions = activeExam ? activeExam.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[] : [];
  const availableExams = exams.filter(e => e.status === 'Aktif' && classLevel(e.className) === classLevel(studentClass || level));

  const addQuestion = async () => {
    if (!isVerifiedExamAdmin) { setMessage('Hanya admin sekolah yang dapat menambahkan soal dan kunci jawaban.'); return; }
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

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!isVerifiedExamAdmin) { setMessage('Hanya admin sekolah yang dapat mengimpor soal dan kunci jawaban.'); return; }
    setQuestionFileName(file.name);
    try {
      const raw = await file.text();
      let parsed: any[];
      if (file.name.toLowerCase().endsWith('.json')) parsed = JSON.parse(raw);
      else parsed = raw.split(/\r?\n/).filter(Boolean).slice(1).map(line => {
        const [prompt, a, b, c, d, answer] = line.split(';');
        return { prompt, options: [a,b,c,d], answer: Number(answer) - 1 };
      });
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Format kosong');
      const batch = parsed.map(q => ({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ''), subject, className: selectedClassNames[0] || level,
        academicYear: settings.activeAcademicYear, semester: settings.activeSemester,
        prompt: String(q.prompt || q.question || ''), options: (q.options || [q.a,q.b,q.c,q.d]).map(String),
        answer: typeof q.answer === 'number' ? q.answer : Math.max(0, ['A','B','C','D'].indexOf(String(q.answer).toUpperCase())),
        points: Number(q.points || 1), createdAt: new Date().toISOString()
      })).filter(q => q.prompt && q.options.length >= 2 && q.options.every(Boolean));
      if (!batch.length) throw new Error('Tidak ada soal valid');
      await Promise.all(batch.map(async q => { const { answer, ...publicQuestion } = q; const questionRef = doc(collection(db, 'examPublicQuestions')); await setDoc(questionRef, publicQuestion); await setDoc(doc(db, 'examAnswerKeys', questionRef.id), { answer, points: q.points, createdAt: q.createdAt }); }));
      setMessage(batch.length + ' soal berhasil diimpor.');
    } catch (e) { setMessage('File tidak terbaca. Gunakan JSON atau CSV titik koma dengan kolom pertanyaan;A;B;C;D;kunci (1-4).'); }
  };

  const createExam = async () => {
    if (!isVerifiedExamAdmin) { setMessage('Hanya admin sekolah yang dapat menerbitkan ujian.'); return; }
    if (!title.trim() || !subject || !selectedQuestions.length) { setMessage('Isi nama ujian, mapel, dan pilih minimal satu soal.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'exams'), { title: title.trim(), subject, className: selectedClassNames[0] || level, academicYear: settings.activeAcademicYear, semester: settings.activeSemester, duration, questionIds: selectedQuestions, formUrl: formUrl.trim(), status: 'Aktif', createdAt: new Date().toISOString() });
      setMessage('Ujian berhasil diterbitkan dan tersedia pada halaman siswa.');
      setSection('home'); setSelectedQuestions([]);
    } catch (e) { setMessage('Gagal membuat ujian. Periksa koneksi dan autentikasi Firebase.'); }
    finally { setSaving(false); }
  };

  const startExam = async (exam: Exam) => {
    const student = examStudents.find(s => s.id === studentId);
    if (!student) { setMessage('Pilih kelas dan nama siswa terlebih dahulu.'); return; }
    const examQuestions = exam.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
    if (!examQuestions.length) { setMessage('Soal belum tersimpan di perangkat. Buka halaman ini saat online untuk memuat soal terlebih dahulu.'); return; }
    try {
      if (navigator.onLine && !auth.currentUser) await signInAnonymously(auth);
      const id = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      const endAt = Date.now() + exam.duration * 60 * 1000;
      const attempt = { examId: exam.id, examTitle: exam.title, studentId: student.id, studentName: student.name, className: student.className, answers: {}, ownerUid: auth.currentUser?.uid || '', status: 'Mengerjakan', startedAt };
      if (navigator.onLine) await setDoc(doc(db, 'examAttempts', id), attempt);
      await saveOfflineRecord('session:active', { exam, attemptId: id, studentId: student.id, className: student.className, answers: {}, deadlineAt: endAt, studentName: student.name });
      setAttemptId(id); setAnswers({}); setCurrentQuestion(0); setActiveExam(exam); setDeadlineAt(endAt); setSecondsLeft(exam.duration * 60); setSection('take'); setMessage(navigator.onLine ? '' : 'Mode offline aktif. Jawaban disimpan pada perangkat dan akan disinkronkan saat internet kembali.');
    } catch (e) { setMessage('Tidak dapat memulai ujian. Pastikan data ujian sudah tersimpan di perangkat.'); }
  };

  const finishExam = async (forced = false) => {
    if (!activeExam || !attemptId || saving) return;
    setSaving(true);
    const student = examStudents.find(s => s.id === studentId);
    const submittedAt = new Date().toISOString();
    const payload = { examId: activeExam.id, examTitle: activeExam.title, studentId, studentName: student?.name || 'Siswa', className: student?.className || studentClass, ownerUid: auth.currentUser?.uid || '', answers, status: 'Selesai', startedAt: new Date(deadlineAt - activeExam.duration * 60 * 1000).toISOString(), submittedAt, autoSubmitted: forced };
    try {
      await saveOfflineRecord('pending:' + attemptId, { id: attemptId, ...payload });
      setFinishedResult({ title: activeExam.title, studentName: payload.studentName, className: payload.className });
      if (navigator.onLine) {
        if (!auth.currentUser) await signInAnonymously(auth);
        await setDoc(doc(db, 'examAttempts', attemptId), { ...payload, ownerUid: auth.currentUser?.uid || '' }, { merge: true });
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
    const session = { exam: activeExam, attemptId, studentId, className: studentClass, answers, deadlineAt };
    void saveOfflineRecord('session:active', session);
    const timer = window.setTimeout(() => {
      if (navigator.onLine) updateDoc(doc(db, 'examAttempts', attemptId), { answers, lastSavedAt: new Date().toISOString() }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, section, attemptId, activeExam, studentId, studentClass, deadlineAt]);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const syncPending = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
        if (section === 'take' && activeExam && attemptId) {
          const student = examStudents.find(item => item.id === studentId);
          await setDoc(doc(db, 'examAttempts', attemptId), {
            examId: activeExam.id, examTitle: activeExam.title, studentId, ownerUid: auth.currentUser?.uid || '',
            studentName: student?.name || 'Siswa', className: student?.className || studentClass,
            answers, status: 'Mengerjakan', startedAt: new Date(deadlineAt - activeExam.duration * 60000).toISOString()
          }, { merge: true });
          await updateDoc(doc(db, 'examAttempts', attemptId), { answers, lastSavedAt: new Date().toISOString() });
        }
        const pending = await readOfflineRecords<any>('pending:');
        for (const item of pending) {
          if (cancelled) return;
          await setDoc(doc(db, 'examAttempts', item.id), { ...item, ownerUid: auth.currentUser?.uid || '' }, { merge: true });
          await deleteOfflineRecord('pending:' + item.id);
        }
        if (pending.length) setMessage(pending.length + ' hasil ujian offline berhasil disinkronkan ke server.');
      } catch (e) { console.warn('Sinkronisasi ujian offline tertunda:', e); }
    };
    void syncPending();
    return () => { cancelled = true; };
  }, [isOnline, section, activeExam, attemptId, answers, studentId, studentClass, examStudents, deadlineAt]);

  const fmt = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
  const studentEntry = () => <div className="mx-auto max-w-xl space-y-4">
    <div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F7EC] text-[#16B364]"><BookOpen size={30}/></div><h2 className="text-2xl font-black text-slate-800">Ruang Ujian Siswa</h2><p className="mt-1 text-sm text-slate-500">Pilih kelas dan nama untuk melihat ujian yang tersedia.</p></div>
    <div className={panel}><label className="mb-1 block text-xs font-bold text-slate-600">Kelas</label><select className={field} value={studentClass} onChange={e => {setStudentClass(e.target.value);setStudentId('');}}><option value="">Pilih kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select><label className="mb-1 mt-4 block text-xs font-bold text-slate-600">Nama siswa</label><select className={field} value={studentId} onChange={e=>setStudentId(e.target.value)} disabled={!studentClass}><option value="">Pilih nama siswa</option>{studentsInClass.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
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

  if (section === 'results' && !activeExam) {
    const result = finishedResult;
    return <div className="mx-auto max-w-xl space-y-4"><div className={panel+' text-center'}><Trophy size={42} className="mx-auto text-amber-500"/><h2 className="mt-3 text-2xl font-black">Hasil Ujian</h2>{result?<><p className="mt-2 font-bold">{result.title}</p><p className="mt-1 text-sm text-slate-500">{result.studentName} · {result.className}</p><p className="my-5 text-lg font-bold text-[#0B8F4D]">Jawaban berhasil disimpan</p><p className="text-sm text-slate-600">Nilai menunggu pemeriksaan guru.</p></>:<p className="mt-3 text-sm text-slate-500">Hasil sedang disimpan.</p>}<button className={btn+' mt-5'} onClick={()=>{setSection('student');setAttemptId('');}}>Kembali</button></div></div>;
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0B8F4D]">SIMPATIK · AKADEMIK</p><h2 className="text-2xl font-black text-slate-800">Modul Ujian</h2><p className="mt-1 text-sm text-slate-500">Kelola bank soal, susun ujian, dan pantau hasil siswa.</p></div><button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700" onClick={()=>setSection('student')}>Halaman siswa</button></div>
    <div className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isOnline ? 'bg-[#E3F7EC] text-[#0B8F4D]' : 'bg-amber-50 text-amber-800'}`}>
      <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-[#16B364]' : 'bg-amber-500'}`} />
      {isOnline ? (offlineReady ? 'Online · Soal dan ujian tersimpan untuk akses offline' : 'Online · Memuat data ujian untuk disimpan di perangkat') : 'Offline · Jawaban disimpan di perangkat dan disinkronkan otomatis'}
    </div>
    {message&&<div className="rounded-xl bg-[#E3F7EC] p-3 text-sm text-[#076B3A]">{message}</div>}
    {section==='student'&&<div><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali ke pengelolaan ujian</button>{studentEntry()}</div>}
    {section==='home'&&<><div className="grid gap-3 sm:grid-cols-3"><button className={panel+' text-left hover:border-[#16B364]'} onClick={()=>setSection('upload')}><FileUp className="text-[#0B8F4D]"/><h3 className="mt-3 font-extrabold">Unggah File</h3><p className="mt-1 text-xs text-slate-500">Impor soal JSON/CSV atau simpan tautan Google Form.</p></button><button className={panel+' text-left hover:border-[#16B364]'} onClick={()=>setSection('create')}><Plus className="text-[#0B8F4D]"/><h3 className="mt-3 font-extrabold">Buat Ujian</h3><p className="mt-1 text-xs text-slate-500">Pilih tahun ajaran, semester, kelas, dan soal.</p></button><button className={panel+' text-left hover:border-[#16B364]'} onClick={()=>setSection('results')}><Trophy className="text-[#0B8F4D]"/><h3 className="mt-3 font-extrabold">Hasil Ujian</h3><p className="mt-1 text-xs text-slate-500">Lihat nilai dan status pengerjaan.</p></button></div><div className={panel}><h3 className="mb-3 font-extrabold">Pilih Kelas</h3><div className="grid grid-cols-3 gap-3">{cls.map(c=><button key={c} onClick={()=>{setLevel(c);setSection('create');}} className={`rounded-xl border p-5 text-center font-black ${level===c?'border-[#16B364] bg-[#E3F7EC] text-[#0B8F4D]':'border-slate-200'}`}>Kelas {c}</button>)}</div></div><div className={panel}><h3 className="mb-3 font-extrabold">Daftar Ujian</h3>{exams.map(ex=><div key={ex.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-3"><div><p className="font-bold">{ex.title}</p><p className="text-xs text-slate-500">{ex.className} · {ex.subject} · {ex.duration} menit</p></div><span className="rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-bold text-[#0B8F4D]">{ex.status}</span></div>)}{!exams.length&&<p className="text-sm text-slate-500">Belum ada ujian dibuat.</p>}</div></>}
    {section==='upload'&&<div className={panel+' max-w-3xl'}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-4 text-lg font-black">Unggah File Soal</h3><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-bold">Kelas</label><select className={field} value={level} onChange={e=>setLevel(e.target.value)}>{cls.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Mata pelajaran</label><select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div></div><label className="mb-1 mt-3 block text-xs font-bold">Nama soal / judul ujian</label><input className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: PTS Bahasa Arab Kelas VII"/><label className="mb-1 mt-3 block text-xs font-bold">Tautan Google Form (opsional)</label><input className={field} value={formUrl} onChange={e=>setFormUrl(e.target.value)} placeholder="https://docs.google.com/forms/..."/><p className="mt-1 text-xs text-slate-500">Tautan disimpan sebagai referensi. Judul Google Form belum dapat dibaca otomatis dari browser tanpa layanan penghubung Google Apps Script/API.</p><label className="mb-1 mt-4 block text-xs font-bold">Pilih file JSON atau CSV</label><input type="file" accept=".json,.csv,.txt" className={field} onChange={e=>void importFile(e.target.files?.[0])}/>{questionFileName&&<p className="mt-2 text-xs text-slate-500">File: {questionFileName}</p>}<p className="mt-3 text-xs text-slate-500">JSON: [{'{'}"prompt":"Pertanyaan","options":["A","B","C","D"],"answer":0{' }'}]. CSV: pertanyaan;A;B;C;D;kunci (1-4).</p></div>}
    {section==='create'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-4 text-lg font-black">Buat Ujian</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><label className="mb-1 block text-xs font-bold">Tahun ajaran</label><input className={field} value={settings.activeAcademicYear} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Semester</label><input className={field} value={settings.activeSemester} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Kelas</label><select className={field} value={level} onChange={e=>setLevel(e.target.value)}>{cls.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Mata pelajaran</label><select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div></div><label className="mb-1 mt-3 block text-xs font-bold">Nama ujian</label><input className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nama ujian"/><label className="mb-1 mt-3 block text-xs font-bold">Durasi (menit)</label><input type="number" min="1" max="240" className={field+' max-w-40'} value={duration} onChange={e=>setDuration(Math.max(1,Number(e.target.value)))}/><h4 className="mb-2 mt-5 font-extrabold">Pilih soal dari bank soal</h4><div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">{classQuestions.map(q=><label key={q.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 py-2 last:border-0"><input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={e=>setSelectedQuestions(a=>e.target.checked?[...a,q.id]:a.filter(id=>id!==q.id))}/><span><strong className="block text-sm">{q.prompt}</strong><small className="text-slate-500">{q.subject} · {q.className}</small></span></label>)}{!classQuestions.length&&<p className="text-sm text-slate-500">Bank soal kosong untuk kelas/mapel ini. Unggah atau buat soal terlebih dahulu.</p>}</div><button className={btn+' mt-4'} disabled={saving} onClick={()=>void createExam()}><Plus size={16}/> Terbitkan Ujian ({selectedQuestions.length} soal)</button></div>}
    {section==='results'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-3 text-lg font-black">Hasil Ujian Siswa</h3><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-3">Nama</th><th className="p-3">Kelas</th><th className="p-3">Ujian</th><th className="p-3">Nilai</th><th className="p-3">Status</th></tr></thead><tbody>{attempts.map(a=><tr key={a.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{a.studentName}</td><td className="p-3">{a.className}</td><td className="p-3">{a.examTitle}</td><td className="p-3 font-bold">{a.status==='Selesai'?typeof a.score === 'number' && typeof a.total === 'number' ? Math.round(a.score/Math.max(1,a.total)*100) : 'Menunggu':'—'}</td><td className="p-3">{a.status}</td></tr>)}</tbody></table></div>{!attempts.length&&<p className="text-sm text-slate-500">Belum ada hasil ujian.</p>}</div>}
  </div>;
};
