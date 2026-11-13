import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from './Sidebar';
import { Menu, X, ChevronDown, Home, UserRound, GraduationCap, BookOpen, ClipboardList, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  embedded?: boolean;
}

const academicItems: [NavTab, string][] = [
  ['attendance', 'Presensi Siswa'],
  ['journal', 'Jurnal Pembelajaran'],
  ['assessment', 'Input Nilai Kelas'],
  ['grades', 'Rekap Nilai'],
  ['exams', 'Ujian'],
  ['counseling', 'Bimbingan Konseling'],
  ['behavior', 'Perilaku Siswa'],
  ['reports', 'Laporan'],
  ['master', 'Data Guru & Siswa'],
];

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate, embedded = false }) => {
  const { currentUser, firebaseUser, loading, loginWithGoogle, logout } = useAuth();
  const [academicOpen, setAcademicOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const academicRef = useRef<HTMLDivElement>(null);
  const academicMenuRef = useRef<HTMLDivElement>(null);
  const [academicPosition, setAcademicPosition] = useState({ left: 0, top: 76 });

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (academicRef.current && !academicRef.current.contains(target) && !academicMenuRef.current?.contains(target)) setAcademicOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setAcademicOpen(false); setMobileMenuOpen(false); }
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const navigate = (tab: NavTab) => {
    onNavigate(tab);
    setAcademicOpen(false);
    setMobileMenuOpen(false);
  };
  const navClass = (tab: NavTab) => `flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-[#E3F7EC] text-[#0B8F4D]' : 'text-slate-700 hover:bg-[#F2FAF5] hover:text-[#0B8F4D]'}`;
  const isAcademicActive = academicItems.some(([tab]) => tab === activeTab);

  return (
    <header className={embedded ? 'relative z-[9999] w-full bg-transparent' : 'sticky top-0 z-[9999] w-full border-b border-[#D5EADB] bg-white/95 text-slate-800 shadow-xs backdrop-blur-sm'}>
      <div className="mx-auto flex min-h-[68px] max-w-[1240px] items-center gap-3 px-4 md:px-6">
        <button type="button" onClick={() => navigate('dashboard')} className="flex min-w-0 shrink-0 items-center gap-2.5 text-left" aria-label="Beranda SMP Islam Al-Wasi">
          <img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo sekolah" className="h-10 w-10 shrink-0 object-contain" />
          <span className="max-w-[150px] text-[11px] font-extrabold leading-tight tracking-tight text-slate-900 sm:max-w-none sm:text-xs md:text-sm">SMP ISLAM AL-WASI’</span>
        </button>

        <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          <button onClick={() => navigate('dashboard')} className={navClass('dashboard')}><Home size={15}/>Beranda</button>
          <button onClick={() => navigate('settings')} className={navClass('settings')}><UserRound size={15}/>Profil</button>
          <button onClick={() => navigate('classes')} className={navClass('classes')}><GraduationCap size={16}/>Kelas</button>
          <button onClick={() => navigate('subjects')} className={navClass('subjects')}><BookOpen size={15}/>Mapel</button>
          <div ref={academicRef} className="relative shrink-0">
            <button onClick={() => {
              const rect = academicRef.current?.getBoundingClientRect();
              if (rect) setAcademicPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 250)), top: rect.bottom + 8 });
              setAcademicOpen(value => !value);
            }} aria-expanded={academicOpen} className={`flex min-h-11 items-center gap-1 rounded-xl px-2.5 text-sm font-semibold transition-colors ${isAcademicActive || academicOpen ? 'bg-[#E3F7EC] text-[#0B8F4D]' : 'text-slate-700 hover:bg-[#F2FAF5] hover:text-[#0B8F4D]'}`}>
              <ClipboardList size={15}/>Akademik<ChevronDown size={14}/>
            </button>
          </div>
          <button onClick={() => navigate('ils')} className={navClass('ils')}>ILS</button>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden max-w-[180px] text-right sm:block">
            <p className="truncate text-xs font-bold text-slate-700">{currentUser?.displayName || 'Akun'}</p>
            <p className="truncate text-[10px] text-slate-400">{currentUser?.role === 'super_admin' ? 'Admin Utama' : currentUser?.email || ''}</p>
          </div>
          {firebaseUser && !firebaseUser.isAnonymous && currentUser ? (
            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><LogOut size={14}/>Keluar</button>
          ) : (
            <button type="button" onClick={() => void loginWithGoogle()} disabled={loading} className="rounded-xl bg-[#0B8F4D] px-3 py-2 text-xs font-bold text-white hover:bg-[#076B3A] disabled:opacity-60">{loading ? 'Memeriksa…' : 'Login'}</button>
          )}
          <button type="button" onClick={() => setMobileMenuOpen(value => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D5EADB] bg-white text-[#0B8F4D] lg:hidden" aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
        </div>
      </div>

      {academicOpen && (
        <div ref={academicMenuRef} style={{ left: academicPosition.left, top: academicPosition.top }} className="fixed z-[10000] w-60 rounded-2xl border border-[#D5EADB] bg-white p-2 text-slate-700 shadow-xl">
          {academicItems.map(([tab, label]) => <button key={tab} onClick={() => navigate(tab)} className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition hover:bg-[#E3F7EC] ${activeTab === tab ? 'bg-[#E3F7EC] font-bold text-[#076B3A]' : ''}`}>{label}</button>)}
        </div>
      )}

      {mobileMenuOpen && createPortal(
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 2147483647, isolation: 'isolate' }}>
          <button type="button" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)} className="bg-slate-950/45" style={{ position: 'fixed', inset: 0, zIndex: 2147483646, width: '100%', height: '100%', border: 0 }}/>
          <aside className="flex flex-col overflow-y-auto bg-white p-5 shadow-2xl" style={{ position: 'fixed', left: 0, top: 0, zIndex: 2147483647, height: '100dvh', width: 'min(86vw, 340px)', maxWidth: 340, overscrollBehavior: 'contain' }}>
            <div className="mb-5 flex items-center justify-between border-b border-[#E3F7EC] pb-4">
              <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo sekolah" className="h-10 w-10 object-contain"/><div><p className="text-sm font-extrabold text-slate-900">SMP ISLAM AL-WASI’</p><p className="text-[10px] text-slate-500">SIMPATIK</p></div></div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-500" aria-label="Tutup menu"><X size={21}/></button>
            </div>
            <div className="space-y-1">
              <button onClick={() => navigate('dashboard')} className={navClass('dashboard') + ' w-full'}><Home size={16}/>Beranda</button>
              <button onClick={() => navigate('settings')} className={navClass('settings') + ' w-full'}><UserRound size={16}/>Profil</button>
              <button onClick={() => navigate('classes')} className={navClass('classes') + ' w-full'}><GraduationCap size={16}/>Kelas</button>
              <button onClick={() => navigate('subjects')} className={navClass('subjects') + ' w-full'}><BookOpen size={16}/>Mapel</button>
              <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Akademik</p>
              {academicItems.map(([tab, label]) => <button key={tab} onClick={() => navigate(tab)} className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-[#E3F7EC] ${activeTab === tab ? 'bg-[#E3F7EC] text-[#076B3A]' : 'text-slate-700'}`}>{label}</button>)}
              <button onClick={() => navigate('ils')} className={navClass('ils') + ' w-full mt-2'}>ILS</button>
            </div>
            <div className="mt-auto border-t border-[#E3F7EC] pt-4">
              <p className="truncate text-xs font-bold text-slate-700">{currentUser?.displayName || 'Akun'}</p>
              <p className="truncate text-[10px] text-slate-400">{currentUser?.email || ''}</p>
              {firebaseUser && !firebaseUser.isAnonymous && currentUser && <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600"><LogOut size={14}/>Keluar</button>}
              <p className="mt-3 text-[10px] text-slate-400">Qurani, Ramah Anak dan Berkarakter</p>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </header>
  );
};
