import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BehaviorCategory, BehaviorRecord } from '../types';

export const BehaviorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { behaviors, students, classes, addBehavior, updateBehavior, deleteBehavior } = useData();

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BehaviorRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    className: 'VII-A',
    date: new Date().toISOString().split('T')[0],
    category: 'Perilaku Positif' as BehaviorCategory,
    description: '',
    coachingAction: '',
    status: 'Selesai' as 'Selesai' | 'Dalam Pembinaan' | 'Perlu Perhatian',
    points: 5,
  });

  const categories: BehaviorCategory[] = [
    'Perilaku Positif',
    'Pelanggaran Tata Tertib',
    'Kedisiplinan',
    'Tanggung Jawab',
    'Interaksi Sosial',
    'Catatan Pembinaan',
  ];

  const handleOpenAdd = () => {
    setEditingRecord(null);
    const firstStudent = students[0];
    setFormData({
      studentId: firstStudent ? firstStudent.id : '',
      studentName: firstStudent ? firstStudent.name : '',
      className: firstStudent ? firstStudent.className : 'VII-A',
      date: new Date().toISOString().split('T')[0],
      category: 'Perilaku Positif',
      description: '',
      coachingAction: '',
      status: 'Selesai',
      points: 5,
    });
    setShowAddModal(true);
  };

  const handleStudentSelect = (studentId: string) => {
    const std = students.find((s) => s.id === studentId);
    if (std) {
      setFormData((prev) => ({
        ...prev,
        studentId: std.id,
        studentName: std.name,
        className: std.className,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Deskripsi kejadian wajib diisi.');
      return;
    }

    if (editingRecord) {
      await updateBehavior(editingRecord.id, {
        ...formData,
      });
    } else {
      await addBehavior({
        ...formData,
        recordedBy: currentUser?.displayName || 'Guru Pembina',
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus catatan perilaku ini?')) {
      await deleteBehavior(id);
    }
  };

  // Filter
  const filteredRecords = behaviors.filter((b) => {
    const matchCategory = selectedCategory === 'Semua' || b.category === selectedCategory;
    const matchClass = selectedClass === 'Semua' || b.className === selectedClass;
    const matchSearch =
      searchQuery === '' ||
      b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.coachingAction.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchClass && matchSearch;
  });

  // Calculate Positive vs Need Improvement
  const positiveCount = behaviors.filter((b) => b.category === 'Perilaku Positif').length;
  const needCoachingCount = behaviors.filter((b) => b.category !== 'Perilaku Positif').length;

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Perkembangan Karakter & Perilaku Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan edukatif dengan pendekatan keteladanan dan pembinaan akhlak mulia
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors shadow-xs"
          >
            <span>➕</span>
            <span>Catat Perilaku</span>
          </button>
        </div>

        {/* Filter Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Kategori Perilaku
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              <option value="Semua">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Filter Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              <option value="Semua">Semua Kelas</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Cari Nama Siswa / Uraian
            </label>
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            />
          </div>
        </div>
      </div>

      {/* Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400">Total Catatan Pembinaan</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{behaviors.length} Kejadian</p>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-semibold text-emerald-800">Perilaku Positif & Prestasi</span>
          <p className="text-xl font-bold text-emerald-950 mt-0.5">{positiveCount} Catatan</p>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-[11px] font-semibold text-amber-800">Dalam Proses Pembinaan</span>
          <p className="text-xl font-bold text-amber-950 mt-0.5">{needCoachingCount} Kasus</p>
        </div>
      </div>

      {/* Record Cards */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400">
            <span className="text-3xl block mb-2">🌟</span>
            <p className="text-sm font-medium">Tidak ada catatan perilaku yang cocok dengan filter.</p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isPositive = item.category === 'Perilaku Positif';
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {item.studentName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                      Kelas {item.className}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.category === 'Kedisiplinan'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">📅 {item.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Selesai'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={() => {
                        setEditingRecord(item);
                        setFormData({
                          studentId: item.studentId,
                          studentName: item.studentName,
                          className: item.className,
                          date: item.date,
                          category: item.category,
                          description: item.description,
                          coachingAction: item.coachingAction,
                          status: item.status,
                          points: item.points || 0,
                        });
                        setShowAddModal(true);
                      }}
                      className="p-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">Kejadian / Perilaku:</span>
                    <p className="text-slate-800 font-medium mt-0.5">{item.description}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 block mb-0.5">
                      Tindakan Pembinaan / Apresiasi:
                    </span>
                    <p className="text-slate-700">{item.coachingAction}</p>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-50">
                  <span>Guru Pencatat: <strong>{item.recordedBy}</strong></span>
                  <span>Tercatat Edukatif di SIPADU</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Catat Perilaku */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingRecord ? 'Edit Catatan Perilaku' : 'Catat Perkembangan Perilaku Siswa'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Pilih Siswa
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                >
                  {students.map((std) => (
                    <option key={std.id} value={std.id}>
                      {std.name} (Kelas {std.className} - {std.nis})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as BehaviorCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Deskripsi Perilaku / Kejadian
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan kejadian atau inisiatif positif secara objektif..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Tindakan Pembinaan / Apresiasi Edukatif
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Langkah edukatif guru (nasehat, penghargaan, komitmen perbaikan)..."
                  value={formData.coachingAction}
                  onChange={(e) => setFormData({ ...formData, coachingAction: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Status Tindak Lanjut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'Selesai' | 'Dalam Pembinaan' | 'Perlu Perhatian',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                >
                  <option value="Selesai">Selesai (Tuntas)</option>
                  <option value="Dalam Pembinaan">Dalam Pembinaan</option>
                  <option value="Perlu Perhatian">Perlu Perhatian Khusus</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-xl shadow-xs"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
