import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan operasional dan statistik akademik' },
  attendance: { title: 'Absensi Digital', subtitle: 'Pencatatan dan rekap kehadiran harian kelas' },
  journal: { title: 'Jurnal Guru', subtitle: 'Dokumentasi kegiatan belajar mengajar (KBM)' },
  behavior: { title: 'Perilaku Siswa', subtitle: 'Pencatatan perkembangan karakter dan pembinaan' },
  counseling: { title: 'Bimbingan Konseling (BK)', subtitle: 'Dokumentasi layanan konseling dan tindak lanjut' },
  assessment: { title: 'Penilaian Kelas', subtitle: 'Input nilai tugas, ulangan harian, PTS, dan PAS' },
  grades: { title: 'Rekap Nilai', subtitle: 'Buku leger nilai dan capaian kompetensi siswa' },
  master: { title: 'Data Master', subtitle: 'Pengelolaan data siswa, guru, kelas, dan mapel' },
  reports: { title: 'Pusat Laporan', subtitle: 'Cetak dan ekspor laporan terpadu ke PDF/Excel' },
  settings: { title: 'Pengaturan', subtitle: 'Profil sekolah, hak akses, dan panduan APK' },
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  const { currentUser, switchRole, loginWithGoogle, logout, firebaseUser } = useAuth();
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
  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    kepala_sekolah: 'Kepala Sekolah',
    operator: 'Operator',
    guru: 'Guru Mapel',
    wali_kelas: 'Wali Kelas',
    guru_bk: 'Guru BK',
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#0F9D8A] via-[#0D9488] to-[#0B887A] border-b border-[#0B887A]/70">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => onNavigate('dashboard')} className="shrink-0 text-sm font-extrabold tracking-wide text-white">SIMPATIK</button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-[#073B2A]">
                {currentTabInfo.title}
              </h1>
</div>
            <p className="hidden md:block lg:hidden text-xs text-white/85">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-[#073B2A]">
              {currentUser?.displayName || firebaseUser?.displayName || 'Pengguna'}
            </p>
            <p className="text-[11px] font-medium text-[#145C3F]">
              {currentUser ? roleLabels[currentUser.role] : 'Pengguna'}
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-lg border border-white/70 bg-white/90 px-4 py-2 text-xs font-semibold text-[#075B36] shadow-sm transition-colors hover:bg-white hover:text-rose-700"
            title="Keluar dari aplikasi"
          >
            Keluar
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3 lg:hidden">
          <PWAInstallButton />
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/70 bg-white/80 text-[#075B36] transition-colors"
              title="Ganti Peran Hak Akses (RBAC)"
            >
              <span className="hidden sm:inline">Peran:</span>
              <span>{currentUser ? roleLabels[currentUser.role] : 'Admin'}</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showRoleMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRoleMenu(false)} />
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
                      <span className="font-medium text-slate-900">{opt.label}</span>
                      <span className="text-[11px] text-slate-400 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {firebaseUser ? (
            <button
              onClick={logout}
              className="px-2.5 py-1.5 text-xs font-medium text-[#075B36] bg-white/80 hover:bg-white rounded-lg border border-white/70"
              title="Keluar / Logout"
            >
              <span className="hidden md:inline">Keluar</span>
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="px-3 py-1.5 text-xs font-semibold text-[#075B36] bg-white/80 hover:bg-white rounded-lg border border-white/70"
              title="Masuk dengan Akun Google Sekolah"
            >
              <span className="hidden sm:inline">Google Auth</span>
            </button>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/15 px-3 py-2 text-white md:px-6">
        {([
          ['dashboard','Dashboard'],['attendance','Presensi'],['journal','Jurnal'],['assessment','Penilaian'],['behavior','Perilaku'],['counseling','BK'],['grades','Rekap Nilai'],['master','Data Master'],['reports','Laporan'],['settings','Pengaturan']
        ] as [NavTab,string][]).map(([tab,label]) => <button key={tab} onClick={() => onNavigate(tab)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab ? 'bg-white text-[#087d79]' : 'text-white/90 hover:bg-white/15'}`}>{label}</button>)}
      </nav>
    </header>
  );
};
