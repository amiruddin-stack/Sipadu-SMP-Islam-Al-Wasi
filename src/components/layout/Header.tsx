import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Settings, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

type MenuLink = { id: NavTab; label: string };
type MenuGroup = { label: string; items: MenuLink[] };

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  kepala_sekolah: 'Kepala Sekolah',
  operator: 'Operator',
  guru: 'Guru Mapel',
  wali_kelas: 'Wali Kelas',
  guru_bk: 'Guru BK',
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, firebaseUser, logout, canAccessBK, canManageMasterData, canManageSettings, canInputGrades, canInputAttendance } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const name = currentUser?.displayName || firebaseUser?.displayName || 'Pengguna';
  const role = currentUser?.role ? roleLabels[currentUser.role] : 'Pengguna';
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  const groups: MenuGroup[] = [
    {
      label: 'Akademik',
      items: [
        ...(canInputAttendance ? [{ id: 'attendance' as NavTab, label: 'Presensi' }] : []),
        { id: 'journal', label: 'Jurnal' },
        ...(canInputGrades ? [{ id: 'assessment' as NavTab, label: 'Penilaian' }, { id: 'grades' as NavTab, label: 'Rekap Nilai' }] : []),
        { id: 'exams', label: 'Ujian' },
      ],
    },
    {
      label: 'Kesiswaan',
      items: [
        { id: 'behavior', label: 'Perilaku' },
        ...(canAccessBK ? [{ id: 'counseling' as NavTab, label: 'BK' }] : []),
      ],
    },
    {
      label: 'Data',
      items: [
        ...(canManageMasterData ? [{ id: 'master' as NavTab, label: 'Data Master' }] : []),
        ...(currentUser?.role && ['super_admin', 'kepala_sekolah', 'operator', 'wali_kelas'].includes(currentUser.role) ? [{ id: 'reports' as NavTab, label: 'Laporan' }] : []),
      ],
    },
  ].filter(group => group.items.length > 0);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (groupRef.current && !groupRef.current.contains(target)) setOpenGroup(null);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenGroup(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const select = (tab: NavTab) => {
    onNavigate(tab);
    setOpenGroup(null);
  };

  const isGroupActive = (group: MenuGroup) => group.items.some(item => item.id === activeTab);

  return (
    <header className="sticky top-0 z-50 border-b border-[#DCE8E5] bg-white shadow-[0_2px_12px_rgba(15,42,37,.06)]">
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-7">
        <button type="button" onClick={() => select('dashboard')} aria-label="SIMPATIK, kembali ke Beranda" className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg text-left">
          <img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png`} alt="" className="h-9 w-9 object-contain" />
          <span className="text-base font-black tracking-wide text-[#015E4F]">SIMPATIK</span>
        </button>

        <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          <button type="button" onClick={() => select('dashboard')} className={`relative flex min-h-11 items-center px-3 text-sm font-semibold transition hover:text-[#018470] ${activeTab === 'dashboard' ? 'text-[#018470] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-[#05A287]' : 'text-[#4A5F5A]'}`}>Beranda</button>
          <div ref={groupRef} className="flex items-center gap-1">
            {groups.map(group => {
              const active = isGroupActive(group);
              const expanded = openGroup === group.label;
              return <div key={group.label} className="relative">
                <button type="button" aria-haspopup="true" aria-expanded={expanded} onClick={() => setOpenGroup(expanded ? null : group.label)} className={`relative inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition hover:bg-[#E3F4F0] hover:text-[#018470] ${active ? 'text-[#018470] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-[#05A287]' : 'text-[#4A5F5A]'}`}>
                  {group.label}<ChevronDown size={15} aria-hidden="true" />
                </button>
                {expanded && <div className="absolute left-0 top-full z-50 mt-2 min-w-[190px] rounded-xl border border-[#DCE8E5] bg-white p-1.5 shadow-xl">
                  {group.items.map(item => <button key={item.id} type="button" onClick={() => select(item.id)} className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition hover:bg-[#E3F4F0] ${activeTab === item.id ? 'bg-[#E3F4F0] text-[#015E4F]' : 'text-[#0F2A25]'}`}>{item.label}</button>)}
                </div>}
              </div>;
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <PWAInstallButton />
          <span aria-label="Notifikasi" title="Notifikasi" className="hidden h-10 w-10 items-center justify-center rounded-full text-[#4A5F5A] md:flex"><Bell size={19} aria-hidden="true" /></span>
          <div ref={profileRef} className="relative">
            <button type="button" aria-haspopup="true" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-full border border-[#DCE8E5] bg-white py-1 pl-1 pr-2.5 text-left transition hover:bg-[#F3F8F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#05A287]">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#E3F4F0] text-xs font-extrabold text-[#015E4F]">{initials || <UserCircle2 size={20} />}</span>
              <span className="hidden max-w-[150px] leading-tight xl:block"><strong className="block truncate text-xs font-bold text-[#0F2A25]">{name}</strong><small className="mt-0.5 block text-[10px] text-[#4A5F5A]">{role}</small></span>
              <ChevronDown size={14} className="hidden text-[#4A5F5A] xl:block" aria-hidden="true" />
            </button>
            {profileOpen && <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[#DCE8E5] bg-white p-2 shadow-xl">
              <div className="border-b border-[#DCE8E5] px-3 py-2 xl:hidden"><strong className="block truncate text-sm text-[#0F2A25]">{name}</strong><small className="text-xs text-[#4A5F5A]">{role}</small></div>
              {canManageSettings && <button type="button" onClick={() => { select('settings'); setProfileOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#0F2A25] hover:bg-[#E3F4F0]"><Settings size={17} aria-hidden="true" />Pengaturan</button>}
              <button type="button" onClick={() => { setProfileOpen(false); void logout(); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#9B2C2C] hover:bg-red-50"><LogOut size={17} aria-hidden="true" />Keluar</button>
            </div>}
          </div>
        </div>
      </div>
      <div className="border-t border-[#DCE8E5] px-3 py-1.5 lg:hidden">
        <nav aria-label="Navigasi utama seluler" className="flex items-center gap-1 overflow-x-auto">
          <button type="button" onClick={() => select('dashboard')} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold ${activeTab === 'dashboard' ? 'bg-[#E3F4F0] text-[#015E4F]' : 'text-[#4A5F5A]'}`}>Beranda</button>
          {groups.flatMap(group => group.items).map(item => <button key={item.id} type="button" onClick={() => select(item.id)} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold ${activeTab === item.id ? 'bg-[#E3F4F0] text-[#015E4F]' : 'text-[#4A5F5A]'}`}>{item.label}</button>)}
        </nav>
      </div>
    </header>
  );
};
