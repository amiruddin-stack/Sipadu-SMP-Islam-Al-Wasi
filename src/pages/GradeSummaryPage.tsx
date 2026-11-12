import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export const GradeSummaryPage: React.FC = () => {
  const { students, classes, subjects, assessments, settings } = useData();

  const [selectedClass, setSelectedClass] = useState<string>('VII-A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.status === 'Aktif'
  );

  // Relevant assessments for selected class
  const classAssessments = assessments.filter((a) => {
    const matchClass = a.className === selectedClass;
    const matchSubject = selectedSubject === 'Semua' || a.subject === selectedSubject;
    return matchClass && matchSubject;
  });

  // Calculate final ledger for each student
  const studentSummaries = classStudents.map((std) => {
    const scoresForStd: { type: string; subject: string; score: number }[] = [];

    classAssessments.forEach((asm) => {
      if (asm.scores[std.id]) {
        scoresForStd.push({
          type: asm.assessmentType,
          subject: asm.subject,
          score: asm.scores[std.id].score,
        });
      }
    });

    const totalScore = scoresForStd.reduce((acc, curr) => acc + curr.score, 0);
    const avg =
      scoresForStd.length > 0
        ? Math.round((totalScore / scoresForStd.length) * 10) / 10
        : 80;

    let predicate = 'B';
    if (avg >= 90) predicate = 'A';
    else if (avg >= 80) predicate = 'B';
    else if (avg >= 75) predicate = 'C';
    else predicate = 'D';

    return {
      student: std,
      scoresList: scoresForStd,
      average: avg,
      predicate,
      isTuntas: avg >= 75,
    };
  });

  const filteredSummaries = studentSummaries.filter((item) =>
    item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.student.nis.includes(searchQuery)
  );

  // Class aggregates
  const classAvgs = studentSummaries.map((s) => s.average);
  const overallAvg =
    classAvgs.length > 0
      ? Math.round((classAvgs.reduce((a, b) => a + b, 0) / classAvgs.length) * 10) / 10
      : 80;
  const highestScore = classAvgs.length > 0 ? Math.max(...classAvgs) : 80;
  const lowestScore = classAvgs.length > 0 ? Math.min(...classAvgs) : 80;
  const tuntasCount = studentSummaries.filter((s) => s.isTuntas).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Nilai Rata-Rata', 'Predikat', 'Status KKM'];
    const rows = filteredSummaries.map((item, idx) => [
      idx + 1,
      item.student.nis,
      `"${item.student.name}"`,
      item.student.className,
      item.average,
      item.predicate,
      item.isTuntas ? 'Tuntas' : 'Remedial',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`Buku Leger Rekap Nilai Kelas ${selectedClass} - ${settings.schoolName}`]
        .concat([headers.join(',')])
        .concat(rows.map((e) => e.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_${selectedClass}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Buku Leger Rekap Nilai Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Kompilasi nilai tugas, ulangan harian, PTS, dan PAS semester aktif
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              
              <span className="hidden sm:inline">Cetak Leger</span>
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
            >
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
            >
              <option value="Semua">Semua Mata Pelajaran</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Cari Nama Siswa</label>
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
            />
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-400">Rata-Rata Kelas</span>
          <p className="text-xl font-bold text-[#076B3A] mt-0.5">{overallAvg}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-bg-[#E3F7EC] border border-border-[#B7E8CD] text-center">
          <span className="text-[11px] font-semibold text-#076B3A">Tuntas KKM</span>
          <p className="text-xl font-bold text-#076B3A mt-0.5">
            {tuntasCount} / {classStudents.length} Siswa
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
          <span className="text-[11px] font-semibold text-blue-800">Nilai Tertinggi</span>
          <p className="text-xl font-bold text-blue-950 mt-0.5">{highestScore}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-500">Nilai Terendah</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{lowestScore}</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Rekapitulasi Nilai Siswa — Kelas {selectedClass}
          </h3>
          <span className="text-xs text-slate-500">
            Tahun Ajaran {settings.activeAcademicYear} {settings.activeSemester}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Lengkap Siswa</th>
                <th className="py-3 px-4 w-24 text-center">L/P</th>
                <th className="py-3 px-4 min-w-[140px] text-center">Rata-Rata Nilai</th>
                <th className="py-3 px-4 w-24 text-center">Predikat</th>
                <th className="py-3 px-4 w-28 text-center">Keterangan</th>
                <th className="py-3 px-4 min-w-[180px]">Visualisasi Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map((item, idx) => (
                <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-center font-medium text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{item.student.nis}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.student.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.student.gender === 'L'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}
                    >
                      {item.student.gender}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-sm text-slate-900">
                    {item.average}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${
                        item.predicate === 'A'
                          ? 'bg-bg-[#E3F7EC] text-#076B3A'
                          : item.predicate === 'B'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.predicate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.isTuntas
                          ? 'bg-bg-[#E3F7EC] text-#076B3A border border-border-[#B7E8CD]'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {item.isTuntas ? 'Tuntas KKM' : 'Remedial'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.average >= 90
                            ? 'bg-[#076B3A]'
                            : item.average >= 75
                            ? 'bg-#0B8F4D'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, item.average)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
