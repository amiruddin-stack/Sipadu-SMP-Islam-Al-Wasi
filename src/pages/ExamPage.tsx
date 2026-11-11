import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { BookOpen, Clock3, FileUp, Plus, ClipboardList, Trophy, ArrowLeft, CheckCircle2, Link as LinkIcon, Play, Save } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { useData } from '../context/DataContext';

type Question = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; prompt: string; options: string[]; answer: number; points: number };
type Exam = { id: string; title: string; subject: string; className: string; academicYear: string; semester: string; duration: number; questionIds: string[]; formUrl?: string; status: 'Aktif' | 'Draft'; createdAt: string };
type Attempt = { id: string; examId: string; examTitle: string; studentId: string; studentName: string; className: string; answers: Record<string, number>; score: number; total: number; status: 'Mengerjakan' | 'Selesai'; startedAt: string; submittedAt?: string };

const cls = ['VII', 'VIII', 'IX'];
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#1599a8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#117f8b] disabled:cursor-not-allowed disabled:opacity-50';

function classLevel(value: string) { return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
function scoreAttempt(questions: Question[], answers: Record<string, number>) {
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  const score = questions.reduce((sum, q) => sum + (answers[q.id] === q.answer ? q.points : 0), 0);
  return { score, total, percent: total ? Math.round(score / total * 100) : 0 };
}

export const ExamPage: React.FC = () => {
  const { students, classes, subjects, settings } = useData();
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
  const [saving, setSaving] = useState(false);
  const [finishedResult, setFinishedResult] = useState<{ title: string; studentName: string; className: string; score: number; total: number; percent: number } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unQ = onSnapshot(collection(db, 'examQuestions'), snap => setQuestions(snap.docs.map(d => ({ ...d.data(), id: d.id } as Question))), e => setMessage('Bank soal belum dapat dibaca: ' + e.message));
    const unE = onSnapshot(collection(db, 'exams'), snap => setExams(snap.docs.map(d => ({ ...d.data(), id: d.id } as Exam))), e => setMessage('Data ujian belum dapat dibaca: ' + e.message));
    const unA = onSnapshot(collection(db, 'examAttempts'), snap => setAttempts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Attempt))), e => console.warn(e));
    return () => { unQ(); unE(); unA(); };
  }, []);

  const selectedClassNames = useMemo(() => classes.filter(c => classLevel(c) === level), [classes, level]);
  const studentsInClass = useMemo(() => students.filter(s => s.status === 'Aktif' && (studentClass ? s.className === studentClass : classLevel(s.className) === level)).sort((a,b) => a.name.localeCompare(b.name)), [students, studentClass, level]);
  const classQuestions = questions.filter(q => classLevel(q.className) === level && (!subject || q.subject === subject));
  const currentExamQuestions = activeExam ? activeExam.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[] : [];
  const availableExams = exams.filter(e => e.status === 'Aktif' && classLevel(e.className) === classLevel(studentClass || level));

  const addQuestion = async () => {
    if (!questionText.trim() || options.some(o => !o.trim()) || !subject) { setMessage('Lengkapi mapel, pertanyaan, dan semua pilihan jawaban.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'examQuestions'), { title: title.trim() || 'Bank Soal ' + subject, subject, className: selectedClassNames[0] || level, academicYear: settings.activeAcademicYear, semester: settings.activeSemester, prompt: questionText.trim(), options, answer: correct, points: 1, createdAt: new Date().toISOString() });
      setQuestionText(''); setOptions(['','','','']); setCorrect(0); setMessage('Soal berhasil disimpan ke bank soal.');
    } catch (e) { setMessage('Gagal menyimpan soal. Pastikan login Firebase aktif.'); }
    finally { setSaving(false); }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
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
      await Promise.all(batch.map(q => addDoc(collection(db, 'examQuestions'), q)));
      setMessage(batch.length + ' soal berhasil diimpor.');
    } catch (e) { setMessage('File tidak terbaca. Gunakan JSON atau CSV titik koma dengan kolom pertanyaan;A;B;C;D;kunci (1-4).'); }
  };

  const createExam = async () => {
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
    const student = students.find(s => s.id === studentId);
    if (!student) { setMessage('Pilih kelas dan nama siswa terlebih dahulu.'); return; }
    try {
      await signInAnonymously(auth);
      const ref = await addDoc(collection(db, 'examAttempts'), { examId: exam.id, examTitle: exam.title, studentId: student.id, studentName: student.name, className: student.className, answers: {}, score: 0, total: 0, status: 'Mengerjakan', startedAt: new Date().toISOString() });
      setAttemptId(ref.id); setAnswers({}); setCurrentQuestion(0); setActiveExam(exam); setSecondsLeft(exam.duration * 60); setSection('take'); setMessage('');
    } catch (e) { setMessage('Tidak dapat memulai ujian. Aktifkan metode Anonymous pada Firebase Authentication, lalu coba lagi.'); }
  };

  const finishExam = async (forced = false) => {
    if (!activeExam || !attemptId) return;
    const result = scoreAttempt(currentExamQuestions, answers);
    setSaving(true);
    try {
      const student = students.find(s => s.id === studentId);
      setFinishedResult({ title: activeExam.title, studentName: student?.name || 'Siswa', className: student?.className || '', score: result.score, total: result.total, percent: result.percent });
      await updateDoc(doc(db, 'examAttempts', attemptId), { answers, score: result.score, total: result.total, percent: result.percent, status: 'Selesai', submittedAt: new Date().toISOString(), autoSubmitted: forced });
      setActiveExam(null); setSection('results'); setMessage(forced ? 'Waktu habis. Jawaban tersimpan otomatis.' : 'Jawaban berhasil dikirim.');
    } catch (e) { setMessage('Jawaban belum tersinkron. Periksa koneksi internet, lalu coba kirim kembali.'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (section !== 'take' || !activeExam) return;
    if (secondsLeft <= 0) { if (attemptId) void finishExam(true); return; }
    const timer = window.setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [section, activeExam, secondsLeft]);

  useEffect(() => {
    if (section !== 'take' || !attemptId) return;
    const timer = window.setTimeout(() => updateDoc(doc(db, 'examAttempts', attemptId), { answers, lastSavedAt: new Date().toISOString() }).catch(() => {}), 700);
    return () => window.clearTimeout(timer);
  }, [answers, section, attemptId]);

  const fmt = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
  const studentEntry = () => <div className="mx-auto max-w-xl space-y-4">
    <div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1599a8]"><BookOpen size={30}/></div><h2 className="text-2xl font-black text-slate-800">Ruang Ujian Siswa</h2><p className="mt-1 text-sm text-slate-500">Pilih kelas dan nama untuk melihat ujian yang tersedia.</p></div>
    <div className={panel}><label className="mb-1 block text-xs font-bold text-slate-600">Kelas</label><select className={field} value={studentClass} onChange={e => {setStudentClass(e.target.value);setStudentId('');}}><option value="">Pilih kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select><label className="mb-1 mt-4 block text-xs font-bold text-slate-600">Nama siswa</label><select className={field} value={studentId} onChange={e=>setStudentId(e.target.value)} disabled={!studentClass}><option value="">Pilih nama siswa</option>{studentsInClass.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    {studentId && <div className="space-y-3"><h3 className="font-bold text-slate-700">Ujian tersedia</h3>{availableExams.map(ex=><div key={ex.id} className={panel}><div className="flex items-start justify-between gap-3"><div><h4 className="font-extrabold">{ex.title}</h4><p className="mt-1 text-xs text-slate-500">{ex.subject} · {ex.duration} menit · {ex.questionIds.length} soal</p></div><button className={btn} onClick={()=>void startExam(ex)}><Play size={15}/> Mulai</button></div></div>)}{!availableExams.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada ujian aktif untuk kelas ini.</p>}</div>}
  </div>;

  if (section === 'take' && activeExam) {
    const q = currentExamQuestions[currentQuestion];
    const done = Object.keys(answers).length;
    return <div className="mx-auto max-w-5xl space-y-4 pb-10">
      <div className="sticky top-0 z-20 rounded-2xl bg-white p-4 shadow-md"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-teal-700">{activeExam.subject}</p><h2 className="font-black">{activeExam.title}</h2></div><div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-black tabular-nums ${secondsLeft < 300 ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'}`}><Clock3 size={18}/>{fmt(secondsLeft)}</div></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{done} dari {currentExamQuestions.length} dijawab</span><span>{Math.round(done / Math.max(1,currentExamQuestions.length)*100)}%</span></div><div className="mt-2 flex flex-wrap gap-1.5">{currentExamQuestions.map((item,i)=><button key={item.id} onClick={()=>setCurrentQuestion(i)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${answers[item.id] !== undefined ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'} `}>{i+1}</button>)}</div></div>
      {q && <div className={panel}><p className="text-xs font-bold text-teal-700">SOAL {currentQuestion+1} / {currentExamQuestions.length}</p><h3 className="my-4 text-lg font-bold leading-relaxed">{q.prompt}</h3><div className="space-y-2">{q.options.map((opt,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${answers[q.id]===i?'border-teal-500 bg-teal-50':'border-slate-200 hover:bg-slate-50'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${answers[q.id]===i?'bg-teal-600 text-white':'bg-slate-100 text-slate-600'}`}>{String.fromCharCode(65+i)}</span>{opt}</button>)}</div><div className="mt-6 flex items-center justify-between gap-2"><button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40" disabled={currentQuestion===0} onClick={()=>setCurrentQuestion(i=>i-1)}>Sebelumnya</button>{currentQuestion<currentExamQuestions.length-1?<button className={btn} onClick={()=>setCurrentQuestion(i=>i+1)}>Berikutnya</button>:<button className={btn} disabled={saving} onClick={()=>void finishExam(false)}><CheckCircle2 size={16}/> Selesaikan ujian</button>}</div></div>}
      <p className="text-center text-xs text-slate-400"><Save size={13} className="mr-1 inline"/> Jawaban disimpan otomatis saat dipilih.</p>
      {message&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
    </div>;
  }

  if (section === 'results' && !activeExam) {
    const result = finishedResult;
    return <div className="mx-auto max-w-xl space-y-4"><div className={panel+' text-center'}><Trophy size={42} className="mx-auto text-amber-500"/><h2 className="mt-3 text-2xl font-black">Hasil Ujian</h2>{result?<><p className="mt-2 font-bold">{result.title}</p><p className="mt-1 text-sm text-slate-500">{result.studentName} · {result.className}</p><p className="my-5 text-5xl font-black text-teal-700">{result.score}<span className="text-xl text-slate-400">/{result.total}</span></p><p className="text-sm font-bold text-slate-600">Nilai: {result.percent}</p></>:<p className="mt-3 text-sm text-slate-500">Hasil sedang disimpan.</p>}<button className={btn+' mt-5'} onClick={()=>{setSection('student');setAttemptId('');}}>Kembali</button></div></div>;
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">SIMPATIK · AKADEMIK</p><h2 className="text-2xl font-black text-slate-800">Modul Ujian</h2><p className="mt-1 text-sm text-slate-500">Kelola bank soal, susun ujian, dan pantau hasil siswa.</p></div><button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700" onClick={()=>setSection('student')}>Halaman siswa</button></div>
    {message&&<div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
    {section==='student'&&<div><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali ke pengelolaan ujian</button>{studentEntry()}</div>}
    {section==='home'&&<><div className="grid gap-3 sm:grid-cols-3"><button className={panel+' text-left hover:border-teal-400'} onClick={()=>setSection('upload')}><FileUp className="text-teal-600"/><h3 className="mt-3 font-extrabold">Unggah File</h3><p className="mt-1 text-xs text-slate-500">Impor soal JSON/CSV atau simpan tautan Google Form.</p></button><button className={panel+' text-left hover:border-teal-400'} onClick={()=>setSection('create')}><Plus className="text-teal-600"/><h3 className="mt-3 font-extrabold">Buat Ujian</h3><p className="mt-1 text-xs text-slate-500">Pilih tahun ajaran, semester, kelas, dan soal.</p></button><button className={panel+' text-left hover:border-teal-400'} onClick={()=>setSection('results')}><Trophy className="text-teal-600"/><h3 className="mt-3 font-extrabold">Hasil Ujian</h3><p className="mt-1 text-xs text-slate-500">Lihat nilai dan status pengerjaan.</p></button></div><div className={panel}><h3 className="mb-3 font-extrabold">Pilih Kelas</h3><div className="grid grid-cols-3 gap-3">{cls.map(c=><button key={c} onClick={()=>{setLevel(c);setSection('create');}} className={`rounded-xl border p-5 text-center font-black ${level===c?'border-teal-500 bg-teal-50 text-teal-700':'border-slate-200'}`}>Kelas {c}</button>)}</div></div><div className={panel}><h3 className="mb-3 font-extrabold">Daftar Ujian</h3>{exams.map(ex=><div key={ex.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-3"><div><p className="font-bold">{ex.title}</p><p className="text-xs text-slate-500">{ex.className} · {ex.subject} · {ex.duration} menit</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{ex.status}</span></div>)}{!exams.length&&<p className="text-sm text-slate-500">Belum ada ujian dibuat.</p>}</div></>}
    {section==='upload'&&<div className={panel+' max-w-3xl'}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-4 text-lg font-black">Unggah File Soal</h3><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-bold">Kelas</label><select className={field} value={level} onChange={e=>setLevel(e.target.value)}>{cls.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Mata pelajaran</label><select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div></div><label className="mb-1 mt-3 block text-xs font-bold">Nama soal / judul ujian</label><input className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: PTS Bahasa Arab Kelas VII"/><label className="mb-1 mt-3 block text-xs font-bold">Tautan Google Form (opsional)</label><input className={field} value={formUrl} onChange={e=>setFormUrl(e.target.value)} placeholder="https://docs.google.com/forms/..."/><p className="mt-1 text-xs text-slate-500">Tautan disimpan sebagai referensi. Judul Google Form belum dapat dibaca otomatis dari browser tanpa layanan penghubung Google Apps Script/API.</p><label className="mb-1 mt-4 block text-xs font-bold">Pilih file JSON atau CSV</label><input type="file" accept=".json,.csv,.txt" className={field} onChange={e=>void importFile(e.target.files?.[0])}/>{questionFileName&&<p className="mt-2 text-xs text-slate-500">File: {questionFileName}</p>}<p className="mt-3 text-xs text-slate-500">JSON: [{'{'}"prompt":"Pertanyaan","options":["A","B","C","D"],"answer":0{' }'}]. CSV: pertanyaan;A;B;C;D;kunci (1-4).</p></div>}
    {section==='create'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-4 text-lg font-black">Buat Ujian</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><label className="mb-1 block text-xs font-bold">Tahun ajaran</label><input className={field} value={settings.activeAcademicYear} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Semester</label><input className={field} value={settings.activeSemester} readOnly/></div><div><label className="mb-1 block text-xs font-bold">Kelas</label><select className={field} value={level} onChange={e=>setLevel(e.target.value)}>{cls.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold">Mata pelajaran</label><select className={field} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div></div><label className="mb-1 mt-3 block text-xs font-bold">Nama ujian</label><input className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nama ujian"/><label className="mb-1 mt-3 block text-xs font-bold">Durasi (menit)</label><input type="number" min="1" max="240" className={field+' max-w-40'} value={duration} onChange={e=>setDuration(Math.max(1,Number(e.target.value)))}/><h4 className="mb-2 mt-5 font-extrabold">Pilih soal dari bank soal</h4><div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">{classQuestions.map(q=><label key={q.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 py-2 last:border-0"><input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={e=>setSelectedQuestions(a=>e.target.checked?[...a,q.id]:a.filter(id=>id!==q.id))}/><span><strong className="block text-sm">{q.prompt}</strong><small className="text-slate-500">{q.subject} · {q.className}</small></span></label>)}{!classQuestions.length&&<p className="text-sm text-slate-500">Bank soal kosong untuk kelas/mapel ini. Unggah atau buat soal terlebih dahulu.</p>}</div><button className={btn+' mt-4'} disabled={saving} onClick={()=>void createExam()}><Plus size={16}/> Terbitkan Ujian ({selectedQuestions.length} soal)</button></div>}
    {section==='results'&&<div className={panel}><button className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500" onClick={()=>setSection('home')}><ArrowLeft size={16}/> Kembali</button><h3 className="mb-3 text-lg font-black">Hasil Ujian Siswa</h3><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-3">Nama</th><th className="p-3">Kelas</th><th className="p-3">Ujian</th><th className="p-3">Nilai</th><th className="p-3">Status</th></tr></thead><tbody>{attempts.map(a=><tr key={a.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{a.studentName}</td><td className="p-3">{a.className}</td><td className="p-3">{a.examTitle}</td><td className="p-3 font-bold">{a.status==='Selesai'?Math.round(a.score/Math.max(1,a.total)*100):'—'}</td><td className="p-3">{a.status}</td></tr>)}</tbody></table></div>{!attempts.length&&<p className="text-sm text-slate-500">Belum ada hasil ujian.</p>}</div>}
  </div>;
};
