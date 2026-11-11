import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/layout/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser, firebaseUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const { students, teachers, attendances, journals, behaviors, settings } = useData();
  const today = new Date();
  const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const relevantAttendances = attendances.filter(
    (record) => record.academicYear === settings.activeAcademicYear && record.semester === settings.activeSemester
  );
  const attendanceDate = relevantAttendances.some((record) => record.date === todayStr)
    ? todayStr
    : relevantAttendances.reduce((latest, record) => record.date > latest ? record.date : latest, '');
  const latestAttendances = relevantAttendances.filter((record) => record.date === attendanceDate);

  const totals = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
  const studentAbsences: Record<string, { sakit: number; alpa: number }> = {};

  latestAttendances.forEach((record) => {
    Object.entries(record.records || {}).forEach(([studentId, status]) => {
      if (status in totals) totals[status as keyof typeof totals]++;
    });
  });

  relevantAttendances.forEach((record) => {
    Object.entries(record.records || {}).forEach(([studentId, status]) => {
      if (!studentAbsences[studentId]) studentAbsences[studentId] = { sakit: 0, alpa: 0 };
      if (status === 'Sakit') studentAbsences[studentId].sakit++;
      if (status === 'Alpa') studentAbsences[studentId].alpa++;
    });
  });

  const totalRecorded = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const attendancePercent = totalRecorded ? Math.round((totals.Hadir / totalRecorded) * 100) : 0;
  const warnings = students
    .filter((student) => student.status === 'Aktif')
    .map((student) => ({ ...student, absence: studentAbsences[student.id] || { sakit: 0, alpa: 0 } }))
    .filter((student) => student.absence.alpa >= 3 || student.absence.sakit >= 5)
    .sort((a, b) => b.absence.alpa - a.absence.alpa || b.absence.sakit - a.absence.sakit);

  const activeStudentsCount = students.filter((student) => student.status === 'Aktif').length;
  const activeTeachersCount = teachers.filter((teacher) => teacher.status === 'Aktif').length;
  const recentJournals = journals.slice(0, 4);
  const recentBehaviors = behaviors.slice(0, 3);
  const attendanceDateLabel = attendanceDate
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(attendanceDate + 'T00:00:00'))
    : 'Belum ada data';

  return (
    <div className="min-h-full -mx-4 md:-mx-8 -mt-4 md:-mt-6 bg-[#F3F7F5] pb-11">
      <section className="simpatik-enter relative isolate min-h-[40vh] overflow-hidden bg-gradient-to-br from-[#017C68] via-[#05A287] to-[#84C6BC] px-5 py-9 text-white md:px-8 md:py-12 lg:py-14">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[38%] h-72 w-72 rounded-full bg-[#B9E5DC]/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-[32vh] max-w-7xl items-center justify-between gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-white/85 md:text-base">Selamat datang, {currentUser?.displayName || firebaseUser?.displayName || 'Pengguna'}</p>
            <h1 className="mt-2 text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">SIMPATIK</h1>
            <p className="mt-2 text-lg font-semibold md:text-2xl">SMP Islam Al-Wasi'</p>
            <p className="mt-1 text-sm text-white/90 md:text-base">Qurani, Ramah Anak dan Berkarakter</p>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/80 md:text-sm">Sistem Informasi Manajemen Pendidikan dan Akademik Terpadu, Interaktif dan Kolaboratif.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate('attendance')} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#017C68] shadow-lg shadow-[#005D4F]/15 transition hover:-translate-y-0.5 hover:bg-[#F0FAF7]">Lakukan Presensi</button>
              <button type="button" onClick={() => onNavigate('journal')} className="rounded-xl border border-white/75 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20">Tulis Jurnal</button>
            </div>
          </div>
          <div className="hidden shrink-0 items-center justify-center rounded-[2rem] border border-white/25 bg-white/10 p-5 shadow-2xl shadow-[#005D4F]/15 backdrop-blur-sm lg:flex">
            <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="Logo SMP Islam Al-Wasi'" className="h-52 w-52 object-contain xl:h-64 xl:w-64" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <section className="simpatik-enter mb-7 grid grid-cols-1 gap-4 pt-7 md:grid-cols-3" style={{ animationDelay: '90ms' }}>
          <button type="button" onClick={() => onNavigate('master')} className="group min-h-[190px] rounded-2xl border border-[#DCECE7] bg-white p-5 text-left shadow-[0_8px_24px_rgba(1,124,104,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#84C6BC] hover:shadow-lg">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F5F1] text-[#017C68]">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>
            </span>
            <span className="block text-xl font-bold text-slate-900">Terpadu</span>
            <span className="mt-2 block text-sm leading-relaxed text-slate-600">Satu data siswa untuk absensi, penilaian, dan rapor.</span>
          </button>
          <button type="button" onClick={() => onNavigate('assessment')} className="group min-h-[190px] rounded-2xl border border-[#DCECE7] bg-white p-5 text-left shadow-[0_8px_24px_rgba(1,124,104,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#84C6BC] hover:shadow-lg">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F5F1] text-[#017C68]">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5h8M8 9h8M8 13h5"/><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m14 17 2 2 4-4"/></svg>
            </span>
            <span className="block text-xl font-bold text-slate-900">Interaktif</span>
            <span className="mt-2 block text-sm leading-relaxed text-slate-600">Ujian online, notifikasi, dan hasil yang dapat langsung dilihat.</span>
          </button>
          <button type="button" onClick={() => onNavigate('counseling')} className="group min-h-[190px] rounded-2xl border border-[#DCECE7] bg-white p-5 text-left shadow-[0_8px_24px_rgba(1,124,104,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#84C6BC] hover:shadow-lg">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F5F1] text-[#017C68]">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 15c3.5-.2 6 1.3 6 4"/></svg>
            </span>
            <span className="block text-xl font-bold text-slate-900">Kolaboratif</span>
            <span className="mt-2 block text-sm leading-relaxed text-slate-600">Guru, wali kelas, BK, dan kepala sekolah berbagi data yang sama.</span>
          </button>
        </section>
        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="text-base font-bold text-slate-900">Menu Cepat</h3><p className="text-xs text-slate-500 mt-0.5">Akses pekerjaan harian Anda</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button type="button" onClick={() => onNavigate('attendance')} className="group min-h-[104px] rounded-2xl bg-gradient-to-br from-[#19B981] to-[#0D9F78] hover:from-[#12A878] hover:to-[#0B8F6C] text-white p-4 md:p-5 text-left shadow-[0_8px_20px_rgba(13,148,136,0.16)] transition-all">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"/><path d="m8 14 2 2 5-5"/></svg></span>
              <span className="block text-sm md:text-base font-bold">Lakukan Presensi</span><span className="block text-[11px] text-white/75 mt-1">Catat kehadiran siswa</span>
            </button>
            <button type="button" onClick={() => onNavigate('journal')} className="group min-h-[104px] rounded-2xl bg-white hover:bg-teal-50 border border-slate-200 p-4 md:p-5 text-left shadow-[0_5px_18px_rgba(15,23,42,0.035)] transition-all">
              <span className="w-9 h-9 rounded-xl bg-[#E8FBF2] text-[#159B6D] flex items-center justify-center mb-3"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></span>
              <span className="block text-sm md:text-base font-bold text-slate-900">Tulis Jurnal</span><span className="block text-[11px] text-slate-500 mt-1">Isi kegiatan pembelajaran</span>
            </button>
          </div>
        </section>

        <section className="mb-7">
          <div className="flex items-end justify-between mb-3"><div><h3 className="text-base font-bold text-slate-900">Ringkasan Akademik</h3><p className="text-xs text-slate-500 mt-0.5">Gambaran data sekolah saat ini</p></div><span className="text-[10px] md:text-xs text-slate-500">TA {settings.activeAcademicYear}</span></div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-[#EAF1ED] p-4 md:p-5 shadow-[0_8px_26px_rgba(28,66,48,0.055)]"><p className="text-xs text-slate-500">Siswa Aktif</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{activeStudentsCount}</p><p className="text-[10px] text-slate-400 mt-1">Peserta didik</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Guru & Pendidik</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{activeTeachersCount}</p><p className="text-[10px] text-slate-400 mt-1">Tenaga pendidik</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Kehadiran</p><p className="mt-2 text-2xl md:text-3xl font-bold text-[#159B6D]">{attendancePercent}%</p><p className="text-[10px] text-slate-400 mt-1">Rekap terakhir</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Jurnal KBM</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{journals.length}</p><p className="text-[10px] text-slate-400 mt-1">{journals.filter(journal => journal.status === 'Selesai').length} sesi selesai</p></div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-[#EAF1ED] p-4 md:p-5 shadow-[0_8px_26px_rgba(28,66,48,0.055)]">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Kehadiran Siswa</h3><p className="text-xs text-slate-500 mt-1">{attendanceDateLabel}</p></div><button onClick={() => onNavigate('attendance')} className="text-xs font-semibold text-teal-700 hover:underline">Lihat detail</button></div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {([['Hadir',totals.Hadir,'text-emerald-700','bg-emerald-50'],['Sakit',totals.Sakit,'text-blue-700','bg-blue-50'],['Izin',totals.Izin,'text-amber-700','bg-amber-50'],['Alpa',totals.Alpa,'text-rose-700','bg-rose-50']] as const).map(([label,value,color,bg]) => <div key={label} className={`rounded-xl ${bg} p-2.5 text-center`}><p className="text-[10px] text-slate-500">{label}</p><p className={`text-xl font-bold mt-1 ${color}`}>{value}</p></div>)}
            </div>
            <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Persentase hadir</span><strong className="text-teal-700">{attendancePercent}%</strong></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#16B981] to-[#8BE6BC]" style={{width:`${attendancePercent}%`}} /></div><p className="text-[10px] text-slate-400 mt-2">{totalRecorded} catatan kehadiran</p></div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Perlu Perhatian</h3><p className="text-xs text-slate-500 mt-1">Pemantauan kehadiran siswa</p></div><span className="rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 text-xs font-bold">{warnings.length}</span></div>
            <div className="mt-3 space-y-2 max-h-44 overflow-y-auto">
              {warnings.length ? warnings.slice(0,4).map(student => <div key={student.id} className="flex items-center justify-between gap-2 rounded-xl bg-rose-50/70 p-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{student.name}</p><p className="text-[10px] text-slate-500">{student.className}</p></div><span className="text-[10px] font-semibold text-rose-700 shrink-0">{student.absence.alpa} Alpa · {student.absence.sakit} Sakit</span></div>) : <p className="py-7 text-center text-xs text-emerald-700">Tidak ada siswa dalam status peringatan.</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
            <div className="flex items-center justify-between gap-2 mb-2"><h3 className="text-sm font-bold text-slate-900">Jurnal Pembelajaran Terbaru</h3><button onClick={() => onNavigate('journal')} className="text-xs font-semibold text-teal-700">Semua jurnal</button></div>
            <div className="divide-y divide-slate-100">{recentJournals.length ? recentJournals.slice(0,3).map(journal => <div key={journal.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-800">{journal.subject}</span><span className="text-[10px] rounded-full bg-teal-50 text-teal-700 px-2 py-0.5">{journal.className}</span><span className="text-[10px] text-slate-400">{journal.date}</span></div><p className="text-xs text-slate-600 mt-1">{journal.topic}</p></div>) : <p className="py-6 text-xs text-center text-slate-400">Belum ada jurnal pembelajaran.</p>}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
            <div className="flex items-center justify-between gap-2 mb-2"><h3 className="text-sm font-bold text-slate-900">Catatan Karakter Siswa</h3><button onClick={() => onNavigate('behavior')} className="text-xs font-semibold text-teal-700">Lihat semua</button></div>
            <div className="space-y-2">{recentBehaviors.length ? recentBehaviors.slice(0,3).map(behavior => <div key={behavior.id} className="rounded-xl bg-[#F7FAF9] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-800 truncate">{behavior.studentName}</span><span className="text-[10px] text-slate-500 shrink-0">{behavior.status}</span></div><p className="text-xs text-slate-600 mt-1">{behavior.description}</p></div>) : <p className="py-6 text-xs text-center text-slate-400">Belum ada catatan perilaku siswa.</p>}</div>
          </div>
        </section>
      </div>
    </div>
  );
};
