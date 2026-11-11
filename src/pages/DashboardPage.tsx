import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/layout/Sidebar';
import {
  CalendarCheck, PencilLine, Users, BookOpen, ClipboardList, ClipboardCheck,
  GraduationCap, MessageCircle, Handshake, ArrowUpRight
} from 'lucide-react';

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
  const totals = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
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
  const attendanceGradient = `conic-gradient(
    #05A287 0% ${totalRecorded ? totals.Hadir / totalRecorded * 100 : 0}%,
    #2B6CB0 ${totalRecorded ? totals.Hadir / totalRecorded * 100 : 0}% ${totalRecorded ? (totals.Hadir + totals.Sakit) / totalRecorded * 100 : 0}%,
    #D69E2E ${totalRecorded ? (totals.Hadir + totals.Sakit) / totalRecorded * 100 : 0}% ${totalRecorded ? (totals.Hadir + totals.Sakit + totals.Izin) / totalRecorded * 100 : 0}%,
    #C53030 ${totalRecorded ? (totals.Hadir + totals.Sakit + totals.Izin) / totalRecorded * 100 : 0}% 100%
  )`;

  const quickItems: { label: string; description: string; tab: NavTab; icon: React.ReactNode }[] = [
    { label: 'Presensi siswa', description: 'Catat kehadiran siswa', tab: 'attendance', icon: <Users size={23} /> },
    { label: 'Jurnal pembelajaran', description: 'Catat kegiatan KBM', tab: 'journal', icon: <BookOpen size={23} /> },
    { label: 'Input nilai kelas', description: 'Kelola penilaian', tab: 'assessment', icon: <ClipboardList size={23} /> },
    { label: 'Ujian', description: 'Bank soal dan hasil ujian', tab: 'exams', icon: <ClipboardCheck size={23} /> },
  ];

  const principles = [
    { title: 'Terpadu', description: 'Satu data siswa untuk absensi, penilaian, dan rapor.', icon: <GraduationCap size={22} /> },
    { title: 'Interaktif', description: 'Ujian online, notifikasi, dan hasil langsung tampil.', icon: <MessageCircle size={22} /> },
    { title: 'Kolaboratif', description: 'Guru, wali kelas, BK, dan kepala sekolah berbagi data.', icon: <Handshake size={22} /> },
  ];

  return (
    <div className="min-h-full bg-[#F3F8F7] text-[#0F2A25]">
      <section className="relative overflow-hidden bg-[#018470] px-5 py-6 text-white lg:px-10 lg:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[36px] border-white/5" />
        <div className="relative mx-auto flex max-w-[1500px] items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">Selamat datang, <strong>{currentUser?.displayName || firebaseUser?.displayName || 'Pengguna'}</strong></p>
            <h1 className="mt-1 text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-6xl">SIMPATIK</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/95 md:text-base">Sistem Informasi Manajemen Pendidikan dan Akademik Terpadu, Interaktif dan Kolaboratif</p>
            <p className="mt-1 text-xs font-medium tracking-wide text-white/85 md:text-sm">Qurani, Ramah Anak dan Berkarakter</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate('attendance')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#015E4F] shadow-sm transition hover:bg-[#E3F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <CalendarCheck size={17} aria-hidden="true" /> Lakukan Presensi
              </button>
              <button type="button" onClick={() => onNavigate('journal')} className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-white px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PencilLine size={17} aria-hidden="true" /> Tulis Jurnal
              </button>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-center justify-center sm:flex">
            <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="Logo SMP Islam Al-Wasi'" className="h-24 w-24 object-contain lg:h-28 lg:w-28" />
            <span className="mt-1 text-center text-sm font-extrabold tracking-wide">SMP ISLAM AL-WASI'</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1500px] space-y-4 px-3 py-4 md:px-5 lg:px-7 lg:py-5">
        <section aria-label="Nilai utama SIMPATIK" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {principles.map((item) => (
            <article key={item.title} className="flex min-h-[92px] items-start gap-3 rounded-2xl border border-[#DCE8E5] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(15,42,37,.035)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3F4F0] text-[#018470]">{item.icon}</span>
              <div><h2 className="text-sm font-extrabold text-[#0F2A25]">{item.title}</h2><p className="mt-1 text-xs leading-relaxed text-[#4A5F5A]">{item.description}</p></div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#DCE8E5] bg-white shadow-[0_3px_14px_rgba(15,42,37,.045)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE8E5] bg-[#FBFDFC] px-4 py-3 md:px-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F4F0] text-[#018470]"><Users size={22} /></span><div><h2 className="text-base font-extrabold text-[#0F2A25] md:text-lg">Kehadiran Siswa</h2><p className="text-xs text-[#4A5F5A]">{attendanceDateLabel}</p></div></div>
              <button type="button" onClick={() => onNavigate('attendance')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#DCE8E5] bg-white px-3 text-xs font-semibold text-[#0F2A25] transition hover:bg-[#E3F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#05A287]">
                Semua kelas <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-5 p-4 xl:flex-row xl:justify-around md:p-5">
              <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: attendanceGradient }}>
                <div className="absolute inset-[19%] flex flex-col items-center justify-center rounded-full bg-white text-center"><strong className="text-3xl text-[#0F2A25]">{attendancePercent}%</strong><span className="mt-1 text-xs leading-tight text-[#4A5F5A]">Rata-rata<br />Kehadiran</span></div>
              </div>
              <div className="w-full max-w-[270px] space-y-1">
                {([
                  ['Hadir', totals.Hadir, '#05A287'],
                  ['Sakit', totals.Sakit, '#2B6CB0'],
                  ['Izin', totals.Izin, '#D69E2E'],
                  ['Alpa', totals.Alpa, '#C53030'],
                ] as const).map(([label, value, color]) => <div key={label} className="flex items-center justify-between border-b border-[#DCE8E5] py-2.5 text-sm last:border-0"><span className="flex items-center gap-2 text-[#4A5F5A]"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span><strong className="text-[#0F2A25]">{value}</strong><span className="w-10 text-right text-xs font-semibold text-[#4A5F5A]">{totalRecorded ? Math.round(value / totalRecorded * 100) : 0}%</span></div>)}
                {!totalRecorded && <p className="pt-2 text-xs text-[#4A5F5A]">Belum ada catatan presensi pada periode ini.</p>}
                <p className="pt-1 text-[11px] text-[#4A5F5A]">Total siswa aktif: {activeStudents}</p>
              </div>
            </div>
          </article>

          <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#DCE8E5] bg-white shadow-[0_3px_14px_rgba(15,42,37,.045)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE8E5] bg-[#FBFDFC] px-4 py-3 md:px-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F4F0] text-[#018470]"><BookOpen size={22} /></span><h2 className="text-base font-extrabold text-[#0F2A25] md:text-lg">Jurnal Pembelajaran</h2></div>
              <button type="button" onClick={() => onNavigate('journal')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#DCE8E5] bg-white px-3 text-xs font-semibold text-[#0F2A25] transition hover:bg-[#E3F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#05A287]">
                Semua jurnal <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-[1.35fr_1fr] gap-3 p-3 md:p-4">
              <div className="flex min-h-[88px] items-center justify-center gap-3 rounded-xl bg-[#018470] px-3 text-white"><BookOpen size={31} /><div className="border-l border-white/60 pl-3 text-center"><strong className="block text-3xl font-black md:text-4xl">{currentMonthCount}</strong><span className="text-xs">Jurnal Bulan Ini</span></div></div>
              <div className="flex min-h-[88px] flex-col items-center justify-center rounded-xl bg-[#E3F4F0] px-2 text-center text-[#015E4F]"><CalendarCheck size={23} /><strong className="mt-1 text-2xl font-black">{journals.length}</strong><span className="text-[11px]">Sepanjang Tahun</span></div>
            </div>
            <div className="px-4 pb-4 pt-1 md:px-5">
              <div className="flex h-32 items-end justify-around gap-3 border-b border-l border-[#DCE8E5] px-3">
                {monthItems.map((item, index) => <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-semibold text-[#4A5F5A]">{item.count}</span><div className={`w-full max-w-10 rounded-t-md ${index === 5 ? 'bg-[#018470]' : 'bg-[#05A287]'}`} style={{ height: item.count ? `${Math.max(8, item.count / maxMonthly * 76)}%` : '2px', minHeight: item.count ? undefined : '2px' }} /><span className="pb-1 text-[10px] font-semibold text-[#4A5F5A]">{item.label}</span></div>)}
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[18px] border border-[#DCE8E5] bg-white p-4 shadow-[0_3px_14px_rgba(15,42,37,.035)] md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-extrabold text-[#0F2A25] md:text-lg">Menu cepat</h2><p className="mt-0.5 text-xs text-[#4A5F5A]">Akses fitur utama SIMPATIK</p></div><ArrowUpRight size={18} className="text-[#05A287]" aria-hidden="true" /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickItems.map(item => <button key={item.tab} type="button" onClick={() => onNavigate(item.tab)} className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-[#DCE8E5] bg-[#FBFDFC] p-3 text-left transition hover:border-[#05A287] hover:bg-[#E3F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#05A287]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E3F4F0] text-[#018470] transition group-hover:bg-white">{item.icon}</span>
              <span className="min-w-0"><strong className="block text-sm font-bold leading-tight text-[#0F2A25]">{item.label}</strong><small className="mt-1 block text-xs leading-snug text-[#4A5F5A]">{item.description}</small></span>
            </button>)}
          </div>
        </section>
      </main>
    </div>
  );
};
