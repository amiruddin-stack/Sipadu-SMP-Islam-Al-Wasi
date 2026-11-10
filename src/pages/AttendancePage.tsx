import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AttendanceRecord, AttendanceStatus } from '../types';

export const AttendancePage: React.FC = () => {
  const { currentUser, canInputAttendance } = useAuth();
  const { students, classes, attendances, saveAttendance, settings } = useData();

  const [selectedClass, setSelectedClass] = useState<string>('VII-A');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Filter students for selected class
  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.status === 'Aktif'
  );

  // Existing attendance record for selected class & date
  const existingRecord = attendances.find(
    (a) => a.className === selectedClass && a.date === selectedDate
  );

  // Attendance state in local draft
  const [currentStatuses, setCurrentStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Sync state whenever class or date changes
  React.useEffect(() => {
    if (existingRecord) {
      setCurrentStatuses(existingRecord.records);
      setNotes(existingRecord.notes || {});
    } else {
      // Default all to 'Hadir' for convenient fast marking
      const initial: Record<string, AttendanceStatus> = {};
      classStudents.forEach((s) => {
        initial[s.id] = 'Hadir';
      });
      setCurrentStatuses(initial);
      setNotes({});
    }
    setSavedSuccess(false);
  }, [selectedClass, selectedDate, existingRecord]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setCurrentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [studentId]: note,
    }));
  };

  const handleSetAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = 'Hadir';
    });
    setCurrentStatuses(updated);
  };

  const handleSave = async () => {
    const recordId = `att-${selectedDate}-${selectedClass.toLowerCase()}`;
    const newRecord: AttendanceRecord = {
      id: recordId,
      date: selectedDate,
      className: selectedClass,
      academicYear: settings.activeAcademicYear,
      semester: settings.activeSemester,
      records: currentStatuses,
      notes,
      recordedBy: currentUser?.uid || 'user',
      recordedByName: currentUser?.displayName || 'Guru',
      updatedAt: new Date().toISOString(),
    };

    await saveAttendance(newRecord);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Stats calculation
  const totalStudents = classStudents.length;
  let hadirCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;

  classStudents.forEach((s) => {
    const st = currentStatuses[s.id] || 'Hadir';
    if (st === 'Hadir') hadirCount++;
    else if (st === 'Sakit') sakitCount++;
    else if (st === 'Izin') izinCount++;
    else if (st === 'Alpa') alpaCount++;
  });

  const percentage =
    totalStudents > 0 ? Math.round((hadirCount / totalStudents) * 100) : 100;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Catatan'];
    const rows = classStudents.map((s, idx) => [
      idx + 1,
      s.nis,
      `"${s.name}"`,
      s.className,
      currentStatuses[s.id] || 'Hadir',
      `"${notes[s.id] || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`Absensi Kelas ${selectedClass} - Tanggal ${selectedDate}`]
        .concat([headers.join(',')])
        .concat(rows.map((e) => e.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Absensi_${selectedClass}_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'input'
                  ? 'bg-[#0F5132] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>✍️</span> Input Presensi
            </button>
            <button
              onClick={() => setActiveTab('rekap')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'rekap'
                  ? 'bg-[#0F5132] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>📊</span> Rekap Kehadiran
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Ekspor Data ke File CSV/Excel"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Cetak Presensi Resmi"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Kelas, Tanggal, Tahun Ajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Pilih Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Tanggal Presensi
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Tahun Ajaran & Semester
            </label>
            <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium truncate">
              {settings.activeAcademicYear} - {settings.activeSemester}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-500">Total Siswa</span>
          <p className="text-lg font-bold text-slate-900">{totalStudents}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <span className="text-[11px] font-semibold text-emerald-800">Hadir</span>
          <p className="text-lg font-bold text-emerald-900">{hadirCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
          <span className="text-[11px] font-semibold text-blue-800">Sakit</span>
          <p className="text-lg font-bold text-blue-900">{sakitCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <span className="text-[11px] font-semibold text-amber-800">Izin</span>
          <p className="text-lg font-bold text-amber-900">{izinCount}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <span className="text-[11px] font-semibold text-rose-800">Alpa</span>
          <p className="text-lg font-bold text-rose-900">{alpaCount}</p>
        </div>
      </div>

      {activeTab === 'input' ? (
        /* TAB 1: INPUT PRESENSI */
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Bar within Table */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Presensi Kelas {selectedClass}
              </h3>
              <p className="text-xs text-slate-500">
                Kehadiran saat ini: <strong>{percentage}%</strong> ({hadirCount}/{totalStudents} Siswa)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSetAllPresent}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Tandai semua siswa hadir"
              >
                ✓ Setel Semua Hadir
              </button>
              {canInputAttendance && (
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors shadow-xs"
                >
                  💾 Simpan Presensi
                </button>
              )}
            </div>
          </div>

          {savedSuccess && (
            <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <span>✅</span> Presensi Kelas {selectedClass} berhasil disimpan ke Firestore!
            </div>
          )}

          {/* Student Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Siswa</th>
                  <th className="py-3 px-4 w-16 text-center">L/P</th>
                  <th className="py-3 px-4 min-w-[260px] text-center">Status Kehadiran</th>
                  <th className="py-3 px-4 min-w-[200px]">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa aktif di kelas {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student, idx) => {
                    const status = currentStatuses[student.id] || 'Hadir';
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{student.nis}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {student.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              student.gender === 'L'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {student.gender}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as AttendanceStatus[]).map(
                              (opt) => {
                                const isSelected = status === opt;
                                const buttonColors: Record<AttendanceStatus, string> = {
                                  Hadir: isSelected
                                    ? 'bg-[#0F5132] text-white border-[#0F5132]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50',
                                  Sakit: isSelected
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50',
                                  Izin: isSelected
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50',
                                  Alpa: isSelected
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50',
                                };

                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, opt)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${buttonColors[opt]}`}
                                  >
                                    {opt[0]}
                                    <span className="hidden md:inline">{opt.slice(1)}</span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Catatan surat/alasan..."
                            value={notes[student.id] || ''}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:bg-white focus:border-[#0F5132]"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: REKAP KEHADIRAN KELAS */
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Rekapitulasi Kehadiran Kelas {selectedClass}
            </h3>
            <span className="text-xs text-slate-500">
              Hari Efektif: {settings.effectiveDays} Hari
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3 text-center">Hadir</th>
                  <th className="py-2.5 px-3 text-center">Sakit</th>
                  <th className="py-2.5 px-3 text-center">Izin</th>
                  <th className="py-2.5 px-3 text-center">Alpa</th>
                  <th className="py-2.5 px-3 text-center font-bold">Persentase</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((std, idx) => {
                  // Calculate totals across all saved attendances
                  let h = 0;
                  let s = 0;
                  let i = 0;
                  let a = 0;
                  const relevantAtts = attendances.filter((att) => att.className === selectedClass);
                  relevantAtts.forEach((att) => {
                    const st = att.records[std.id];
                    if (st === 'Hadir') h++;
                    else if (st === 'Sakit') s++;
                    else if (st === 'Izin') i++;
                    else if (st === 'Alpa') a++;
                  });

                  // Add default if no records yet
                  if (relevantAtts.length === 0) {
                    h = 10;
                  }

                  const total = h + s + i + a;
                  const pct = total > 0 ? Math.round((h / total) * 100) : 100;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{std.name}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-medium">{h}</td>
                      <td className="py-2.5 px-3 text-center text-blue-700 font-medium">{s}</td>
                      <td className="py-2.5 px-3 text-center text-amber-700 font-medium">{i}</td>
                      <td className="py-2.5 px-3 text-center text-rose-700 font-medium">{a}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{pct}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            pct >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : pct >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pct >= 90 ? 'Sangat Baik' : pct >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
