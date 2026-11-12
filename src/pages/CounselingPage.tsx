import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CounselingRecord, CounselingServiceType } from '../types';

export const CounselingPage: React.FC = () => {
  const { currentUser, canAccessBK } = useAuth();
  const { counselings, students, addCounseling, updateCounseling, deleteCounseling } = useData();

  const [selectedService, setSelectedService] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<CounselingRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    className: 'VII-A',
    date: new Date().toISOString().split('T')[0],
    serviceType: 'Pribadi' as CounselingServiceType,
    issueSummary: '',
    actionPlan: '',
    followUpStatus: 'Proses' as 'Proses' | 'Selesai' | 'Rujukan',
    notes: '',
  });

  const serviceTypes: CounselingServiceType[] = ['Pribadi', 'Sosial', 'Belajar', 'Karir'];

  // Access Control Guard
  if (!canAccessBK) {
    return (
      <div className="p-8 md:p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto">
          
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            Akses Terbatas: Dokumen Rahasia BK
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sesuai kode etik konseling dan regulasi perlindungan data siswa, modul Bimbingan Konseling (BK) hanya dapat diakses oleh <strong>Guru BK</strong>, <strong>Kepala Sekolah</strong>, dan <strong>Super Admin</strong>.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 text-slate-600 text-xs border border-slate-100">
          Peran Anda saat ini: <strong className="text-slate-800">{currentUser?.role}</strong>. Untuk menguji modul ini, gunakan menu ganti peran di sudut kanan atas.
        </div>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingRecord(null);
    const firstStudent = students[0];
    setFormData({
      studentId: firstStudent ? firstStudent.id : '',
      studentName: firstStudent ? firstStudent.name : '',
      className: firstStudent ? firstStudent.className : 'VII-A',
      date: new Date().toISOString().split('T')[0],
      serviceType: 'Pribadi',
      issueSummary: '',
      actionPlan: '',
      followUpStatus: 'Proses',
      notes: '',
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
    if (!formData.issueSummary.trim()) {
      alert('Pokok permasalahan wajib diisi.');
      return;
    }

    if (editingRecord) {
      await updateCounseling(editingRecord.id, {
        ...formData,
      });
    } else {
      await addCounseling({
        ...formData,
        counselorId: currentUser?.uid || 'bk',
        counselorName: currentUser?.displayName || 'Guru BK SMP Islam Al-Wasi’',
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan konseling rahasia ini?')) {
      await deleteCounseling(id);
    }
  };

  const filteredCounselings = counselings.filter((c) => {
    const matchService = selectedService === 'Semua' || c.serviceType === selectedService;
    const matchSearch =
      searchQuery === '' ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issueSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.actionPlan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchService && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Notice */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Layanan Bimbingan Konseling (BK)
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                 Konfidensial
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dokumentasi layanan bimbingan pribadi, sosial, belajar, dan karir
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#076B3A] hover:bg-[#076B3A] rounded-lg transition-colors shadow-xs"
          >
            
            <span>Tambah Sesi Konseling</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Bidang Layanan BK
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
            >
              <option value="Semua">Semua Bidang Layanan</option>
              {serviceTypes.map((st) => (
                <option key={st} value={st}>
                  Bimbingan {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Cari Kasus / Nama Siswa
            </label>
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

      {/* Counseling Cards */}
      <div className="space-y-3">
        {filteredCounselings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400">
            
            <p className="text-sm font-medium">Belum ada sesi konseling yang tercatat.</p>
          </div>
        ) : (
          filteredCounselings.map((item) => (
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
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    Bimbingan {item.serviceType}
                  </span>
                  <span className="text-xs text-slate-400"> {item.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.followUpStatus === 'Selesai'
                        ? 'bg-[#E3F7EC] text-[#076B3A] border border-[#B7E8CD]'
                        : item.followUpStatus === 'Rujukan'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Status: {item.followUpStatus}
                  </span>
                  <button
                    onClick={() => {
                      setEditingRecord(item);
                      setFormData({
                        studentId: item.studentId,
                        studentName: item.studentName,
                        className: item.className,
                        date: item.date,
                        serviceType: item.serviceType,
                        issueSummary: item.issueSummary,
                        actionPlan: item.actionPlan,
                        followUpStatus: item.followUpStatus,
                        notes: item.notes || '',
                      });
                      setShowAddModal(true);
                    }}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    title="Edit Sesi"
                  >
                    
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                    title="Hapus"
                  >
                    
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Pokok Permasalahan:</span>
                  <p className="text-slate-800 font-medium mt-0.5">{item.issueSummary}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-0.5">
                    Rencana Aksi / Solusi Terpilih:
                  </span>
                  <p className="text-slate-700">{item.actionPlan}</p>
                </div>

                {item.notes && (
                  <div className="text-slate-500 italic">
                    Catatan konselor: {item.notes}
                  </div>
                )}
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-50">
                <span>Konselor Pembina: <strong>{item.counselorName}</strong></span>
                <span>Arsip BK Terenkripsi</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Konseling */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingRecord ? 'Edit Sesi Konseling' : 'Catat Layanan Bimbingan Konseling'}
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                >
                  {students.map((std) => (
                    <option key={std.id} value={std.id}>
                      {std.name} (Kelas {std.className})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Tanggal Sesi
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Bidang Layanan
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceType: e.target.value as CounselingServiceType })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                  >
                    {serviceTypes.map((st) => (
                      <option key={st} value={st}>
                        Bimbingan {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Pokok Permasalahan
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Uraikan kondisi atau keluhan yang dialami siswa..."
                  value={formData.issueSummary}
                  onChange={(e) => setFormData({ ...formData, issueSummary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Rencana Aksi & Langkah Tindak Lanjut
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Kesepakatan pembinaan atau target perubahan yang ditetapkan..."
                  value={formData.actionPlan}
                  onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Status Penanganan
                  </label>
                  <select
                    value={formData.followUpStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        followUpStatus: e.target.value as 'Proses' | 'Selesai' | 'Rujukan',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                  >
                    <option value="Proses">Sedang Berproses</option>
                    <option value="Selesai">Tuntas / Selesai</option>
                    <option value="Rujukan">Rujukan Ahli / Medis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Catatan Rahasia Konselor
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan observasi..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#076B3A]"
                  />
                </div>
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
                  className="px-5 py-2 text-xs font-bold text-white bg-[#076B3A] hover:bg-[#076B3A] rounded-xl shadow-xs"
                >
                  Simpan Dokumen BK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
