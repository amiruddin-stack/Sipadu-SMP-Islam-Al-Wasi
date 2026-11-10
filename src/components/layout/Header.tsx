import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileSidebar: () => void;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string; emoji: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan operasional dan statistik akademik', emoji: '📊' },
  attendance: { title: 'Absensi Digital', subtitle: 'Pencatatan dan rekap kehadiran harian kelas', emoji: '📋' },
  journal: { title: 'Jurnal Guru', subtitle: 'Dokumentasi kegiatan belajar mengajar (KBM)', emoji: '📖' },
  behavior: { title: 'Perilaku Siswa', subtitle: 'Pencatatan perkembangan karakter dan pembinaan', emoji: '🌟' },
  counseling: { title: 'Bimbingan Konseling (BK)', subtitle: 'Dokumentasi layanan konseling dan tindak lanjut', emoji: '🤝' },
  assessment: { title: 'Penilaian Kelas', subtitle: 'Input nilai tugas, ulangan harian, PTS, dan PAS', emoji: '📝' },
  grades: { title: 'Rekap Nilai', subtitle: 'Buku leger nilai dan capaian kompetensi siswa', emoji: '📈' },
  master: { title: 'Data Master', subtitle: 'Pengelolaan data siswa, guru, kelas, dan mapel', emoji: '🗂️' },
  reports: { title: 'Pusat Laporan', subtitle: 'Cetak dan ekspor laporan terpadu ke PDF/Excel', emoji: '📑' },
  settings: { title: 'Pengaturan', subtitle: 'Profil sekolah, hak akses, dan panduan APK', emoji: '⚙️' },
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenMobileSidebar }) => {
  const { currentUser, switchRole, loginWithGoogle, logout, firebaseUser } = useAuth();
  const { settings } = useData();
  const isOnline = useOnlineStatus();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roleOptions: { role: UserRole; label: string; desc: string }[] = [
    { role: 'super_admin', label: 'Super Admin', desc: 'Akses penuh seluruh sistem' },
    { role: 'kepala_sekolah', label: 'Kepala Sekolah', desc: 'Pemantauan & laporan pimpinan' },
    { role: 'operator', label: 'Operator Sekolah', desc: 'Pengelolaan data master & administrasi' },
    { role: 'guru', label: 'Guru Mapel', desc: 'Pengisian jurnal, absensi & nilai' },
    { role: 'wali_kelas', label: 'Wali Kelas VII-A', desc: 'Bina kelas, absensi & rekap nilai' },
    { role: 'guru_bk', label: 'Guru BK', desc: 'Layanan bimbingan & konseling' },
  ];

  const currentTabInfo = tabTitles[activeTab] || tabTitles.dashboard;

  const roleBadgeColors: Record<UserRole, string> = {
    super_admin: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    kepala_sekolah: 'bg-blue-100 text-blue-900 border-blue-300',
    operator: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    guru: 'bg-teal-100 text-teal-900 border-teal-300',
    wali_kelas: 'bg-amber-100 text-amber-900 border-amber-300',
    guru_bk: 'bg-rose-100 text-rose-900 border-rose-300',
  };

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    kepala_sekolah: 'Kepala Sekolah',
    operator: 'Operator',
    guru: 'Guru Mapel',
    wali_kelas: 'Wali Kelas',
    guru_bk: 'Guru BK',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Mobile hamburger & Current page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden flex items-center justify-center w-9 h-9 text-slate-700 hover:bg-slate-100 rounded-lg"
            title="Buka Menu"
          >
            <span className="text-xl">☰</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl">{currentTabInfo.emoji}</span>
              <h1 className="text-base md:text-lg font-bold text-slate-900">
                {currentTabInfo.title}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {settings.activeAcademicYear} {settings.activeSemester}
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-500">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions, Role Selector, PWA Install & User */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Online/Offline Status */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-medium ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={isOnline ? 'Terhubung dengan Firestore' : 'Mode Offline Lokal'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'
              }`}
            />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Role Switcher (RBAC Evaluation) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                currentUser ? roleBadgeColors[currentUser.role] : 'bg-slate-100 text-slate-700'
              }`}
              title="Ganti Peran Hak Akses (RBAC)"
            >
              <span>🎭</span>
              <span className="hidden sm:inline">Peran:</span>
              <span>{currentUser ? roleLabels[currentUser.role] : 'Admin'}</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showRoleMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRoleMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-1">
                  <div className="px-2.5 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Pilih Hak Akses (RBAC)
                  </div>
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.role}
                      onClick={() => {
                        switchRole(opt.role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                        currentUser?.role === opt.role
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{opt.label}</span>
                        {currentUser?.role === opt.role && <span className="text-emerald-700 font-bold">✓</span>}
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Google Auth or Current User Menu */}
          {firebaseUser ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Keluar / Logout"
            >
              <span>🚪</span>
              <span className="hidden md:inline">Keluar</span>
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
              title="Masuk dengan Akun Google Sekolah"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">Google Auth</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
