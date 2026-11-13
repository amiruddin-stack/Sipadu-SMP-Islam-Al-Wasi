import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home, UserRound, GraduationCap, BookOpen, ClipboardList,
  Users, NotebookPen, ClipboardCheck, HeartHandshake, ShieldCheck,
  FileText, Settings, LogOut
} from 'lucide-react';

export type NavTab =
  | 'dashboard' | 'attendance' | 'journal' | 'behavior' | 'counseling'
  | 'assessment' | 'exams' | 'grades' | 'master' | 'reports'
  | 'settings' | 'classes' | 'subjects' | 'ils';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface DesktopSidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const primaryItems: { tab: NavTab; label: string; icon: React.ElementType }[] = [
  { tab: 'dashboard', label: 'Beranda', icon: Home },
  { tab: 'settings', label: 'Profil', icon: UserRound },
  { tab: 'classes', label: 'Kelas', icon: GraduationCap },
  { tab: 'subjects', label: 'Mapel', icon: BookOpen },
];

const academicItems: { tab: NavTab; label: string; icon: React.ElementType }[] = [
  { tab: 'attendance', label: 'Presensi Siswa', icon: Users },
  { tab: 'journal', label: 'Jurnal Pembelajaran', icon: NotebookPen },
  { tab: 'assessment', label: 'Input Nilai Kelas', icon: ClipboardList },
  { tab: 'grades', label: 'Rekap Nilai', icon: ClipboardCheck },
  { tab: 'exams', label: 'Ujian', icon: FileText },
  { tab: 'counseling', label: 'Bimbingan Konseling', icon: HeartHandshake },
  { tab: 'behavior', label: 'Perilaku Siswa', icon: ShieldCheck },
  { tab: 'reports', label: 'Laporan', icon: FileText },
  { tab: 'master', label: 'Data Guru & Siswa', icon: Users },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, firebaseUser, logout } = useAuth();
  const itemClass = (tab: NavTab) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
      activeTab === tab
        ? 'bg-[#E3F7EC] text-[#076B3A]'
        : 'text-slate-600 hover:bg-[#F2FAF5] hover:text-[#076B3A]'
    }`;

  return (
    <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-[#D5EADB] bg-white px-4 py-5 md:flex">
      <button type="button" onClick={() => onNavigate('dashboard')} className="mb-7 flex items-center gap-3 px-2 text-left">
        <img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo sekolah" className="h-11 w-11 shrink-0 object-contain" />
        <span className="min-w-0">
          <span className="block text-sm font-extrabold tracking-tight text-slate-900">SMP ISLAM AL-WASI’</span>
          <span className="mt-0.5 block text-[10px] font-bold tracking-[0.16em] text-[#0B8F4D]">SIMPATIK MOBILE</span>
        </span>
      </button>

      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {primaryItems.map(({ tab, label, icon: Icon }) => (
          <button key={tab} type="button" onClick={() => onNavigate(tab)} className={itemClass(tab)}>
            <Icon size={18} strokeWidth={1.9} />{label}
          </button>
        ))}
        <p className="px-3 pb-1 pt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Akademik</p>
        {academicItems.map(({ tab, label, icon: Icon }) => (
          <button key={tab} type="button" onClick={() => onNavigate(tab)} className={itemClass(tab)}>
            <Icon size={18} strokeWidth={1.9} />{label}
          </button>
        ))}
        <button type="button" onClick={() => onNavigate('ils')} className={itemClass('ils')}>
          <BookOpen size={18} strokeWidth={1.9} />ILS
        </button>
      </nav>

      <div className="mt-4 border-t border-[#E3F7EC] pt-4">
        <p className="truncate px-2 text-xs font-bold text-slate-800">{currentUser?.displayName || 'Akun'}</p>
        <p className="mt-1 truncate px-2 text-[10px] text-slate-400">{currentUser?.role === 'super_admin' ? 'Admin Utama' : currentUser?.email || ''}</p>
        {firebaseUser && !firebaseUser.isAnonymous && currentUser && (
          <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-red-600">
            <LogOut size={15} />Keluar
          </button>
        )}
        <p className="mt-3 px-2 text-[10px] leading-5 text-slate-400">Qurani, Ramah Anak dan Berkarakter</p>
      </div>
    </aside>
  );
};

export const Sidebar: React.FC<SidebarProps> = () => null;
