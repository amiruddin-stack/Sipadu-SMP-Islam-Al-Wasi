import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  kepala_sekolah: 'Kepala Sekolah',
  operator: 'Operator',
  guru: 'Guru Mapel',
  wali_kelas: 'Wali Kelas',
  guru_bk: 'Guru BK',
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, switchRole, loginWithGoogle, logout, firebaseUser } = useAuth();
  const [academicOpen, setAcademicOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const academicRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (academicRef.current && !academicRef.current.contains(event.target as Node)) setAcademicOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAcademicOpen(false);
        setProfileOpen(false);
        setRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const navClass = (tab: NavTab) =>
    `relative flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold transition-colors hover:text-[#078A78] ${activeTab === tab ? 'text-[#078A78] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-[#078A78]' : 'text-slate-600'}`;

  const navigate = (tab: NavTab) => {
    onNavigate(tab);
    setAcademicOpen(false);
    setProfileOpen(false);
  };

  const roleOptions: { role: UserRole; label: string }[] = [
    { role: 'super_admin', label: 'Super Admin' },
    { role: 'kepala_sekolah', label: 'Kepala Sekolah' },
    { role: 'operator', label: 'Operator Sekolah' },
    { role: 'guru', label: 'Guru Mapel' },
    { role: 'wali_kelas', label: 'Wali Kelas' },
    { role: 'guru_bk', label: 'Guru BK' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="mx-auto flex min-h-[68px] w-full flex-nowrap items-center gap-3 overflow-hidden px-3 md:px-5">
        <button onClick={() => navigate('dashboard')} className="flex shrink-0 items-center gap-2.5 rounded-lg text-left" aria-label="SIMPATIK - Beranda">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><img src="/Helmi%20hawari_20261111_083840_0000.png" alt="Logo SMP Islam Al-Wasi’" className="h-full w-full object-contain" /></span>
          <span className="whitespace-nowrap text-base font-extrabold tracking-wide text-slate-800 md:text-lg">SIMPATIK</span>
        </button>

        <nav aria-label="Navigasi utama" className="ml-1 flex h-[68px] min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:thin] [overscroll-behavior-x:contain]">
          <button onClick={() => navigate('dashboard')} className={navClass('dashboard')}>Beranda</button>

          <div ref={profileRef} className="relative shrink-0">
            <button onClick={() => { setProfileOpen(v => !v); setAcademicOpen(false); }} aria-expanded={profileOpen} className={navClass('settings')}>Profil</button>
            {profileOpen && <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-bold">{currentUser?.displayName || firebaseUser?.displayName || 'Pengguna'}</p>
                <p className="text-xs text-slate-500">{currentUser ? roleLabels[currentUser.role] : 'Belum masuk'}</p>
              </div>
              <button onClick={() => navigate('settings')} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-emerald-50">Pengaturan Profil</button>
              {firebaseUser ? <button onClick={logout} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50">Keluar</button> : <button onClick={loginWithGoogle} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-emerald-50">Masuk dengan Google</button>}
              <div className="mt-1 border-t border-slate-100 px-3 pt-2">
                <button onClick={() => setRoleOpen(v => !v)} className="text-xs font-semibold text-slate-500">Ganti peran demo {roleOpen ? '−' : '+'}</button>
                {roleOpen && <div className="mt-1 space-y-1">{roleOptions.map(option => <button key={option.role} onClick={() => { switchRole(option.role); setRoleOpen(false); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-emerald-50">{option.label}</button>)}</div>}
              </div>
            </div>}
          </div>

          <div ref={academicRef} className="relative shrink-0">
            <button onClick={() => { setAcademicOpen(v => !v); setProfileOpen(false); }} aria-expanded={academicOpen} className={`flex min-h-11 items-center gap-1 px-3 text-sm font-semibold transition-colors hover:text-[#078A78] ${(['attendance','journal','assessment','grades'].includes(activeTab) ? 'text-[#078A78]' : 'text-slate-600')}`}>
              Akademik <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${academicOpen ? 'rotate-180' : ''}`} fill="currentColor"><path d="m5 7 5 5 5-5H5Z" /></svg>
            </button>
            {academicOpen && <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xl">
              {([['attendance','Presensi'],['journal','Jurnal'],['assessment','Penilaian'],['grades','Guru Wali']] as [NavTab,string][]).map(([tab,label]) => <button key={tab} onClick={() => navigate(tab)} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-emerald-50 ${activeTab === tab ? 'bg-emerald-50 font-bold text-emerald-800' : ''}`}>{label}</button>)}
            </div>}
          </div>

          <button onClick={() => navigate('ils')} className={navClass('ils')}>ILS <span className="ml-1 rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Soon</span></button>
          <button onClick={() => navigate('counseling')} className={navClass('counseling')}>BK</button>
          <button onClick={() => navigate('exams')} className={navClass('exams')}>Ujian</button>
          <button onClick={() => navigate('reports')} className={navClass('reports')}>Laporan</button>
        </nav>

        <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
          <PWAInstallButton />
          <span className="hidden max-w-36 truncate text-right text-xs font-semibold xl:block">{currentUser?.displayName || firebaseUser?.displayName || ''}</span>
        </div>
      </div>
    </header>
  );
};
