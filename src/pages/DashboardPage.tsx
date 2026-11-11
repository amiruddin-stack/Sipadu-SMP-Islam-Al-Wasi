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
    <div className="space-y-6">
      <section className="w-full -mt-4 md:-mt-6 mb-5 px-4 md:px-8 py-4 md:py-5 text-white bg-gradient-to-r from-[#0F9D8A] via-[#0D9488] to-[#087F73]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full overflow-hidden bg-white/20 border-2 border-white/70 flex items-center justify-center text-sm font-bold text-white">
              {firebaseUser?.photoURL ? <img src={firebaseUser.photoURL} alt="Foto profil" className="w-full h-full object-cover" /> : (currentUser?.displayName || 'G').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-white/80">Selamat datang,</p>
              <p className="text-sm md:text-base font-bold text-white truncate">{currentUser?.displayName || firebaseUser?.displayName || 'Guru'}</p>
              <p className="text-[10px] md:text-xs text-white/80">Guru & Tenaga Kependidikan</p>
            </div>
          </div>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifikasi" className="relative w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 border border-white/40">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
              {warnings.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{warnings.length > 9 ? '9+' : warnings.length}</span>}
            </button>
            {showNotifications && <div className="absolute right-0 top-12 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl p-4 text-slate-800">
              <div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-slate-800">Notifikasi</p><button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400">Tutup</button></div>
              {warnings.length ? <button onClick={() => { onNavigate('attendance'); setShowNotifications(false); }} className="w-full text-left rounded-xl bg-rose-50 p-3 hover:bg-rose-100"><p className="text-xs font-semibold text-rose-800">{warnings.length} siswa perlu perhatian kehadiran</p><p className="text-[11px] text-rose-600 mt-1">Tekan untuk melihat rekap absensi</p></button> : <p className="text-xs text-slate-500 py-3">Belum ada notifikasi baru.</p>}
            </div>}
          </div>
        </div>
      </section>

      <section className="w-full mb-5 px-4 md:px-8 py-4 md:py-5 bg-white">
        <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-6">
          <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="Logo SMP Islam Al-Wasi’" className="w-20 h-20 md:w-28 md:h-28 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">Sistem Informasi Akademik Terpadu</p>
            <h2 className="mt-1 text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">SIPADU</h2>
            <p className="text-sm md:text-lg font-semibold text-slate-700">SMP Islam Al-Wasi’</p>
            <p className="mt-1 text-xs md:text-sm text-slate-500">Qurani, Ramah Anak dan Berkarakter</p>
          </div>
        </div>
      </section>

      <section className="mb-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Menu Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onNavigate('attendance')} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-4 text-sm font-semibold shadow-sm transition-colors">
              <span>Lakukan Presensi</span>
            </button>
            <button type="button" onClick={() => onNavigate('journal')} className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 px-4 py-4 text-sm font-semibold transition-colors">
              <span>Tulis Jurnal</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Status Kehadiran Siswa</h3>
              <p className="text-xs text-slate-500 mt-1">Rekap terakhir · {attendanceDateLabel}</p>
            </div>
            <button onClick={() => onNavigate('attendance')} className="text-xs font-semibold text-[#058D78] hover:underline">Lihat absensi</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {([
              ['Hadir', totals.Hadir, 'text-emerald-700'],
              ['Sakit', totals.Sakit, 'text-blue-700'],
              ['Izin', totals.Izin, 'text-amber-700'],
              ['Alpa', totals.Alpa, 'text-rose-700'],
            ] as const).map(([label, value, textColor]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
                <p className="text-[10px] text-slate-400">siswa</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-600">Persentase kehadiran</span>
              <strong className="text-[#058D78]">{attendancePercent}%</strong>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#0F9D8A] to-[#62C9B9]" style={{ width: `${attendancePercent}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{totalRecorded} catatan kehadiran dari seluruh kelas</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Status Peringatan Kehadiran</h3>
              <p className="text-xs text-slate-500 mt-1">Pemantauan akumulasi semester berjalan</p>
            </div>
            <span className="rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 text-xs font-bold">{warnings.length} siswa</span>
          </div>
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {warnings.length ? warnings.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50/70 border border-rose-100 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{student.name}</p>
                  <p className="text-[11px] text-slate-500">{student.className}</p>
                </div>
                <div className="flex shrink-0 gap-2 text-[10px] font-semibold">
                  {student.absence.alpa >= 3 && <span className="rounded-md bg-rose-100 text-rose-700 px-2 py-1">Alpa {student.absence.alpa}×</span>}
                  {student.absence.sakit >= 5 && <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-1">Sakit {student.absence.sakit}×</span>}
                </div>
              </div>
            )) : (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-emerald-700">Belum ada siswa yang masuk status peringatan</p>
                <p className="text-xs text-slate-400 mt-1">Peringatan muncul pada Alpa minimal 3 kali atau Sakit minimal 5 kali.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"><p className="text-xs font-semibold text-slate-500">Total Siswa Aktif</p><p className="mt-2 text-2xl font-bold text-slate-900">{activeStudentsCount}</p></div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"><p className="text-xs font-semibold text-slate-500">Guru & Pendidik</p><p className="mt-2 text-2xl font-bold text-slate-900">{activeTeachersCount}</p></div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"><p className="text-xs font-semibold text-slate-500">Kehadiran</p><p className="mt-2 text-2xl font-bold text-[#058D78]">{attendancePercent}%</p></div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"><p className="text-xs font-semibold text-slate-500">Jurnal Pembelajaran</p><p className="mt-2 text-2xl font-bold text-slate-900">{journals.length}</p><p className="text-xs text-slate-400 mt-1">{journals.filter((journal) => journal.status === 'Selesai').length} sesi selesai</p></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">Aktivitas Jurnal KBM Terbaru</h3><button onClick={() => onNavigate('journal')} className="text-xs font-semibold text-[#058D78] hover:underline">Semua jurnal</button></div>
          <div className="mt-3 divide-y divide-slate-100">
            {recentJournals.length ? recentJournals.map((journal) => (
              <div key={journal.id} className="py-3">
                <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-bold text-slate-900">{journal.subject}</span><span className="text-[10px] rounded-md bg-slate-100 px-2 py-0.5">{journal.className}</span><span className="text-[10px] text-slate-400">{journal.date}</span></div>
                <p className="text-xs text-slate-600 mt-1">{journal.topic}</p>
                <p className="text-[11px] text-slate-400 mt-1">Oleh: {journal.teacherName}</p>
              </div>
            )) : <p className="py-6 text-xs text-slate-400 text-center">Belum ada jurnal pembelajaran.</p>}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">Catatan Karakter & Perilaku Siswa</h3><button onClick={() => onNavigate('behavior')} className="text-xs font-semibold text-[#058D78] hover:underline">Kelola perilaku</button></div>
          <div className="mt-3 space-y-2">
            {recentBehaviors.length ? recentBehaviors.map((behavior) => (
              <div key={behavior.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-900">{behavior.studentName} ({behavior.className})</span><span className="text-[10px] text-slate-500">{behavior.status}</span></div>
                <p className="text-xs text-slate-600 mt-1">{behavior.description}</p>
                <p className="text-[11px] text-slate-400 mt-1">Pembinaan: {behavior.coachingAction}</p>
              </div>
            )) : <p className="py-6 text-xs text-slate-400 text-center">Belum ada catatan perilaku siswa.</p>}
          </div>
        </div>
      </section>

      <section className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Informasi Akademik</h3><span className="text-xs text-slate-500">TA {settings.activeAcademicYear} · Semester {settings.activeSemester}</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Hari Efektif Semester</p><p className="text-lg font-bold text-slate-900 mt-1">{settings.effectiveDays} Hari</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Kepala Sekolah</p><p className="font-bold text-slate-900 mt-1">{settings.principal}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-500">Lokasi</p><p className="font-bold text-slate-900 mt-1">Maros, Sulawesi Selatan</p></div>
        </div>
      </section>
    </div>
  );
};
