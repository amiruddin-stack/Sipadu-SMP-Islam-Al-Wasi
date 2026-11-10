import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Journal } from '../types';

export const JournalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { journals, classes, subjects, addJournal, updateJournal, deleteJournal } = useData();

  const [filterClass, setFilterClass] = useState<string>('Semua');
  const [filterSubject, setFilterSubject] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: subjects[0] || 'Pendidikan Agama Islam (PAI)',
    className: 'VII-A',
    lessonHours: 'Jam 1-2 (07:30 - 09:00)',
    topic: '',
    activity: '',
    notes: '',
    status: 'Selesai' as 'Selesai' | 'Berlangsung',
  });

  const handleOpenAdd = () => {
    setEditingJournal(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      subject: currentUser?.subject || subjects[0] || 'Pendidikan Agama Islam (PAI)',
      className: currentUser?.assignedClass || 'VII-A',
      lessonHours: 'Jam 1-2 (07:30 - 09:00)',
      topic: '',
      activity: '',
      notes: '',
      status: 'Selesai',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (journal: Journal) => {
    setEditingJournal(journal);
    setFormData({
      date: journal.date,
      subject: journal.subject,
      className: journal.className,
      lessonHours: journal.lessonHours,
      topic: journal.topic,
      activity: journal.activity,
      notes: journal.notes || '',
      status: journal.status,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      alert('Materi pembelajaran / topik wajib diisi.');
      return;
    }

    if (editingJournal) {
      await updateJournal(editingJournal.id, {
        ...formData,
      });
    } else {
      await addJournal({
        ...formData,
        teacherId: currentUser?.uid || 'user',
        teacherName: currentUser?.displayName || 'Guru SMP Islam Al-Wasi’',
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan jurnal ini?')) {
      await deleteJournal(id);
    }
  };

  // Filter & Search
  const filteredJournals = journals.filter((j) => {
    const matchClass = filterClass === 'Semua' || j.className === filterClass;
    const matchSubject = filterSubject === 'Semua' || j.subject === filterSubject;
    const matchSearch =
      searchQuery === '' ||
      j.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.activity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSubject && matchSearch;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Tanggal', 'Guru', 'Mata Pelajaran', 'Kelas', 'Jam', 'Topik/Materi', 'Kegiatan', 'Status'];
    const rows = filteredJournals.map((j, idx) => [
      idx + 1,
      j.date,
      `"${j.teacherName}"`,
      `"${j.subject}"`,
      j.className,
      `"${j.lessonHours}"`,
      `"${j.topic.replace(/"/g, '""')}"`,
      `"${j.activity.replace(/"/g, '""')}"`,
      j.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Rekap Jurnal Pembelajaran Guru - SMP Islam Al-Wasi’']
        .concat([headers.join(',')])
        .concat(rows.map((e) => e.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jurnal_Guru_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Jurnal Pembelajaran Guru (KBM)
            </h2>
            <p className="text-xs text-slate-500">
              Dokumentasi pelaksanaan kurikulum dan materi pembelajaran
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors shadow-xs"
            >
              <span>➕</span>
              <span>Tambah Jurnal</span>
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Filter Kelas
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
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
              Filter Mata Pelajaran
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            >
              <option value="Semua">Semua Mapel</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Pencarian Cepat
            </label>
            <input
              type="text"
              placeholder="Cari materi, guru, kegiatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
            />
          </div>
        </div>
      </div>

      {/* Journal List Cards */}
      <div className="space-y-3">
        {filteredJournals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400">
            <span className="text-3xl block mb-2">📖</span>
            <p className="text-sm font-medium">Belum ada jurnal KBM yang sesuai filter.</p>
          </div>
        ) : (
          filteredJournals.map((journal) => (
            <div
              key={journal.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    {journal.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {journal.className}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    📅 {journal.date}
                  </span>
                  <span className="text-xs text-slate-400">
                    ⏰ {journal.lessonHours}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {journal.status}
                  </span>
                  <button
                    onClick={() => handleOpenEdit(journal)}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    title="Edit Jurnal"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(journal.id)}
                    className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                    title="Hapus Jurnal"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Materi Pokok:</span>
                  <p className="text-slate-900 font-medium mt-0.5">{journal.topic}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">Uraian Kegiatan:</span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">{journal.activity}</p>
                </div>

                {journal.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                    <span className="font-semibold text-slate-500 block mb-0.5">
                      Catatan / Refleksi:
                    </span>
                    {journal.notes}
                  </div>
                )}
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-50">
                <span>Guru Pengampu: <strong>{journal.teacherName}</strong></span>
                <span>Tercatat di SIPADU</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Tambah / Edit Jurnal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingJournal ? 'Edit Jurnal Pembelajaran' : 'Tambah Jurnal KBM Baru'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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
                    Kelas
                  </label>
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Jam Pelajaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jam 1-2 (07:30 - 09:00)"
                    value={formData.lessonHours}
                    onChange={(e) => setFormData({ ...formData, lessonHours: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Status Pelaksanaan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'Selesai' | 'Berlangsung' })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Berlangsung">Sedang Berlangsung</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Materi Pokok / Kompetensi Dasar
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Makharijul Huruf, Hukum Tajwid, atau Aljabar Dasar"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Uraian Kegiatan Pembelajaran
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan ringkas metode, apersepsi, latihan, dan evaluasi KBM..."
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Catatan Khusus / Hambatan / Refleksi
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan siswa yang membutuhkan bimbingan khusus atau capaian kelas..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#0F5132]"
                />
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
                  {editingJournal ? 'Simpan Perubahan' : 'Terbitkan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
