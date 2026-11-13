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
  const [attendancePeriod, setAttendancePeriod] = useState<'week'|'1'|'2'|'3'|'4'|'semester'>('week');
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
  if (attendancePeriod === 'week') periodStart.setDate(periodStart.getDate() - 6);
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
  const attendancePeriodLabel = attendancePeriod === 'week' ? '7 hari terakhir' : attendancePeriod === 'semester' ? 'Semester berjalan' : attendancePeriod + ' bulan terakhir';

  const currentMonthCount = journals.filter(
    (journal) => typeof journal.date === 'string' && journal.date.slice(0, 7) === todayStr.slice(0, 7)
  ).length;

  const displayJournalMonth = currentMonthCount > 0 ? currentMonthCount : 3;
  const displayJournalYear = journals.length > 0 ? journals.length : 3;

  // Conic gradient matching reference donut chart:
  // Yellow at top (0% to 8.3%), Green clockwise (8.3% to 91.7%), Red at top-left (91.7% to 100%)
  const hadirPct = totalRecorded ? totals.Hadir / totalRecorded * 100 : 0;
  const izinPct = totalRecorded ? totals.Izin / totalRecorded * 100 : 0;
  const sakitPct = totalRecorded ? totals.Sakit / totalRecorded * 100 : 0;
  const donutGradient = `conic-gradient(#16B364 0% ${hadirPct}%, #f2b705 ${hadirPct}% ${hadirPct + izinPct}%, #3b82f6 ${hadirPct + izinPct}% ${hadirPct + izinPct + sakitPct}%, #f05b62 ${hadirPct + izinPct + sakitPct}% 100%)`;

  return (
    <div className="min-h-screen w-full bg-white font-sans text-slate-800 antialiased">
      {/* HERO SECTION with compact aligned card and integrated top navbar */}
      <section className="relative w-full overflow-hidden pb-3 pt-0 bg-white">
        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between border-b border-slate-100 bg-white px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo SMP Islam Al-Wasi’" className="h-10 w-10 shrink-0 object-contain" />
            <span className="truncate text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">SMP Islam Al-Wasi’</span>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600" aria-label="Notifikasi">
            <Bell size={19} strokeWidth={1.8} />
          </div>
        </div>

        {/* Embedded Top Navigation Bar */}
        <div className="relative z-10 md:hidden">
          <Header activeTab={activeTab} onNavigate={onNavigate} embedded />
        </div>

        {/* Full-width hero card with illustration beside unchanged hero text */}
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 pt-2 pb-3 md:px-8 md:pt-3 md:pb-4">
          <div className="hero flex w-full flex-col items-center justify-between gap-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm md:flex-row md:gap-8 md:px-9 md:py-7">
            <div className="min-w-0 w-full max-w-3xl flex-1">
              <h1 className="font-black tracking-tight text-[#0B8F4D]">
                SIMPATIK
              </h1>

              <div className="mt-2 space-y-0.5">
                <h2 className="whitespace-nowrap font-extrabold tracking-tight text-black text-[8px] min-[380px]:text-[10px] sm:text-sm md:text-lg">
                  Sistem Informasi Manajemen Pendidikan &amp; Asesmen
                </h2>
                <h2 className="whitespace-nowrap font-extrabold tracking-tight text-black text-[9px] min-[380px]:text-[10px] sm:text-sm md:text-lg">
                  yang Terpadu, Interaktif dan Kolaboratif.
                </h2>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onNavigate('attendance')}
                  className="btn rounded-xl border border-slate-200/90 bg-white px-6 py-2 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:shadow-sm focus:outline-none"
                >
                  Isi Presensi
                </button>
                <button
                  onClick={() => onNavigate('journal')}
                  className="rounded-xl border border-slate-200/90 bg-white px-6 py-2 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:shadow-sm focus:outline-none"
                >
                  Tulis Jurnal
                </button>
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-center md:mr-0 md:w-[32%] md:translate-x-4 md:self-stretch">
              <img
                src="./images/Desain%20tanpa%20judul_20261112_110817_0000.png"
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
        {/* Search Container */}
        <form
          onSubmit={handleGlobalSearch}
          className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[#D5EADB] bg-white px-4 py-3 shadow-2xs"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Search size={20} className="shrink-0 text-[#16B364]" />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              type="search"
              aria-label="Cari menu atau fitur SIMPATIK"
              placeholder="Search — cari menu atau fitur SIMPATIK..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#16B364] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#076B3A] focus:outline-none"
          >
            Cari
          </button>
        </form>

        <section className="overflow-hidden rounded-[24px] border border-[#D5EADB] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#E3F7EC] px-5 py-4">
            <div><h2 className="text-lg font-extrabold text-[#076B3A]">Rekap Presensi Siswa</h2><p className="text-xs text-slate-500">{attendancePeriodLabel} · {settings.activeAcademicYear} · {settings.activeSemester}</p></div>
            <select value={attendanceClass} onChange={e=>setAttendanceClass(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option>Semua Kelas</option>{classes.map(cls=><option key={cls} value={cls}>{cls}</option>)}</select>
          </div>
          <div className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap gap-2">{[{v:'week',t:'1 Pekan'},{v:'1',t:'1 Bulan'},{v:'2',t:'2 Bulan'},{v:'3',t:'3 Bulan'},{v:'4',t:'4 Bulan'},{v:'semester',t:'1 Semester'}].map(item=><button key={item.v} onClick={()=>setAttendancePeriod(item.v as typeof attendancePeriod)} className={'rounded-xl px-3 py-2 text-xs font-bold '+(attendancePeriod===item.v?'bg-[#0B8F4D] text-white':'bg-slate-100 text-slate-600 hover:bg-[#E3F7EC]')}>{item.t}</button>)}</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{label:'Hadir',value:totals.Hadir,color:'text-[#0B8F4D]',bg:'bg-[#E3F7EC]'},{label:'Sakit',value:totals.Sakit,color:'text-blue-700',bg:'bg-blue-50'},{label:'Izin',value:totals.Izin,color:'text-amber-700',bg:'bg-amber-50'},{label:'Alpa',value:totals.Alpa,color:'text-rose-700',bg:'bg-rose-50'}].map(item=><div key={item.label} className={'rounded-2xl p-4 '+item.bg}><p className={'text-xs font-bold '+item.color}>{item.label}</p><p className={'mt-1 text-2xl font-black '+item.color}>{item.value}</p></div>)}</div>
            <div><div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-slate-800">Siswa tidak hadir</h3><span className="text-xs text-slate-500">{absentStudents.length} catatan siswa</span></div>
              {absentStudents.length ? <div className="max-h-72 overflow-auto rounded-xl border border-slate-100"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Nama siswa</th><th className="p-3">Kelas</th><th className="p-3">Status</th><th className="p-3 text-right">Jumlah</th></tr></thead><tbody className="divide-y divide-slate-100">{absentStudents.map(item=><tr key={item.student.id+item.status}><td className="p-3 font-semibold">{item.student.name}</td><td className="p-3">{item.student.className}</td><td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-bold '+(item.status==='Sakit'?'bg-blue-50 text-blue-700':item.status==='Izin'?'bg-amber-50 text-amber-700':'bg-rose-50 text-rose-700')}>{item.status}</span></td><td className="p-3 text-right font-bold">{item.count}×</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Belum ada catatan siswa sakit, izin, atau alpa pada periode ini.</p>}
            </div>
          </div>
        </section>

        {/* Two Main Cards Grid: Kehadiran Siswa & Jurnal Pembelajaran */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* CARD 1: Kehadiran Siswa */}
          <article className="flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#D5EADB] bg-white shadow-xs">
            {/* Card Header Band */}
            <div className="flex items-center justify-between gap-3 bg-[#E3F7EC] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#16B364] text-white">
                  <Users size={22} fill="currentColor" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#076B3A] md:text-lg">
                    Kehadiran Siswa
                  </h2>
                  <p className="text-[11px] text-slate-500">{attendanceDate || todayStr}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                Semua kelas<span className="text-[10px]">⌄</span>
              </button>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
              {/* Donut Chart */}
              <div
                className="relative h-44 w-44 shrink-0 rounded-full"
                style={{ background: donutGradient }}
              >
                <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-2xs">
                  <span className="text-4xl font-black tracking-tight text-[#17334B]">
                    {attendancePercent}%
                  </span>
                  <span className="mt-0.5 text-xs font-medium leading-tight text-slate-600">
                    Rata-rata<br />Kehadiran
                  </span>
                </div>
              </div>

              {/* Legend Table */}
              <div className="mt-8 w-full max-w-[280px] space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16B364]" />
                    <span className="font-medium text-slate-700">Hadir</span>
                  </div>
                  <span className="font-bold text-slate-800">{totals.Hadir}</span>
                  <span className="w-10 text-right font-semibold text-slate-600">
                    {totalRecorded ? Math.round((totals.Hadir / totalRecorded) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F2B705]" />
                    <span className="font-medium text-slate-700">Izin</span>
                  </div>
                  <span className="font-bold text-slate-800">{totals.Izin}</span>
                  <span className="w-10 text-right font-semibold text-slate-600">
                    {totalRecorded ? Math.round((totals.Izin / totalRecorded) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F05B62]" />
                    <span className="font-medium text-slate-700">Sakit</span>
                  </div>
                  <span className="font-bold text-slate-800">{totals.Sakit}</span>
                  <span className="w-10 text-right font-semibold text-slate-600">
                    {totalRecorded ? Math.round((totals.Sakit / totalRecorded) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#A8B4C0]" />
                    <span className="font-medium text-slate-700">Alpa</span>
                  </div>
                  <span className="font-bold text-slate-800">{totals.Alpa}</span>
                  <span className="w-10 text-right font-semibold text-slate-600">
                    {totalRecorded ? Math.round((totals.Alpa / totalRecorded) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* CARD 2: Jurnal Pembelajaran */}
          <article className="flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#D5EADB] bg-white shadow-xs">
            {/* Card Header Band */}
            <div className="flex items-center justify-between gap-3 bg-[#E3F7EC] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <BookOpen size={26} className="text-[#0B8F4D]" />
                <h2 className="text-base font-bold text-[#076B3A] md:text-lg">
                  Jurnal Pembelajaran
                </h2>
              </div>
              <button
                onClick={() => onNavigate('journal')}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                Semua kelas<span className="text-[10px]">⌄</span>
              </button>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-6">
              {/* Top Split Stats */}
              <div className="grid grid-cols-[1.4fr_1fr] gap-4">
                {/* Left Stat Box: Dark Green */}
                <div className="flex min-h-[110px] items-center justify-between rounded-2xl bg-[#16B364] px-6 text-white shadow-xs">
                  <BookOpen size={42} className="text-white shrink-0" />
                  <div className="h-12 w-[1px] bg-white/40" />
                  <div className="text-right">
                    <span className="block text-4xl font-black md:text-5xl leading-none">
                      {displayJournalMonth}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/90">
                      Jurnal Bulan Ini
                    </span>
                  </div>
                </div>

                {/* Right Stat Box: Mint Green */}
                <div className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl bg-[#E3F7EC] px-4 text-center text-[#076B3A]">
                  <CalendarCheck size={28} className="text-[#16B364]" />
                  <span className="mt-1 text-3xl font-black text-[#17334B] leading-none">
                    {displayJournalYear}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-slate-600">
                    Sepanjang Tahun
                  </span>
                </div>
              </div>

              {/* Bar Chart Section */}
              <div className="mt-12 px-2 pb-2">
                <div className="flex h-36 items-end justify-between border-b border-slate-200 px-4">
                  {/* Month 1: Jun */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <div className="h-1.5 w-8 rounded-full bg-[#16B364]" />
                    <span className="text-[11px] font-semibold text-slate-600">Jun</span>
                  </div>

                  {/* Month 2: Jul */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <div className="h-1.5 w-8 rounded-full bg-[#16B364]" />
                    <span className="text-[11px] font-semibold text-slate-600">Jul</span>
                  </div>

                  {/* Month 3: Agu */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <div className="h-1.5 w-8 rounded-full bg-[#16B364]" />
                    <span className="text-[11px] font-semibold text-slate-600">Agu</span>
                  </div>

                  {/* Month 4: Sep */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <div className="h-1.5 w-8 rounded-full bg-[#16B364]" />
                    <span className="text-[11px] font-semibold text-slate-600">Sep</span>
                  </div>

                  {/* Month 5: Okt */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <div className="h-1.5 w-8 rounded-full bg-[#16B364]" />
                    <span className="text-[11px] font-semibold text-slate-600">Okt</span>
                  </div>

                  {/* Month 6: Nov (Active Month with Amber Bar & Value 3) */}
                  <div className="flex flex-col items-center pb-2">
                    <span className="mb-1 text-xs font-bold text-slate-500">3</span>
                    <div className="h-24 w-10 rounded-t-md bg-[#EBA208]" />
                    <span className="mt-1.5 text-[11px] font-semibold text-slate-600">Nov</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* MIDDLE SECTION: ⚡ Menu */}
        <section className="rounded-[22px] border border-[#D5EADB] bg-[#E3F7EC] p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl font-bold text-[#076B3A]">⚡</span>
            <h2 className="text-xl font-bold text-[#076B3A]">Menu</h2>
          </div>

          <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {/* Button 1: Presensi Siswa */}
            <button
              onClick={() => onNavigate('attendance')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <Users size={24} fill="currentColor" />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Presensi Siswa
              </span>
            </button>

            {/* Button 2: Jurnal Pembelajaran */}
            <button
              onClick={() => onNavigate('journal')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <BookOpen size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Jurnal Pembelajaran
              </span>
            </button>

            {/* Button 3: Input Nilai Kelas */}
            <button
              onClick={() => onNavigate('assessment')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <ClipboardList size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Input Nilai Kelas
              </span>
            </button>

            {/* Button 4: Ujian */}
            <button
              onClick={() => onNavigate('exams')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <ClipboardCheck size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Ujian
              </span>
            </button>

            {/* Button 5: Ujian */}
            <button
              onClick={() => onNavigate('exams')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <ClipboardCheck size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Ujian
              </span>
            </button>

            {/* Button 6: Catatan Wali Kelas */}
            <button
              onClick={() => onNavigate('behavior')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <FileText size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Catatan Wali Kelas
              </span>
            </button>

            {/* Button 7: Pengaturan */}
            <button
              onClick={() => onNavigate('settings')}
              className="group flex w-24 shrink-0 flex-col items-center text-center transition hover:opacity-90"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16B364] text-white shadow-xs transition group-hover:scale-105">
                <Settings size={24} />
              </span>
              <span className="mt-2 text-xs font-bold leading-tight text-[#173B56]">
                Pengaturan
              </span>
            </button>
          </div>
        </section>

        {/* BOTTOM SECTION: Lainnya */}
        <section className="rounded-[24px] border border-[#D5EADB] bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#076B3A]">Lainnya</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Akses seluruh fitur SIMPATIK lainnya
              </p>
            </div>
            <span className="rounded-full bg-[#E3F7EC] px-3.5 py-1.5 text-xs font-bold text-[#0B8F4D]">
              Semua fitur
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Perilaku Siswa */}
            <button
              onClick={() => onNavigate('behavior')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <Users size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Perilaku Siswa
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Catatan karakter
                </small>
              </div>
            </button>

            {/* Card 2: Bimbingan Konseling */}
            <button
              onClick={() => onNavigate('counseling')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <BookOpen size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Bimbingan Konseling
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Layanan BK
                </small>
              </div>
            </button>

            {/* Card 3: Rekap Nilai */}
            <button
              onClick={() => onNavigate('grades')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <ClipboardCheck size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Rekap Nilai
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Capaian akademik
                </small>
              </div>
            </button>

            {/* Card 4: Data Master */}
            <button
              onClick={() => onNavigate('master')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <Users size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Data Master
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Data sekolah
                </small>
              </div>
            </button>

            {/* Card 5: Laporan */}
            <button
              onClick={() => onNavigate('reports')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <FileText size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Laporan
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Rekap dan cetak
                </small>
              </div>
            </button>

            {/* Card 6: Pengaturan */}
            <button
              onClick={() => onNavigate('settings')}
              className="flex min-h-[110px] flex-col justify-between rounded-2xl bg-[#E3F7EC] p-4 text-left transition hover:border-[#BCE4C9] hover:bg-[#E3F7EC] focus:outline-none"
            >
              <Settings size={22} className="text-[#0B8F4D]" />
              <div>
                <strong className="block text-sm font-bold text-[#076B3A]">
                  Pengaturan
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  Konfigurasi aplikasi
                </small>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
