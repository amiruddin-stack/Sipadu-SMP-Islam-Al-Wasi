import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, firebaseUser } = useAuth();
  const [academicOpen, setAcademicOpen] = useState(false);
  const academicRef = useRef<HTMLDivElement>(null);
  const academicMenuRef = useRef<HTMLDivElement>(null);
  const [academicPosition, setAcademicPosition] = useState({ left: 0, top: 76 });

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (academicRef.current && !academicRef.current.contains(target) && !academicMenuRef.current?.contains(target)) setAcademicOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAcademicOpen(false);
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
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="mx-auto flex min-h-[68px] w-full flex-nowrap items-center gap-3 overflow-hidden px-3 md:px-5">
        <button onClick={() => navigate('dashboard')} className="flex shrink-0 items-center gap-2.5 rounded-lg text-left" aria-label="SIMPATIK - Beranda">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><img src={`${import.meta.env.BASE_URL}Helmi%20hawari_20261111_083840_0000.png?v=2`} alt="Logo SMP Islam Al-Wasi’" className="h-full w-full object-contain" /></span>
          <span className="whitespace-nowrap bg-gradient-to-r from-[#078A78] via-[#0E9F83] to-[#25B56F] bg-clip-text text-base font-extrabold tracking-wide text-transparent md:text-lg">SIMPATIK</span>
        </button>

        <nav aria-label="Navigasi utama" className="ml-1 flex h-[68px] min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:thin] [overscroll-behavior-x:contain]">
          <button onClick={() => navigate('dashboard')} className={navClass('dashboard')}>Beranda</button>
          <button onClick={() => navigate('settings')} className={navClass('settings')}>Profil</button>

          <div ref={academicRef} className="relative shrink-0">
            <button onClick={() => { const rect = academicRef.current?.getBoundingClientRect(); if (rect) setAcademicPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)), top: rect.bottom + 8 }); setAcademicOpen(v => !v); }} aria-expanded={academicOpen} className={`flex min-h-11 items-center gap-1 px-3 text-sm font-semibold transition-colors hover:text-[#078A78] ${(['attendance','journal','assessment','grades'].includes(activeTab) ? 'text-[#078A78]' : 'text-slate-600')}`}>
              Akademik <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${academicOpen ? 'rotate-180' : ''}`} fill="currentColor"><path d="m5 7 5 5 5-5H5Z" /></svg>
            </button>


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
      {academicOpen && <div ref={academicMenuRef} style={{ left: academicPosition.left, top: academicPosition.top }} className="fixed z-[70] w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xl">
        {([['attendance','Presensi'],['journal','Jurnal'],['assessment','Penilaian'],['grades','Guru Wali']] as [NavTab,string][]).map(([tab,label]) => <button key={tab} onClick={() => navigate(tab)} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-emerald-50 ${activeTab === tab ? 'bg-emerald-50 font-bold text-emerald-800' : ''}`}>{label}</button>)}
      </div>}
    </header>
  );
};
