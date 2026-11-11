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
    <div className="min-h-full -mx-4 md:-mx-8 -mt-4 md:-mt-6 bg-[#F5F8F7] pb-8">
      <section className="bg-gradient-to-r from-[#087F73] via-[#0D9488] to-[#35B6A5] px-5 md:px-8 py-5 md:py-6 text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/70 flex items-center justify-center text-base font-bold">
              {firebaseUser?.photoURL ? <img src={firebaseUser.photoURL} alt="Foto profil" className="w-full h-full object-cover" /> : (currentUser?.displayName || 'G').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/80">Selamat datang kembali</p>
              <h1 className="text-base md:text-lg font-bold truncate">{currentUser?.displayName || firebaseUser?.displayName || 'Guru'}</h1>
              <p className="text-xs text-white/80">Guru & Tenaga Kependidikan</p>
            </div>
          </div>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifikasi" className="relative w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 border border-white/40">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
              {warnings.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{warnings.length > 9 ? '9+' : warnings.length}</span>}
            </button>
            {showNotifications && <div className="absolute right-0 top-12 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl p-4 text-slate-800">
              <div className="flex items-center justify-between mb-2"><p className="text-sm font-bold">Notifikasi</p><button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400">Tutup</button></div>
              {warnings.length ? <button onClick={() => { onNavigate('attendance'); setShowNotifications(false); }} className="w-full text-left rounded-xl bg-rose-50 p-3 hover:bg-rose-100"><p className="text-xs font-semibold text-rose-800">{warnings.length} siswa perlu perhatian kehadiran</p><p className="text-[11px] text-rose-600 mt-1">Tekan untuk melihat rekap absensi</p></button> : <p className="text-xs text-slate-500 py-3">Belum ada notifikasi baru.</p>}
            </div>}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <section className="py-6 md:py-8 flex items-center gap-4 md:gap-6">
          <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="Logo SMP Islam Al-Wasi’" className="w-20 h-20 md:w-28 md:h-28 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-[0.15em] text-teal-700 uppercase">Sistem Informasi Akademik Terpadu</p>
            <h2 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">SIPADU</h2>
            <p className="text-sm md:text-base font-semibold text-slate-700">SMP Islam Al-Wasi’</p>
            <p className="mt-1 text-xs md:text-sm text-slate-500">Qurani, Ramah Anak dan Berkarakter</p>
          </div>
        </section>

        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="text-base font-bold text-slate-900">Menu Cepat</h3><p className="text-xs text-slate-500 mt-0.5">Akses pekerjaan harian Anda</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button type="button" onClick={() => onNavigate('attendance')} className="group min-h-[104px] rounded-2xl bg-[#0D9488] hover:bg-[#0B8177] text-white p-4 md:p-5 text-left shadow-[0_8px_20px_rgba(13,148,136,0.16)] transition-all">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"/><path d="m8 14 2 2 5-5"/></svg></span>
              <span className="block text-sm md:text-base font-bold">Lakukan Presensi</span><span className="block text-[11px] text-white/75 mt-1">Catat kehadiran siswa</span>
            </button>
            <button type="button" onClick={() => onNavigate('journal')} className="group min-h-[104px] rounded-2xl bg-white hover:bg-teal-50 border border-slate-200 p-4 md:p-5 text-left shadow-[0_5px_18px_rgba(15,23,42,0.035)] transition-all">
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></span>
              <span className="block text-sm md:text-base font-bold text-slate-900">Tulis Jurnal</span><span className="block text-[11px] text-slate-500 mt-1">Isi kegiatan pembelajaran</span>
            </button>
          </div>
        </section>

        <section className="mb-7">
          <div className="flex items-end justify-between mb-3"><div><h3 className="text-base font-bold text-slate-900">Ringkasan Akademik</h3><p className="text-xs text-slate-500 mt-0.5">Gambaran data sekolah saat ini</p></div><span className="text-[10px] md:text-xs text-slate-500">TA {settings.activeAcademicYear}</span></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Siswa Aktif</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{activeStudentsCount}</p><p className="text-[10px] text-slate-400 mt-1">Peserta didik</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Guru & Pendidik</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{activeTeachersCount}</p><p className="text-[10px] text-slate-400 mt-1">Tenaga pendidik</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Kehadiran</p><p className="mt-2 text-2xl md:text-3xl font-bold text-teal-700">{attendancePercent}%</p><p className="text-[10px] text-slate-400 mt-1">Rekap terakhir</p></div>
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><p className="text-xs text-slate-500">Jurnal KBM</p><p className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">{journals.length}</p><p className="text-[10px] text-slate-400 mt-1">{journals.filter(journal => journal.status === 'Selesai').length} sesi selesai</p></div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-slate-100 p-4 md:p-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Kehadiran Siswa</h3><p className="text-xs text-slate-500 mt-1">{attendanceDateLabel}</p></div><button onClick={() => onNavigate('attendance')} className="text-xs font-semibold text-teal-700 hover:underline">Lihat detail</button></div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {([['Hadir',totals.Hadir,'text-emerald-700','bg-emerald-50'],['Sakit',totals.Sakit,'text-blue-700','bg-blue-50'],['Izin',totals.Izin,'text-amber-700','bg-amber-50'],['Alpa',totals.Alpa,'text-rose-700','bg-rose-50']] as const).map(([label,value,color,bg]) => <div key={label} className={`rounded-xl ${bg} p-2.5 text-center`}><p className="text-[10px] text-slate-500">{label}</p><p className={`text-xl font-bold mt-1 ${color}`}>{value}</p></div>)}
            </div>
            <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Persentase hadir</span><strong className="text-teal-700">{attendancePercent}%</strong></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-300" style={{width:`${attendancePercent}%`}} /></div><p className="text-[10px] text-slate-400 mt-2">{totalRecorded} catatan kehadiran</p></div>
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
