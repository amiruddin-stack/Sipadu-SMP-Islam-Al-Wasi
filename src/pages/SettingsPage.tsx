import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const SettingsPage: React.FC = () => {
  const { currentUser, canManageSettings, switchRole } = useAuth();
  const { settings, updateSettings, isSyncing, refreshData } = useData();
  const isOnline = useOnlineStatus();
  const { isInstalled, isInstallable, install } = usePWAInstall();

  const [formData, setFormData] = useState({
    schoolName: settings.schoolName,
    npsn: settings.npsn,
    address: settings.address,
    district: settings.district,
    province: settings.province,
    phone: settings.phone,
    email: settings.email,
    principal: settings.principal,
    principalNip: settings.principalNip,
    activeAcademicYear: settings.activeAcademicYear,
    activeSemester: settings.activeSemester,
    effectiveDays: settings.effectiveDays,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">
          Pengaturan Sistem & Kesiapan Aplikasi
        </h2>
        <p className="text-xs text-slate-500">
          Konfigurasi identitas lembaga, sinkronisasi cloud, PWA, dan build APK Android Capacitor
        </p>
      </div>

      {/* Grid: School Info & Android Capacitor Ready */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PWA & Capacitor Mobile Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               Status PWA & Build APK Android
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F7EC] text-[#076B3A]">
              Siap Kompilasi
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium">Web App Manifest & Service Worker</span>
              <span className="font-bold text-[#0B8F4D]">✓ Aktif</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium">Capacitor Android Core</span>
              <span className="font-bold text-[#0B8F4D]">✓ Terpasang</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium">Status PWA di Perangkat</span>
              <span className="font-semibold text-slate-800">
                {isInstalled ? 'Terpasang sebagai PWA' : isInstallable ? 'Siap Diinstal' : 'Berjalan di Browser'}
              </span>
            </div>

            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="w-full mt-2 py-2 text-xs font-bold text-white bg-[#076B3A] hover:bg-[#076B3A] rounded-xl shadow-xs text-center"
              >
                 Pasang Aplikasi ke Layar Utama Sekarang
              </button>
            )}
          </div>

          {/* Android APK Build Instructions Box */}
          <div className="p-3.5 rounded-xl bg-[#E3F7EC]/60 border border-bg-[#E3F7EC] space-y-2">
            <span className="text-xs font-bold text-[#076B3A] block">
               Cara Build APK Android dengan Capacitor:
            </span>
            <div className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-lg border border-[#B7E8CD]/50 space-y-1">
              <p># 1. Bangun aset web produksi</p>
              <p className="font-bold text-[#076B3A]">npm run build</p>
              <p># 2. Sinkronkan aset ke platform Android</p>
              <p className="font-bold text-[#076B3A]">npx cap add android</p>
              <p className="font-bold text-[#076B3A]">npx cap sync</p>
              <p># 3. Buka Android Studio & Build APK</p>
              <p className="font-bold text-[#076B3A]">npx cap open android</p>
            </div>
            <p className="text-[11px] text-[#076B3A]">
              Nama aplikasi Android telah diperbarui menjadi SIMPATIK. ID paket Android tetap dipertahankan agar pembaruan tidak dianggap sebagai aplikasi baru.
            </p>
          </div>
        </div>

        {/* Cloud Firestore & Offline Cache Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               Sinkronisasi Database Firestore
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOnline ? 'bg-[#E3F7EC] text-[#076B3A]' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isOnline ? 'Terhubung Online' : 'Lokal Offline'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-medium text-slate-400 block text-[10px]">Database ID:</span>
              <p className="font-mono text-[11px] text-slate-900 break-all">
                ai-studio-sipadusmpislamal-6c38b5b8-a9ba-49da-8bdd-3764317c8ef1
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-medium text-slate-400 block text-[10px]">Project ID:</span>
              <p className="font-mono text-[11px] text-slate-900">gen-lang-client-0150709110</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-medium">Keamanan Rules Firestore:</span>
              <span className="font-bold text-[#0B8F4D]">✓ 8 Pilar ABAC Terpasang</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isSyncing}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
            >
              {isSyncing ? 'Menyinkronkan...' : ' Segarkan Cache Lokal'}
            </button>
          </div>
        </div>
      </div>

      {/* Profil Sekolah Form */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
             Profil Identitas SMP Islam Al-Wasi’
          </h3>
          <span className="text-xs text-slate-400">Maros, Sulawesi Selatan</span>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-[#E3F7EC] border border-[#B7E8CD] text-[#076B3A] text-xs font-semibold flex items-center gap-2">
             Profil sekolah dan tahun akademik berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">NPSN</label>
              <input
                type="text"
                required
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Alamat Lengkap</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Kabupaten/Kota</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Email Resmi</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                required
                value={formData.principal}
                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={formData.principalNip}
                onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Tahun Ajaran Aktif</label>
              <input
                type="text"
                required
                value={formData.activeAcademicYear}
                onChange={(e) => setFormData({ ...formData, activeAcademicYear: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Semester Aktif</label>
              <select
                value={formData.activeSemester}
                onChange={(e) =>
                  setFormData({ ...formData, activeSemester: e.target.value as 'Ganjil' | 'Genap' })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Hari Efektif Belajar</label>
              <input
                type="number"
                min="50"
                max="200"
                value={formData.effectiveDays}
                onChange={(e) => setFormData({ ...formData, effectiveDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
              />
            </div>
          </div>

          {canManageSettings && (
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#076B3A] hover:bg-[#076B3A] rounded-xl transition-colors shadow-xs"
              >
                 Simpan Konfigurasi Sekolah
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
