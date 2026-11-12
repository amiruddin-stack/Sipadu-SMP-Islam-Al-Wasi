import React from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#eaf8f0] via-white to-[#f3faf6] px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-900/5 sm:p-10">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#087f45] text-2xl font-black tracking-tight text-white shadow-lg shadow-emerald-900/20">S</div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">SMP Islam Al-Wasi’</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">SIMPATIK</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Silakan masuk menggunakan akun Google resmi sekolah untuk melanjutkan ke aplikasi.</p>
        <button
          type="button"
          onClick={() => void loginWithGoogle()}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#087f45] px-5 py-4 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-[#066b3a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 rounded-full bg-white p-0.5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z"/>
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.65-5.94c-2.12 1.43-4.84 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"/>
          </svg>
          {loading ? 'Memeriksa sesi…' : 'Masuk dengan Google Sekolah'}
        </button>
        <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold text-emerald-900">Akun yang diizinkan</p>
          <p className="mt-1 text-xs text-emerald-800">@smpialwasi-maros.sch.id</p>
        </div>
        <p className="mt-6 text-[11px] leading-5 text-slate-400">Sesi login akan dipertahankan pada perangkat ini sampai Anda keluar dari akun.</p>
      </section>
    </main>
  );
}
