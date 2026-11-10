import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { NavTab } from '../components/layout/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { students, teachers, attendances, journals, behaviors, settings } = useData();

  // Calculate today's attendance stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter((a) => a.date === todayStr);

  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalRecorded = 0;

  todayAttendances.forEach((att) => {
    Object.values(att.records).forEach((status) => {
      totalRecorded++;
      if (status === 'Hadir') totalHadir++;
      else if (status === 'Sakit') totalSakit++;
      else if (status === 'Izin') totalIzin++;
      else if (status === 'Alpa') totalAlpa++;
    });
  });

  // If no attendance recorded yet for today, show baseline from latest available date
  const latestAttendance = attendances[0];
  if (totalRecorded === 0 && latestAttendance) {
    Object.values(latestAttendance.records).forEach((status) => {
      totalRecorded++;
      if (status === 'Hadir') totalHadir++;
      else if (status === 'Sakit') totalSakit++;
      else if (status === 'Izin') totalIzin++;
      else if (status === 'Alpa') totalAlpa++;
    });
  }

  const attendancePercent =
    totalRecorded > 0 ? Math.round((totalHadir / totalRecorded) * 100) : 95;

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const activeStudentsCount = students.filter((s) => s.status === 'Aktif').length;
  const activeTeachersCount = teachers.filter((t) => t.status === 'Aktif').length;
  const recentJournals = journals.slice(0, 4);
  const recentBehaviors = behaviors.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">👋</span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                Ahlan wa Sahlan, {currentUser?.displayName || 'Pengguna'}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-500">
              Selamat datang di portal akademik <strong>{settings.schoolName}</strong>. Hari ini adalah{' '}
              <span className="font-semibold text-slate-700">{todayFormatted}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-xl transition-colors shadow-xs"
            >
              <span>📋</span>
              <span>Input Presensi</span>
            </button>
            <button
              onClick={() => onNavigate('journal')}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <span>📖</span>
              <span>Tulis Jurnal</span>
            </button>
            <button
              onClick={() => onNavigate('assessment')}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <span>📝</span>
              <span>Input Nilai</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Siswa Aktif */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Siswa
            </span>
            <span className="text-xl">🎓</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{activeStudentsCount}</div>
          <div className="mt-1 flex items-center text-xs text-emerald-700 font-medium">
            <span>6 Kelas Aktif (VII - IX)</span>
          </div>
        </div>

        {/* Guru & Staf */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Guru & Pendidik
            </span>
            <span className="text-xl">👨‍🏫</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{activeTeachersCount}</div>
          <div className="mt-1 flex items-center text-xs text-slate-500">
            <span>12 Mata Pelajaran</span>
          </div>
        </div>

        {/* Persentase Kehadiran */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kehadiran Hari Ini
            </span>
            <span className="text-xl">✅</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F5132]">{attendancePercent}%</div>
          <div className="mt-1 text-xs text-slate-500">
            {totalHadir} dari {totalRecorded || activeStudentsCount} siswa hadir
          </div>
        </div>

        {/* Jurnal KBM */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Jurnal Pembelajaran
            </span>
            <span className="text-xl">📚</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{journals.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            {journals.filter((j) => j.status === 'Selesai').length} sesi tuntas terlaksana
          </div>
        </div>
      </div>

      {/* Middle Section: Attendance Breakdown & Academic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown Card */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📋</span> Status Kehadiran Terkini
              </h3>
              <span className="text-xs text-slate-400">Kelas VII-A</span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span>🟢</span> Hadir
                  </span>
                  <span className="font-bold text-slate-800">{totalHadir} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0F5132] rounded-full"
                    style={{
                      width: `${totalRecorded ? (totalHadir / totalRecorded) * 100 : 85}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-blue-700 flex items-center gap-1">
                    <span>🔵</span> Sakit
                  </span>
                  <span className="font-bold text-slate-800">{totalSakit} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${totalRecorded ? (totalSakit / totalRecorded) * 100 : 5}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-amber-700 flex items-center gap-1">
                    <span>🟡</span> Izin
                  </span>
                  <span className="font-bold text-slate-800">{totalIzin} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${totalRecorded ? (totalIzin / totalRecorded) * 100 : 5}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-rose-700 flex items-center gap-1">
                    <span>🔴</span> Alpa
                  </span>
                  <span className="font-bold text-slate-800">{totalAlpa} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${totalRecorded ? (totalAlpa / totalRecorded) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="mt-5 w-full py-2 px-3 text-xs font-semibold text-[#0F5132] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
          >
            Lihat Rekap Absensi Lengkap →
          </button>
        </div>

        {/* Recent Teacher Journals */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📖</span> Aktivitas Jurnal KBM Terbaru
            </h3>
            <button
              onClick={() => onNavigate('journal')}
              className="text-xs font-semibold text-[#0F5132] hover:underline"
            >
              Semua Jurnal →
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {recentJournals.map((j) => (
              <div key={j.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">{j.subject}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                      {j.className}
                    </span>
                    <span className="text-[10px] text-slate-400">{j.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    <strong>Topik:</strong> {j.topic}
                  </p>
                  <p className="text-[11px] text-slate-400">Oleh: {j.teacherName}</p>
                </div>
                <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Behavior & Guidance Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Behavior & Character Records */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🌟</span> Catatan Karakter & Perilaku Siswa
            </h3>
            <button
              onClick={() => onNavigate('behavior')}
              className="text-xs font-semibold text-[#0F5132] hover:underline"
            >
              Kelola Perilaku →
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {recentBehaviors.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-bold text-slate-900">
                    {b.studentName} ({b.className})
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      b.category === 'Perilaku Positif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.category === 'Kedisiplinan'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{b.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Pembinaan: {b.coachingAction}</span>
                  <span className="font-medium text-slate-500">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Calendar & Information Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🏫</span> Informasi Akademik & Kalender Efektif
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              TA {settings.activeAcademicYear}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <span className="text-xl">📌</span>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-950">
                  Target Penilaian Tengah Semester (PTS)
                </span>
                <p className="text-xs text-emerald-800">
                  Batas akhir input nilai capaian pembelajaran semester ganjil pada pekan ke-12 KBM.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">Hari Efektif Semester</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {settings.effectiveDays} Hari
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">KKM Rata-Rata</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">75 (Tuntas)</p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Kepala Sekolah: <strong>{settings.principal}</strong></span>
              <span className="text-emerald-800 font-medium">Maros, Sul-Sel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
