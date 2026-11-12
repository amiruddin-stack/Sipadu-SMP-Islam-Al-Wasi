import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  embedded?: boolean;
}

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
      if (academicRef.current && !academicRef.current.contains(target) && !academicMenuRef.current?.contains(target)) {
        setAcademicOpen(false);
      }
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
    `relative flex min-h-11 shrink-0 items-center px-2.5 md:px-3 text-sm font-semibold transition-colors ${
      activeTab === tab
        ? 'text-[#0B8F4D] font-bold'
        : 'text-slate-700 hover:text-[#0B8F4D]'
    }`;

  const navigate = (tab: NavTab) => {
    onNavigate(tab);
    setAcademicOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className={embedded ? "relative z-[9999] w-full bg-transparent" : "sticky top-0 z-[9999] w-full border-b border-[#E3F7EC] bg-white/95 backdrop-blur-sm text-slate-800 shadow-xs"}>
      <div className="mx-auto flex min-h-[60px] max-w-[1240px] items-center justify-between gap-3 px-4 md:min-h-[64px] md:px-6">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E3F7EC] bg-white text-[#0B8F4D] shadow-sm md:hidden"
          aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <button
          onClick={() => navigate('dashboard')}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-sm font-extrabold tracking-tight text-slate-900 uppercase focus:outline-none md:static md:translate-x-0 md:text-left md:text-base"
          aria-label="SMP ISLAM AL-WASI' - Beranda"
        >
          SMP ISLAM AL-WASI'
        </button>

        <nav
          aria-label="Navigasi utama"
          className="hidden h-[64px] min-w-0 flex-1 flex-nowrap items-center justify-start md:justify-center gap-1 overflow-x-auto whitespace-nowrap pl-4 [scrollbar-width:none] [-ms-overflow-style:none] md:flex"
        >
          <button onClick={() => navigate('dashboard')} className={navClass('dashboard')}>
            Beranda
          </button>
          <button onClick={() => navigate('settings')} className={navClass('settings')}>
            Profil
          </button>
          <button onClick={() => navigate('classes')} className={navClass('classes')}>
            Kelas
          </button>
          <button onClick={() => navigate('subjects')} className={navClass('subjects')}>
            Mapel
          </button>

          <div ref={academicRef} className="relative shrink-0">
            <button
              onClick={() => {
                const rect = academicRef.current?.getBoundingClientRect();
                if (rect) {
                  setAcademicPosition({
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
                    top: rect.bottom + 8,
                  });
                }
                setAcademicOpen((v) => !v);
              }}
              aria-expanded={academicOpen}
              className={`flex min-h-11 items-center gap-1 px-2.5 md:px-3 text-sm font-semibold transition-colors hover:text-[#0B8F4D] ${
                ['attendance', 'journal', 'assessment', 'grades'].includes(activeTab)
                  ? 'text-[#0B8F4D] font-bold'
                  : 'text-slate-700'
              }`}
            >
              Akademik
            </button>
          </div>

          <button onClick={() => navigate('ils')} className={navClass('ils')}>
            <span>ILS</span>
            <span className="ml-1 text-[10px] font-semibold text-[#0B8F4D]">icon</span>
          </button>
          <button onClick={() => navigate('counseling')} className={navClass('counseling')}>
            BK
          </button>
          <button onClick={() => navigate('exams')} className={navClass('exams')}>
            Ujian
          </button>
          <button onClick={() => navigate('reports')} className={navClass('reports')}>
            Laporan
          </button>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!embedded && <PWAInstallButton />}
          {firebaseUser && !firebaseUser.isAnonymous && currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-44 truncate text-right text-xs font-semibold text-slate-600 sm:block">
                {currentUser.displayName}
                <span className="block text-[10px] font-normal text-slate-400">{currentUser.role === 'super_admin' ? 'Admin Utama' : currentUser.email}</span>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void loginWithGoogle()}
              disabled={loading}
              className="rounded-xl bg-[#0B8F4D] px-3 py-2 text-xs font-bold text-white hover:bg-[#076B3A] disabled:opacity-60"
            >
              {loading ? 'Memeriksa…' : 'Login Google Sekolah'}
            </button>
          )}
        </div>
      </div>

      {mobileMenuOpen && createPortal(
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 2147483647, isolation: 'isolate' }}
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="bg-slate-950/45"
            style={{ position: 'fixed', inset: 0, zIndex: 2147483646, width: '100%', height: '100%', border: 0 }}
          />
          <aside
            className="flex flex-col overflow-y-auto bg-white p-5 shadow-2xl"
            style={{ position: 'fixed', left: 0, top: 0, zIndex: 2147483647, height: '100dvh', width: 'min(82vw, 320px)', maxWidth: 320, overscrollBehavior: 'contain' }}
          >
            <div className="mb-6 flex items-center justify-between border-b border-[#E3F7EC] pb-4">
              <div className="flex items-center gap-3">
                <img src={`${import.meta.env.BASE_URL}logo-alwasi.png`} alt="Logo SMP Islam Al-Wasi" className="h-10 w-10 object-contain" />
                <div><p className="text-sm font-extrabold text-slate-900">SIMPATIK</p><p className="text-[10px] font-medium text-slate-500">SMP ISLAM AL-WASI</p></div>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-500" aria-label="Tutup menu"><X size={21} /></button>
            </div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Menu utama</p>
            <div className="space-y-1">
              {([['dashboard','Beranda'],['settings','Profil'],['classes','Kelas'],['subjects','Mapel'],['attendance','Presensi Siswa'],['journal','Jurnal Pembelajaran'],['assessment','Input Nilai Kelas'],['grades','Rekap Nilai'],['ils','ILS'],['counseling','BK'],['exams','Ujian'],['reports','Laporan'],['behavior','Perilaku Siswa'],['master','Master Data']] as [NavTab,string][]).map(([tab,label]) => (
                <button key={tab} type="button" onClick={() => navigate(tab)} className={`flex w-full items-center rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${activeTab === tab ? "bg-[#E3F7EC] text-[#0B8F4D]" : "text-slate-700 hover:bg-slate-50"}`}>{label}</button>
              ))}
            </div>
            <div className="mt-auto border-t border-[#E3F7EC] pt-4">
              {currentUser?.displayName && <p className="truncate text-xs font-semibold text-slate-500">{currentUser.displayName}</p>}
              <p className="mt-1 text-[10px] text-slate-400">Qurani, Ramah Anak dan Berkarakter</p>
            </div>
          </aside>
        </div>,
        document.body
      )}

      {academicOpen && (
        <div
          ref={academicMenuRef}
          style={{ left: academicPosition.left, top: academicPosition.top }}
          className="fixed z-[70] w-56 rounded-2xl border border-[#E3F7EC] bg-white p-2 text-slate-700 shadow-xl"
        >
          {([
            ['attendance', 'Presensi Siswa'],
            ['journal', 'Jurnal Pembelajaran'],
            ['assessment', 'Input Nilai Kelas'],
            ['grades', 'Rekap Nilai'],
          ] as [NavTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => navigate(tab)}
              className={`block w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition hover:bg-[#E3F7EC] ${
                activeTab === tab ? 'bg-[#E3F7EC] font-bold text-[#076B3A]' : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
