import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Assessment, AssessmentType, StudentScore } from '../types';

export const AssessmentPage: React.FC = () => {
  const { currentUser, canInputGrades } = useAuth();
  const { students, classes, subjects, assessments, saveAssessment, settings } = useData();

  const [selectedClass, setSelectedClass] = useState<string>('VII-A');
  const [selectedSubject, setSelectedSubject] = useState<string>(
    currentUser?.subject || subjects[0] || 'Pendidikan Agama Islam (PAI)'
  );
  const [selectedType, setSelectedType] = useState<AssessmentType>('Ulangan Harian 1');
  const [kkm, setKkm] = useState<number>(75);
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const assessmentTypes: AssessmentType[] = [
    'Tugas 1',
    'Tugas 2',
    'Ulangan Harian 1',
    'Ulangan Harian 2',
    'Penilaian Tengah Semester (PTS)',
    'Penilaian Akhir Semester (PAS)',
    'Praktik/Proyek',
    'Tahfidz / Keagamaan',
  ];

  // Students in selected class
  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.status === 'Aktif'
  );

  // Existing assessment match
  const existingAssessment = assessments.find(
    (a) =>
      a.className === selectedClass &&
      a.subject === selectedSubject &&
      a.assessmentType === selectedType
  );

  // Local draft scores
  const [scores, setScores] = useState<Record<string, StudentScore>>({});

  // Sync draft whenever selection changes
  React.useEffect(() => {
    if (existingAssessment) {
      setScores(existingAssessment.scores);
      setKkm(existingAssessment.kkm || 75);
      setAssessmentDate(existingAssessment.date);
    } else {
      const initial: Record<string, StudentScore> = {};
      classStudents.forEach((s) => {
        initial[s.id] = { score: 80, note: 'Tuntas mencapai kompetensi dasar' };
      });
      setScores(initial);
    }
    setSaveSuccess(false);
  }, [selectedClass, selectedSubject, selectedType, existingAssessment]);

  const handleScoreChange = (studentId: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { note: '' }),
        score: clamped,
      },
    }));
  };

  const handleNoteChange = (studentId: string, noteText: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { score: 75 }),
        note: noteText,
      },
    }));
  };

  const handleSaveBatch = async () => {
    const assessmentId = `asm-${selectedClass.toLowerCase()}-${selectedSubject
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}-${selectedType.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const newAssessment: Assessment = {
      id: assessmentId,
      academicYear: settings.activeAcademicYear,
      semester: settings.activeSemester,
      className: selectedClass,
      subject: selectedSubject,
      assessmentType: selectedType,
      teacherId: currentUser?.uid || 'user',
      teacherName: currentUser?.displayName || 'Guru Pengampu',
      date: assessmentDate,
      kkm,
      scores,
    };

    await saveAssessment(newAssessment);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getPredicate = (score: number) => {
    if (score >= 90) return { label: 'A', text: 'Sangat Baik', color: 'text-emerald-700 bg-emerald-50' };
    if (score >= 80) return { label: 'B', text: 'Baik', color: 'text-blue-700 bg-blue-50' };
    if (score >= 75) return { label: 'C', text: 'Cukup (KKM)', color: 'text-amber-700 bg-amber-50' };
    return { label: 'D', text: 'Perlu Bimbingan', color: 'text-rose-700 bg-rose-50' };
  };

  // Summary stats
  const scoreValues = classStudents.map((s) => scores[s.id]?.score ?? 0);
  const avgScore =
    scoreValues.length > 0
      ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10
      : 0;
  const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
  const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
  const tuntasCount = scoreValues.filter((s) => s >= kkm).length;

  return (
    <div className="space-y-6">
      {/* Top Configuration Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Pengelolaan & Input Penilaian Kelas
            </h2>
            <p className="text-xs text-slate-500">
              Input nilai seluruh siswa secara langsung dalam satu tabel kelas terpadu
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canInputGrades && (
              <button
                onClick={handleSaveBatch}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors shadow-xs"
              >
                
                <span>Simpan Nilai Kelas</span>
              </button>
            )}
          </div>
        </div>

        {/* Configuration Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Kelas</label>
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
            <label className="block text-slate-500 font-semibold mb-1">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Jenis Penilaian</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              {assessmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-slate-500 font-semibold mb-1">KKM</label>
              <input
                type="number"
                min="50"
                max="100"
                value={kkm}
                onChange={(e) => setKkm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#0F5132]"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-slate-500 font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-400">Rata-Rata Nilai</span>
          <p className="text-xl font-bold text-slate-900">{avgScore}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <span className="text-[11px] font-semibold text-emerald-800">Tuntas KKM (≥{kkm})</span>
          <p className="text-xl font-bold text-emerald-900">
            {tuntasCount} / {classStudents.length} Siswa
          </p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
          <span className="text-[11px] font-semibold text-blue-800">Nilai Tertinggi</span>
          <p className="text-xl font-bold text-blue-900">{maxScore}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-500">Nilai Terendah</span>
          <p className="text-xl font-bold text-slate-900">{minScore}</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
           Nilai {selectedType} untuk {selectedSubject} Kelas {selectedClass} berhasil disimpan ke Firestore!
        </div>
      )}

      {/* Batch Grading Roster Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Lembar Penilaian: {selectedSubject} ({selectedType}) — Kelas {selectedClass}
          </h3>
          <span className="text-xs text-slate-500">
            Tahun Ajaran: {settings.activeAcademicYear} {settings.activeSemester}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Lengkap Siswa</th>
                <th className="py-3 px-4 w-32 text-center">Nilai (0-100)</th>
                <th className="py-3 px-4 w-24 text-center">Predikat</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 min-w-[220px]">Deskripsi Capaian / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const currentVal = scores[std.id]?.score ?? 0;
                const currentNote = scores[std.id]?.note ?? '';
                const pred = getPredicate(currentVal);
                const isTuntas = currentVal >= kkm;

                return (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{std.nis}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{std.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentVal}
                          onChange={(e) => handleScoreChange(std.id, Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-center font-bold text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0F5132]"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${pred.color}`}
                        title={pred.text}
                      >
                        {pred.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isTuntas
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isTuntas ? 'Tuntas' : 'Remedial'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Capaian kompetensi..."
                        value={currentNote}
                        onChange={(e) => handleNoteChange(std.id, e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:bg-white focus:border-[#0F5132]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
