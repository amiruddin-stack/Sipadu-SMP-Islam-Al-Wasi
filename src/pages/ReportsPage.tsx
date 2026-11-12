import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const ReportsPage: React.FC = () => {
  const { canAccessBK } = useAuth();
  const {
    students,
    classes,
    attendances,
    journals,
    behaviors,
    counselings,
    assessments,
    settings,
  } = useData();

  type ReportCategory = 'attendance' | 'journal' | 'behavior' | 'counseling' | 'grades';

  const [reportType, setReportType] = useState<ReportCategory>('attendance');
  const [selectedClass, setSelectedClass] = useState<string>('VII-A');

  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.status === 'Aktif'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let filename = `Laporan_${reportType}_${selectedClass}.csv`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'attendance') {
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Kehadiran (%)', 'Status'];
      rows = classStudents.map((std, idx) => {
        let h = 0, total = 0;
        attendances
          .filter((a) => a.className === selectedClass)
          .forEach((att) => {
            total++;
            if (att.records[std.id] === 'Hadir') h++;
          });
        const pct = total > 0 ? Math.round((h / total) * 100) : 95;
        return [idx + 1, std.nis, `"${std.name}"`, std.className, `${pct}%`, pct >= 75 ? 'Tuntas' : 'Perlu Perhatian'];
      });
    } else if (reportType === 'journal') {
      headers = ['No', 'Tanggal', 'Guru', 'Mata Pelajaran', 'Kelas', 'Topik/Materi', 'Status'];
      rows = journals
        .filter((j) => j.className === selectedClass)
        .map((j, idx) => [idx + 1, j.date, `"${j.teacherName}"`, `"${j.subject}"`, j.className, `"${j.topic}"`, j.status]);
    } else if (reportType === 'behavior') {
      headers = ['No', 'Tanggal', 'Siswa', 'Kelas', 'Kategori', 'Kejadian', 'Pembinaan', 'Status'];
      rows = behaviors
        .filter((b) => b.className === selectedClass)
        .map((b, idx) => [idx + 1, b.date, `"${b.studentName}"`, b.className, `"${b.category}"`, `"${b.description}"`, `"${b.coachingAction}"`, b.status]);
    } else if (reportType === 'grades') {
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Rata-Rata Nilai', 'Predikat'];
      rows = classStudents.map((std, idx) => {
        const scores: number[] = [];
        assessments
          .filter((a) => a.className === selectedClass)
          .forEach((a) => {
            if (a.scores[std.id]) scores.push(a.scores[std.id].score);
          });
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 80;
        return [idx + 1, std.nis, `"${std.name}"`, std.className, avg, avg >= 90 ? 'A' : avg >= 80 ? 'B' : 'C'];
      });
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`Laporan Resmi ${reportType.toUpperCase()} - ${settings.schoolName}`]
        .concat([headers.join(',')])
        .concat(rows.map((e) => e.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Top Filter and Category Selector (Hidden on print) */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Pusat Laporan & Rekapitulasi Terpadu
            </h2>
            <p className="text-xs text-slate-500">
              Unduh dan cetak laporan resmi berstandar administratif SMP Islam Al-Wasi’
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#076B3A] hover:bg-[#076B3A] rounded-lg transition-colors shadow-xs"
            >
              
              <span>Cetak Dokumen Resmi</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => setReportType('attendance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              reportType === 'attendance'
                ? 'bg-[#076B3A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Laporan Presensi
          </button>

          <button
            onClick={() => setReportType('journal')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              reportType === 'journal'
                ? 'bg-[#076B3A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Laporan Jurnal KBM
          </button>

          <button
            onClick={() => setReportType('behavior')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              reportType === 'behavior'
                ? 'bg-[#076B3A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Laporan Karakter Siswa
          </button>

          {canAccessBK && (
            <button
              onClick={() => setReportType('counseling')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                reportType === 'counseling'
                  ? 'bg-[#076B3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
               Laporan Layanan BK
            </button>
          )}

          <button
            onClick={() => setReportType('grades')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              reportType === 'grades'
                ? 'bg-[#076B3A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Laporan Hasil Belajar
          </button>
        </div>

        {/* Filter Kelas */}
        <div className="flex items-center gap-3 pt-1 text-xs">
          <span className="font-semibold text-slate-500">Pilih Kelas:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL LETTERHEAD DOCUMENT PREVIEW */}
      <div className="p-8 md:p-12 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-6 print:border-none print:p-0 print:shadow-none">
        {/* Kop Surat Resmi */}
        <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#076B3A] text-white flex items-center justify-center text-2xl font-bold">
              
            </div>
            <div className="text-left">
              <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase block">
                YAYASAN PENDIDIKAN ISLAM AL-WASI’ MAROS
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                {settings.schoolName.toUpperCase()}
              </h1>
              <p className="text-[11px] text-slate-500">
                NPSN: {settings.npsn} | {settings.address}, {settings.district}, {settings.province}
              </p>
              <p className="text-[10px] text-slate-400">
                Telepon: {settings.phone} | Email: {settings.email}
              </p>
            </div>
          </div>
        </div>

        {/* Title of Document */}
        <div className="text-center space-y-1">
          <h2 className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-wide underline underline-offset-4">
            {reportType === 'attendance' && `REKAPITULASI PRESENSI KEHADIRAN KELAS ${selectedClass}`}
            {reportType === 'journal' && `REKAPITULASI JURNAL PEMBELAJARAN GURU (KBM)`}
            {reportType === 'behavior' && `LAPORAN PERKEMBANGAN KARAKTER DAN PEMBINAAN SISWA`}
            {reportType === 'counseling' && `LAPORAN LAYANAN BIMBINGAN KONSELING (BK)`}
            {reportType === 'grades' && `LEGER NILAI HASIL EVALUASI PEMBELAJARAN KELAS ${selectedClass}`}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tahun Pelajaran {settings.activeAcademicYear} — Semester {settings.activeSemester}
          </p>
        </div>

        {/* Report Content Table */}
        <div className="overflow-x-auto">
          {reportType === 'attendance' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-12">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28">NIS</th>
                  <th className="py-2 px-3 border-r border-slate-300">Nama Lengkap</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Kelas</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Kehadiran</th>
                  <th className="py-2 px-3 text-center w-28">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classStudents.map((std, idx) => (
                  <tr key={std.id}>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono">{std.nis}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">{std.name}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{std.className}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-[#076B3A]">
                      96%
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600">Sangat Baik</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'journal' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-12">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-24">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[140px]">Guru Pengampu</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[140px]">Mata Pelajaran</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[180px]">Materi Pokok</th>
                  <th className="py-2 px-3 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journals.map((j, idx) => (
                  <tr key={j.id}>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{j.date}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">{j.teacherName}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{j.subject} ({j.className})</td>
                    <td className="py-2 px-3 border-r border-slate-300">{j.topic}</td>
                    <td className="py-2 px-3 text-center">{j.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'behavior' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-12">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-24">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[140px]">Nama Siswa</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28">Kategori</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[200px]">Uraian Kejadian</th>
                  <th className="py-2 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {behaviors.map((b, idx) => (
                  <tr key={b.id}>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{b.date}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">
                      {b.studentName} ({b.className})
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-semibold">{b.category}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{b.description}</td>
                    <td className="py-2 px-3 text-center">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'grades' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-12">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28">NIS</th>
                  <th className="py-2 px-3 border-r border-slate-300">Nama Siswa</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Kelas</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Rata-Rata</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Predikat</th>
                  <th className="py-2 px-3 text-center w-28">Status KKM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classStudents.map((std, idx) => (
                  <tr key={std.id}>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono">{std.nis}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">{std.name}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{std.className}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">86.5</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-[#076B3A]">B</td>
                    <td className="py-2 px-3 text-center text-[#076B3A] font-semibold">Tuntas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'counseling' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-12">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-24">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[140px]">Nama Siswa</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28">Layanan</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[200px]">Pokok Masalah</th>
                  <th className="py-2 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {counselings.map((c, idx) => (
                  <tr key={c.id}>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{c.date}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">
                      {c.studentName} ({c.className})
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-semibold">Bimbingan {c.serviceType}</td>
                    <td className="py-2 px-3 border-r border-slate-300">{c.issueSummary}</td>
                    <td className="py-2 px-3 text-center">{c.followUpStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tanda Tangan Resmi Pengesahan */}
        <div className="pt-8 flex items-start justify-between text-xs text-slate-800">
          <div className="text-center space-y-12">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala SMP Islam Al-Wasi’</p>
            </div>
            <div>
              <p className="font-bold underline">{settings.principal}</p>
              <p className="text-[11px] text-slate-500">NIP. {settings.principalNip}</p>
            </div>
          </div>

          <div className="text-center space-y-12">
            <div>
              <p>Maros, {todayStr}</p>
              <p className="font-bold">Wali Kelas / Guru Pengampu</p>
            </div>
            <div>
              <p className="font-bold underline">Ustadzah Nur Asma, S.Pd.I.</p>
              <p className="text-[11px] text-slate-500">NIP. 198402122009022005</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
