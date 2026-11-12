import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/layout/Sidebar';
import { CalendarCheck, PencilLine, Users, BookOpen, ClipboardList, Settings, ArrowRight, FileText, ClipboardCheck } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser, firebaseUser } = useAuth();
  const { students, attendances, journals, settings } = useData();
  const today = new Date();
  const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const relevantAttendances = attendances.filter(record => record.academicYear === settings.activeAcademicYear && record.semester === settings.activeSemester);
  const attendanceDate = relevantAttendances.some(record => record.date === todayStr)
    ? todayStr
    : relevantAttendances.reduce((latest, record) => record.date > latest ? record.date : latest, '');
  const latestAttendances = relevantAttendances.filter(record => record.date === attendanceDate);
  const totals = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  latestAttendances.forEach(record => Object.values(record.records || {}).forEach(status => {
    if (status in totals) totals[status as keyof typeof totals]++;
  }));
  const totalRecorded = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const attendancePercent = totalRecorded ? Math.round(totals.Hadir / totalRecorded * 100) : 0;
  const activeStudents = students.filter(student => student.status === 'Aktif').length;
  const attendanceDateLabel = attendanceDate
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(attendanceDate + 'T00:00:00'))
    : 'Belum ada data kehadiran';

  const monthItems = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    const count = journals.filter(journal => typeof journal.date === 'string' && journal.date.slice(0, 7) === key).length;
    return { label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date), count, key };
  });
  const maxMonthly = Math.max(1, ...monthItems.map(item => item.count));
  const currentMonthCount = journals.filter(journal => typeof journal.date === 'string' && journal.date.slice(0, 7) === todayStr.slice(0, 7)).length;
  const attendanceGradient = `conic-gradient(#0ca678 0% ${attendancePercent}%, #f2b705 ${attendancePercent}% ${attendancePercent + (totalRecorded ? totals.Izin / totalRecorded * 100 : 0)}%, #f05b62 ${attendancePercent + (totalRecorded ? totals.Izin / totalRecorded * 100 : 0)}% ${attendancePercent + (totalRecorded ? (totals.Izin + totals.Sakit) / totalRecorded * 100 : 0)}%, #a8b4c0 0 100%)`;

  const quickItems: { label: string; description: string; tab: NavTab; icon: React.ReactNode; color: string }[] = [
    { label: 'Presensi Siswa', description: 'Catat kehadiran', tab: 'attendance', icon: <Users size={25} />, color: 'bg-emerald-500' },
    { label: 'Jurnal Pembelajaran', description: 'Catat kegiatan KBM', tab: 'journal', icon: <BookOpen size={25} />, color: 'bg-emerald-600' },
    { label: 'Input Nilai Kelas', description: 'Kelola penilaian', tab: 'assessment', icon: <ClipboardList size={25} />, color: 'bg-green-700' },
    { label: 'Ujian', description: 'Bank soal dan ujian siswa', tab: 'exams', icon: <ClipboardCheck size={25} />, color: 'bg-green-600' },
    { label: 'Ujian', description: 'Bank soal dan ujian siswa', tab: 'exams', icon: <ClipboardCheck size={25} />, color: 'bg-green-600' },
    { label: 'Catatan Wali Kelas', description: 'Catatan siswa', tab: 'behavior', icon: <FileText size={25} />, color: 'bg-lime-700' },
    { label: 'Pengaturan', description: 'Atur aplikasi', tab: 'settings', icon: <Settings size={25} />, color: 'bg-emerald-700' },
  ];

  return (
    <div className="min-h-full bg-[#f5f9f8] text-slate-800">
      <section className="simpatik-hero relative overflow-hidden px-5 py-7 text-white md:px-9 md:py-8">
        <svg className="simpatik-hero-shapes pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><pattern id="simpatik-dot-grid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity=".24" /></pattern></defs>
          <rect x="0" y="0" width="250" height="180" fill="url(#simpatik-dot-grid)" opacity=".55" />
          <circle className="geo geo-one" cx="980" cy="60" r="92" fill="white" opacity=".09" />
          <circle className="geo geo-two" cx="840" cy="270" r="58" fill="none" stroke="#d9ffc8" strokeWidth="2" opacity=".2" />
          <path className="geo geo-three" d="M520 35 L590 155 L450 155 Z" fill="#d9ffc8" opacity=".12" />
          <path className="geo geo-four" d="M1080 180 L1140 240 L1080 300 L1020 240 Z" fill="white" opacity=".1" />
          <path className="geo geo-five" d="M720 55 L770 83 L770 139 L720 167 L670 139 L670 83 Z" fill="none" stroke="white" strokeWidth="2" opacity=".2" />
          <circle className="geo geo-six" cx="390" cy="280" r="38" fill="#d9ffc8" opacity=".1" />
          <path className="geo geo-seven" d="M250 205 L310 240 L250 275 L190 240 Z" fill="none" stroke="#e8ffdc" strokeWidth="2" opacity=".2" />
        </svg>
        <div className="simpatik-hero-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/3" />
        <div className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm text-white/85">Selamat datang, <strong>{currentUser?.displayName || firebaseUser?.displayName || 'Pengguna'}</strong></p>
            <h1 className="simpatik-hero-title mt-1 text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">SIMPATIK</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed md:text-base">Sistem Informasi Manajemen Pendidikan dan Akademik<br className="hidden sm:block" /> Terpadu, Interaktif dan Kolaboratif</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('attendance')} className="hero-primary inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#176b16] shadow-sm transition hover:bg-green-50"><CalendarCheck size={16} /> Lakukan Presensi</button>
              <button onClick={() => onNavigate('journal')} className="hero-secondary inline-flex items-center gap-2 rounded-full border border-white/70 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"><PencilLine size={16} /> Tulis Jurnal</button>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-center justify-center sm:flex">
            <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="Logo SMP Islam Al-Wasi'" className="h-36 w-36 object-contain md:h-44 md:w-44" />
            <span className="mt-2 text-center text-base font-extrabold tracking-wide">SMP ISLAM AL-WASI'</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1500px] space-y-5 px-3 py-5 md:px-5 md:py-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--simpatik-green-line)] bg-white shadow-[0_3px_14px_rgba(20,90,100,.05)]">
            <div className="flex items-center justify-between gap-3 bg-[var(--simpatik-green-soft)] px-4 py-3 md:px-5">
              <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"><Users size={25} fill="currentColor" /></span><div><h2 className="text-lg font-extrabold text-[var(--simpatik-green-deep)] md:text-xl">Kehadiran Siswa</h2><p className="text-[11px] text-slate-500">{attendanceDateLabel}</p></div></div>
              <button onClick={() => onNavigate('attendance')} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">Semua kelas⌄</button>
            </div>
            <div className="flex flex-col items-center gap-5 p-4 xl:flex-row xl:justify-around md:p-6">
              <div className="relative h-48 w-48 shrink-0 rounded-full" style={{ background: attendanceGradient }}>
                <div className="absolute inset-[19%] flex flex-col items-center justify-center rounded-full bg-white text-center"><strong className="text-3xl text-[#17334b]">{attendancePercent}%</strong><span className="mt-1 text-sm leading-tight text-slate-600">Rata-rata<br />Kehadiran</span></div>
              </div>
              <div className="w-full max-w-[270px] space-y-2">
                {([
                  ['Hadir', totals.Hadir, '#0ca678'],
                  ['Izin', totals.Izin, '#f2b705'],
                  ['Sakit', totals.Sakit, '#f05b62'],
                  ['Alpa', totals.Alpa, '#a8b4c0'],
                ] as const).map(([label, value, color]) => <div key={label} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0"><span className="flex items-center gap-2 text-slate-700"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span><strong className="text-slate-800">{value}</strong><span className="w-10 text-right font-semibold text-slate-600">{totalRecorded ? Math.round(value / totalRecorded * 100) : 0}%</span></div>)}
                {!totalRecorded && <p className="text-xs text-slate-400">Belum ada catatan presensi pada periode ini.</p>}
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[20px] border border-[var(--simpatik-green-line)] bg-white shadow-[0_3px_14px_rgba(20,90,100,.05)]">
            <div className="flex items-center justify-between gap-3 bg-[var(--simpatik-green-soft)] px-4 py-3 md:px-5">
              <div className="flex items-center gap-3"><BookOpen size={34} className="text-[var(--simpatik-green-primary)]" /><h2 className="text-lg font-extrabold text-[var(--simpatik-green-deep)] md:text-xl">Jurnal Pembelajaran</h2></div>
              <button onClick={() => onNavigate('journal')} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">Semua kelas⌄</button>
            </div>
            <div className="grid grid-cols-[1.35fr_1fr] gap-3 p-3 md:p-4">
              <div className="flex min-h-[104px] items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-[var(--simpatik-green-deep)] to-[var(--simpatik-green-bright)] px-3 text-white"><BookOpen size={39} /><div className="border-l border-white/70 pl-4 text-center"><strong className="block text-4xl font-black md:text-5xl">{currentMonthCount}</strong><span className="text-xs">Jurnal Bulan Ini</span></div></div>
              <div className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl bg-[var(--simpatik-green-soft)] px-2 text-center text-[var(--simpatik-green-deep)]"><CalendarCheck size={27} /><strong className="mt-1 text-3xl font-black">{journals.length}</strong><span className="text-[11px]">Sepanjang Tahun</span></div>
            </div>
            <div className="px-4 pb-4 pt-1 md:px-5">
              <div className="flex h-32 items-end justify-around gap-3 border-b border-l border-slate-200 px-3">
                {monthItems.map((item, index) => <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-semibold text-slate-500">{item.count || ''}</span><div className={`w-full max-w-10 rounded-t-md ${index === 5 ? 'bg-[#f2b20b]' : 'bg-[#0ca78b]'}`} style={{ height: `${item.count ? Math.max(8, item.count / maxMonthly * 78) : 3}%` }} /><span className="pb-1 text-[10px] font-semibold text-slate-600">{item.label}</span></div>)}
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[20px] bg-gradient-to-r from-[#e4f6f3] to-[#eef9f8] p-3 md:p-4">
          <div className="mb-3 flex items-center gap-2"><span className="text-2xl text-[var(--simpatik-green-primary)]">ϟ</span><h2 className="text-xl font-extrabold text-[var(--simpatik-green-deep)]">Menu</h2></div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x">
            {quickItems.map(item => <button key={item.tab} onClick={() => onNavigate(item.tab)} className="group flex w-[92px] shrink-0 snap-start flex-col items-center justify-start gap-2 rounded-xl px-1 py-2 text-center transition hover:bg-white/80">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md ${item.color}`}>{item.icon}</span>
              <strong className="max-w-full text-xs font-bold leading-tight text-[#173b56]">{item.label}</strong>
            </button>)}
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--simpatik-green-line)] bg-white p-4 shadow-[0_3px_14px_rgba(20,90,100,.05)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-extrabold text-[var(--simpatik-green-deep)]">Lainnya</h2><p className="mt-1 text-xs text-slate-500">Akses seluruh fitur SIMPATIK lainnya</p></div>
            <span className="rounded-full bg-[var(--simpatik-green-soft)] px-3 py-1 text-xs font-bold text-[var(--simpatik-green-primary)]">Semua fitur</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: 'Perilaku Siswa', description: 'Catatan karakter', tab: 'behavior' as NavTab, icon: <Users size={22} /> },
              { label: 'Bimbingan Konseling', description: 'Layanan BK', tab: 'counseling' as NavTab, icon: <BookOpen size={22} /> },
              { label: 'Rekap Nilai', description: 'Capaian akademik', tab: 'grades' as NavTab, icon: <ClipboardList size={22} /> },
              { label: 'Data Master', description: 'Data sekolah', tab: 'master' as NavTab, icon: <Users size={22} /> },
              { label: 'Laporan', description: 'Rekap dan cetak', tab: 'reports' as NavTab, icon: <FileText size={22} /> },
              { label: 'Pengaturan', description: 'Konfigurasi aplikasi', tab: 'settings' as NavTab, icon: <Settings size={22} /> },
            ]).map(item => <button key={item.tab} onClick={() => onNavigate(item.tab)} className="flex min-h-[112px] flex-col items-start justify-between rounded-2xl border border-[#e0eeee] bg-[var(--simpatik-green-soft)] p-3 text-left transition hover:border-[#0ca78b] hover:bg-[#effaf7]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--simpatik-green-soft)] text-[var(--simpatik-green-primary)]">{item.icon}</span>
              <span><strong className="block text-xs leading-tight text-[#173b56]">{item.label}</strong><small className="mt-1 block text-[10px] text-slate-500">{item.description}</small></span>
            </button>)}
          </div>
        </section>
      </main>
    </div>
  );
};
