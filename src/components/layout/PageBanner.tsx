import React from 'react';
import {
  ArrowLeft, BookOpen, CalendarCheck, ClipboardCheck, ClipboardList,
  FileBarChart, FileText, GraduationCap, HeartHandshake, Home,
  Library, ShieldCheck, Users, UserRound, School, Sparkles
} from 'lucide-react';
import { NavTab } from './Sidebar';

const pageDetails: Record<NavTab, { title: string; description: string; icon: React.ElementType }> = {
  dashboard: { title: 'Beranda', description: 'Pusat informasi dan aktivitas sekolah', icon: Home },
  settings: { title: 'Profil', description: 'Informasi akun dan pengaturan profil', icon: UserRound },
  classes: { title: 'Kelas', description: 'Pengelolaan tingkat dan data kelas', icon: GraduationCap },
  subjects: { title: 'Mapel', description: 'Daftar dan pengelolaan mata pelajaran', icon: BookOpen },
  attendance: { title: 'Presensi Siswa', description: 'Pencatatan dan pemantauan kehadiran siswa', icon: CalendarCheck },
  journal: { title: 'Jurnal Pembelajaran', description: 'Catatan kegiatan pembelajaran di kelas', icon: FileText },
  assessment: { title: 'Input Nilai Kelas', description: 'Pengelolaan nilai dan capaian belajar siswa', icon: ClipboardCheck },
  grades: { title: 'Rekap Nilai', description: 'Ringkasan hasil belajar dan nilai siswa', icon: FileBarChart },
  exams: { title: 'Ujian', description: 'Pembuatan, pengelolaan, dan hasil ujian', icon: ClipboardList },
  counseling: { title: 'Bimbingan Konseling', description: 'Pendampingan dan layanan konseling siswa', icon: HeartHandshake },
  behavior: { title: 'Perilaku Siswa', description: 'Pemantauan sikap, karakter, dan perilaku siswa', icon: ShieldCheck },
  reports: { title: 'Laporan', description: 'Ringkasan dan dokumentasi kegiatan sekolah', icon: FileBarChart },
  master: { title: 'Data Guru dan Siswa', description: 'Pengelolaan data warga sekolah', icon: Users },
  ils: { title: 'ILS', description: 'Informasi dan layanan ILS SMP Islam Al-Wasi’', icon: Sparkles },
};

interface PageBannerProps {
  activeTab: NavTab;
  onBack: () => void;
  title?: string;
  description?: string;
  icon?: React.ElementType;
}

export const PageBanner: React.FC<PageBannerProps> = ({ activeTab, onBack, title, description, icon }) => {
  const details = pageDetails[activeTab];
  const Icon = icon || details.icon;
  return (
    <section className="page-header relative mb-5 flex w-full items-center justify-between gap-4">
      <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
        <button type="button" onClick={onBack} aria-label="Kembali" className="btn-back">
          <ArrowLeft size={20}/>
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B8F4D] sm:text-[11px]">SIMPATIK · SMP ISLAM AL-WASI’</p>
          <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-[#17334B] sm:text-2xl md:text-[28px]">{title || details.title}</h1>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500 sm:text-xs">{description || details.description}</p>
        </div>
      </div>
      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-[#0B8F4D] shadow-sm sm:h-14 sm:w-14">
        <Icon size={25} strokeWidth={1.9}/>
      </div>
    </section>
  );
};
