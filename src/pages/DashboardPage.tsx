import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useData } from '../context/DataContext';
import { NavTab } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import {
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  FileText,
  ClipboardCheck,
  Search,
  CalendarCheck,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  activeTab: NavTab;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, activeTab }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [attendancePeriod, setAttendancePeriod] = useState<'today'|'week'|'1'|'2'|'3'|'4'|'semester'>('today');
  const [journalPeriod, setJournalPeriod] = useState<'today'|'week'|'1'|'2'|'3'>('today');
  const [attendanceClass, setAttendanceClass] = useState('Semua Kelas');
  const { students, classes, attendances, journals, settings } = useData();

  const handleGlobalSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = globalSearch.trim().toLowerCase();
    if (!query) return;
    const destinations: [string[], NavTab][] = [
      [['presensi', 'kehadiran', 'absen', 'hadir', 'izin', 'sakit'], 'attendance'],
      [['jurnal', 'kbm', 'pembelajaran', 'materi'], 'journal'],
      [['nilai', 'penilaian', 'tugas', 'ulangan'], 'assessment'],
      [['kelas', 'rombel'], 'classes'],
      [['mapel', 'mata pelajaran', 'kurikulum'], 'subjects'],
      [['ujian', 'soal', 'cbt', 'tes'], 'exams'],
      [['wali', 'rapor', 'rekap', 'capaian'], 'grades'],
      [['bk', 'konseling', 'bimbingan'], 'counseling'],
      [['laporan', 'cetak', 'rekapitulasi'], 'reports'],
      [['siswa', 'guru', 'data master', 'sekolah'], 'master'],
      [['perilaku', 'karakter', 'sikap', 'prestasi', 'pelanggaran'], 'behavior'],
      [['pengaturan', 'profil', 'aplikasi'], 'settings'],
    ];
    const match = destinations.find(([keywords]) => keywords.some((keyword) => query.includes(keyword)));
    if (match) onNavigate(match[1]);
  };

  const today = new Date();
  const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const periodStart = new Date(today);
  if (attendancePeriod === 'today') { /* today only */ }
  else if (attendancePeriod === 'week') periodStart.setDate(periodStart.getDate() - 6);
  else if (attendancePeriod === 'semester') periodStart.setMonth(periodStart.getMonth() - 5);
  else periodStart.setMonth(periodStart.getMonth() - Number(attendancePeriod));
  const periodStartStr = [periodStart.getFullYear(), String(periodStart.getMonth() + 1).padStart(2, '0'), String(periodStart.getDate()).padStart(2, '0')].join('-');
  const relevantAttendances = attendances.filter(record =>
    record.academicYear === settings.activeAcademicYear &&
    record.semester === settings.activeSemester &&
    record.date >= periodStartStr && record.date <= todayStr &&
    (attendanceClass === 'Semua Kelas' || record.className === attendanceClass)
  );
  const attendanceDate = relevantAttendances.reduce((latest, record) => record.date > latest ? record.date : latest, '');
  const realTotals = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  const absentByStudent = new Map<string, { student: typeof students[number]; status: string; count: number }>();
  relevantAttendances.forEach(record => {
    Object.entries(record.records || {}).forEach(([studentId, status]) => {
      if (status in realTotals) realTotals[status as keyof typeof realTotals]++;
      if (status !== 'Hadir') {
        const student = students.find(item => item.id === studentId);
        if (student) {
          const key = studentId + ':' + status;
          const previous = absentByStudent.get(key);
          absentByStudent.set(key, { student, status, count: (previous?.count || 0) + 1 });
        }
      }
    });
  });
  const totalRecorded = Object.values(realTotals).reduce((sum, value) => sum + value, 0);
  const totals = realTotals;
  const attendancePercent = totalRecorded > 0 ? Math.round((totals.Hadir / totalRecorded) * 100) : 0;
  const absentStudents = Array.from(absentByStudent.values()).sort((a,b) => a.student.name.localeCompare(b.student.name));
  const attendancePeriodLabel = attendancePeriod === 'today' ? 'Kehadiran hari ini' : attendancePeriod === 'week' ? '1 pekan terakhir' : attendancePeriod === 'semester' ? '1 semester' : attendancePeriod + ' bulan terakhir';

  const journalStart = new Date(today);
  if (journalPeriod === 'week') journalStart.setDate(journalStart.getDate() - 6);
  else if (journalPeriod !== 'today') journalStart.setMonth(journalStart.getMonth() - Number(journalPeriod));
  const journalStartStr = [journalStart.getFullYear(), String(journalStart.getMonth() + 1).padStart(2, '0'), String(journalStart.getDate()).padStart(2, '0')].join('-');
  const visibleJournals = journals.filter(journal => journal.date >= journalStartStr && journal.date <= todayStr).sort((a,b) => b.date.localeCompare(a.date));
  const journalPeriodLabel = journalPeriod === 'today' ? 'Jurnal hari ini' : journalPeriod === 'week' ? '1 pekan terakhir' : journalPeriod + ' bulan terakhir';

  return (
    <div className="min-h-screen w-full bg-white font-sans text-slate-800 antialiased">
      {/* HERO SECTION with compact aligned card and integrated top navbar */}
      <section className="relative w-full overflow-hidden pb-3 pt-0 bg-white">
        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center gap-3 border-b border-slate-100 bg-white px-3 py-2 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo SMP Islam Al-Wasi’" className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
            <span className="max-w-[112px] truncate text-xs font-extrabold tracking-tight text-slate-900 sm:max-w-none sm:text-base">SMP Islam Al-Wasi’</span>
          </div>
          <form onSubmit={handleGlobalSearch} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#D5EADB] bg-[#F8FCF9] px-3 sm:h-10 sm:px-4">
            <Search size={17} className="shrink-0 text-[#0B8F4D]" />
            <input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} type="search" aria-label="Cari siswa atau fitur SIMPATIK" placeholder="Search - siswa atau fitur SIMPATIK" className="min-w-0 w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:text-sm" />
          </form>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 sm:h-10 sm:w-10" aria-label="Notifikasi">
            <Bell size={18} strokeWidth={1.8} />
          </div>
        </div>

        {/* Embedded Top Navigation Bar */}
        <div className="relative z-10 md:hidden">
          <Header activeTab={activeTab} onNavigate={onNavigate} embedded />
        </div>

        {/* Full-width hero card with illustration beside unchanged hero text */}
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 pt-2 pb-3 md:px-8 md:pt-3 md:pb-4">
          <div className="hero flex w-full flex-col items-center justify-between gap-5 overflow-hidden rounded-[24px] border border-[#D5EADB] bg-gradient-to-br from-[#27C879] via-[#18B66A] to-[#0B9654] px-6 py-6 shadow-sm md:flex-row md:gap-8 md:px-9 md:py-7">
            <div className="min-w-0 w-full max-w-3xl flex-1">
              <h1 className="font-black tracking-tight text-white text-3xl sm:text-4xl md:text-5xl">
                SIMPATIK
              </h1>
              <p className="mt-1 whitespace-nowrap font-semibold tracking-tight text-white text-[9px] sm:text-xs md:text-sm">
                Sistem Informasi Manajemen Pembelajaran &amp; Asesmen
              </p>
              <p className="whitespace-nowrap font-semibold tracking-tight text-white text-[9px] sm:text-xs md:text-sm">
                yang Terpadu, Interaktif dan Kolaboratif
              </p>
              <div className="mt-3 border-t border-white/35 pt-3">
                <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl md:text-2xl">SMP Islam Al-Wasi'</h2>
                <p className="mt-1 text-xs font-semibold tracking-wide text-white sm:text-sm md:text-base">Qur'ani, Ramah Anak dan Berkarakter</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-center md:mr-0 md:w-[32%] md:translate-x-4 md:self-stretch">
              <img
                src={`${import.meta.env.BASE_URL}images/Desain%20tanpa%20judul_20261114_193738_0000.png`}
                alt="Ilustrasi struktur manajemen SIMPATIK"
                className="hero-illustration h-auto object-contain"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 mx-auto max-w-[1240px] space-y-6 px-4 pt-3 pb-6 md:px-8">
        <section className="overflow-hidden rounded-[24px] border border-[#D5EADB] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#E3F7EC] px-5 py-4">
            <div><h2 className="text-lg font-extrabold text-[#076B3A]">Rekap Presensi Siswa</h2><p className="text-xs text-slate-500">{attendancePeriodLabel} · {settings.activeAcademicYear} · {settings.activeSemester}</p></div>
            <select value={attendanceClass} onChange={e=>setAttendanceClass(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option>Semua Kelas</option>{classes.map(cls=><option key={cls} value={cls}>{cls}</option>)}</select>
          </div>
          <div className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-600">Periode kehadiran</p><select value={attendancePeriod} onChange={e=>setAttendancePeriod(e.target.value as typeof attendancePeriod)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#076B3A]"><option value="today">Hari Ini</option><option value="week">1 Pekan</option><option value="1">1 Bulan</option><option value="2">2 Bulan</option><option value="3">3 Bulan</option><option value="4">4 Bulan</option><option value="semester">1 Semester</option></select></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{label:'Hadir',value:totals.Hadir,color:'text-[#0B8F4D]',bg:'bg-[#E3F7EC]'},{label:'Sakit',value:totals.Sakit,color:'text-blue-700',bg:'bg-blue-50'},{label:'Izin',value:totals.Izin,color:'text-amber-700',bg:'bg-amber-50'},{label:'Alpa',value:totals.Alpa,color:'text-rose-700',bg:'bg-rose-50'}].map(item=><div key={item.label} className={'rounded-2xl p-4 '+item.bg}><p className={'text-xs font-bold '+item.color}>{item.label}</p><p className={'mt-1 text-2xl font-black '+item.color}>{item.value}</p></div>)}</div>
            <div><div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-slate-800">Siswa tidak hadir</h3><span className="text-xs text-slate-500">{absentStudents.length} catatan siswa</span></div>
              {absentStudents.length ? <div className="max-h-72 overflow-auto rounded-xl border border-slate-100"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Nama siswa</th><th className="p-3">Kelas</th><th className="p-3">Status</th><th className="p-3 text-right">Jumlah</th></tr></thead><tbody className="divide-y divide-slate-100">{absentStudents.map(item=><tr key={item.student.id+item.status}><td className="p-3 font-semibold">{item.student.name}</td><td className="p-3">{item.student.className}</td><td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-bold '+(item.status==='Sakit'?'bg-blue-50 text-blue-700':item.status==='Izin'?'bg-amber-50 text-amber-700':'bg-rose-50 text-rose-700')}>{item.status}</span></td><td className="p-3 text-right font-bold">{item.count}×</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Belum ada catatan siswa sakit, izin, atau alpa pada periode ini.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#D5EADB] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-[#0B8F4D] to-[#087640] px-5 py-4 text-white">
            <div><h2 className="text-lg font-extrabold">Jurnal Pembelajaran</h2><p className="text-xs text-white/85">{journalPeriodLabel} · {visibleJournals.length} jurnal</p></div>
            <select value={journalPeriod} onChange={e=>setJournalPeriod(e.target.value as typeof journalPeriod)} className="rounded-xl border border-white/30 bg-white px-3 py-2 text-sm font-semibold text-[#076B3A]"><option value="today">Hari Ini</option><option value="week">1 Pekan</option><option value="1">1 Bulan</option><option value="2">2 Bulan</option><option value="3">3 Bulan</option></select>
          </div>
          <div className="p-4 md:p-5">
            {visibleJournals.length ? <div className="divide-y divide-slate-100">{visibleJournals.map(journal=><article key={journal.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[130px_1fr]"><div><p className="text-sm font-bold text-[#076B3A]">{journal.date}</p><p className="text-xs text-slate-500">{journal.lessonHours}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-800">{journal.subject} · {journal.className}</h3><span className="rounded-full bg-[#E3F7EC] px-2 py-1 text-[10px] font-bold text-[#076B3A]">{journal.status}</span></div><p className="mt-1 text-sm font-semibold text-slate-700">{journal.topic}</p><p className="mt-1 text-sm text-slate-600">{journal.activity}</p><p className="mt-1 text-xs text-slate-400">{journal.teacherName}</p></div></article>)}</div> : <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Belum ada jurnal pada periode ini.</p>}
          </div>
        </section>
      </main>
    </div>
  );
};
