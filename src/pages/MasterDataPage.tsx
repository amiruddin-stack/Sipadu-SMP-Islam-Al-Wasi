import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Student } from '../types';

export const MasterDataPage: React.FC = () => {
  const { canManageMasterData } = useAuth();
  const { students, teachers, classes, subjects, addStudent, updateStudent, deleteStudent } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'siswa' | 'guru' | 'akademik'>('siswa');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Student Form
  const [studentForm, setStudentForm] = useState({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    className: 'VII-A',
    status: 'Aktif' as 'Aktif' | 'Lulus' | 'Mutasi',
    parentPhone: '',
    parentName: '',
  });

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      nis: `26${Math.floor(1000 + Math.random() * 9000)}`,
      nisn: `012${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: '',
      gender: 'L',
      className: 'VII-A',
      status: 'Aktif',
      parentPhone: '',
      parentName: '',
    });
    setShowStudentModal(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      className: student.className,
      status: student.status,
      parentPhone: student.parentPhone || '',
      parentName: student.parentName || '',
    });
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) {
      alert('Nama lengkap siswa wajib diisi.');
      return;
    }

    if (editingStudent) {
      await updateStudent(editingStudent.id, studentForm);
    } else {
      await addStudent(studentForm);
    }
    setShowStudentModal(false);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus data siswa ${name}? Data tidak dapat dikembalikan.`)) {
      await deleteStudent(id);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'Semua' || s.className === selectedClass;
    const matchSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      s.nisn.includes(searchQuery);
    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Segmented Sub-Tab Switcher */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('siswa')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'siswa'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Data Siswa ({students.length})
          </button>
          <button
            onClick={() => setActiveSubTab('guru')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'guru'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Data Guru ({teachers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('akademik')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeSubTab === 'akademik'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
             Kelas & Mapel
          </button>
        </div>

        {activeSubTab === 'siswa' && canManageMasterData && (
          <button
            onClick={handleOpenAddStudent}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors shadow-xs"
          >
            
            <span>Tambah Siswa</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: DATA SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-500 whitespace-nowrap">Filter Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
              >
                <option value="Semua">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari nama, NIS, atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
              />
            </div>
          </div>

          {/* Student Table */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-24">NIS</th>
                    <th className="py-3 px-4 w-28">NISN</th>
                    <th className="py-3 px-4 min-w-[180px]">Nama Siswa</th>
                    <th className="py-3 px-4 w-16 text-center">L/P</th>
                    <th className="py-3 px-4 w-20 text-center">Kelas</th>
                    <th className="py-3 px-4 w-24 text-center">Status</th>
                    <th className="py-3 px-4 min-w-[160px]">Kontak Orang Tua</th>
                    {canManageMasterData && <th className="py-3 px-4 w-20 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{std.nis}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{std.nisn}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{std.name}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            std.gender === 'L'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}
                        >
                          {std.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {std.className}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{std.parentPhone || '-'}</div>
                        {std.parentName && (
                          <div className="text-[10px] text-slate-400">Wali: {std.parentName}</div>
                        )}
                      </td>
                      {canManageMasterData && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditStudent(std)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Edit Siswa"
                            >
                              
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(std.id, std.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Hapus Siswa"
                            >
                              
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DATA GURU & PEGAWAI */}
      {activeSubTab === 'guru' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Guru & Tenaga Kependidikan SMP Islam Al-Wasi’
            </h3>
            <p className="text-xs text-slate-500">
              Daftar pendidik aktif beserta jabatan akademik dan penugasan kelas binaan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-36">NIP</th>
                  <th className="py-3 px-4 min-w-[200px]">Nama Lengkap</th>
                  <th className="py-3 px-4 min-w-[180px]">Mata Pelajaran / Tugas</th>
                  <th className="py-3 px-4 w-28 text-center">Wali Kelas</th>
                  <th className="py-3 px-4 min-w-[180px]">Email Institusi</th>
                  <th className="py-3 px-4 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((tch, idx) => (
                  <tr key={tch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{tch.nip}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{tch.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{tch.subject}</td>
                    <td className="py-3 px-4 text-center">
                      {tch.assignedClass ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                          Kelas {tch.assignedClass}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{tch.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {tch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DATA KELAS & MAPEL */}
      {activeSubTab === 'akademik' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Classes */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               Daftar Rombongan Belajar (Kelas)
            </h3>
            <p className="text-xs text-slate-500">
              6 rombongan belajar aktif pada tahun ajaran 2026/2027
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {classes.map((c) => (
                <div
                  key={c}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-800">Kelas {c}</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {students.filter((s) => s.className === c).length} Siswa
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               Kurikulum & Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-500">
              Integrasi kurikulum nasional dan kekhasan pendidikan Islam Al-Wasi’
            </p>
            <div className="space-y-1.5 pt-2">
              {subjects.map((s, idx) => (
                <div
                  key={s}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800">
                    {idx + 1}. {s}
                  </span>
                  <span className="text-[10px] text-slate-400">KKM: 75</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Siswa */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setShowStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">NIS</label>
                  <input
                    type="text"
                    required
                    value={studentForm.nis}
                    onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">NISN</label>
                  <input
                    type="text"
                    required
                    value={studentForm.nisn}
                    onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap siswa..."
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jenis Kelamin</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kelas</label>
                  <select
                    value={studentForm.className}
                    onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={studentForm.status}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        status: e.target.value as 'Aktif' | 'Lulus' | 'Mutasi',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Mutasi">Mutasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No HP Orang Tua</label>
                  <input
                    type="text"
                    placeholder="081234567xxx"
                    value={studentForm.parentPhone}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, parentPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    placeholder="Nama wali..."
                    value={studentForm.parentName}
                    onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-xl shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
