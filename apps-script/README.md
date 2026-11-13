# SIMPATIK — Penilaian Otomatis Apps Script

Folder ini berisi backend penilaian otomatis yang berjalan tanpa admin membuka SIMPATIK.

## Cara kerja
1. SIMPATIK menyimpan jawaban siswa dengan status `Selesai`.
2. SIMPATIK mengirim Firebase ID token dan ID pengerjaan ke Web App.
3. Apps Script memvalidasi token melalui Firebase Authentication.
4. Apps Script memeriksa bahwa UID token sama dengan `ownerUid` pada dokumen pengerjaan.
5. Apps Script membaca paket ujian dan kunci jawaban dari Firestore melalui REST API menggunakan izin akun pemilik.
6. Nilai, total, persentase, dan waktu penilaian ditulis ke dokumen pengerjaan.

Kunci jawaban tidak dikirim ke browser siswa. Siswa tidak diberi izin menulis field nilai.

## Membuat Web App
1. Masuk ke [script.google.com](https://script.google.com) menggunakan akun Google yang memiliki akses **Owner** pada proyek Firebase SIMPATIK.
2. Buat project baru, beri nama **SIMPATIK Auto Grading**.
3. Salin isi `Code.gs` dari folder ini ke editor Apps Script.
4. Buka **Project Settings**, aktifkan **Show "appsscript.json" manifest file in editor**, lalu ganti manifest dengan isi file `appsscript.json` di folder ini.
5. Pilih fungsi `authorizeAccess`, lalu klik **Run** dan setujui izin Google.
6. Klik **Deploy → New deployment → Web app**.
7. Pilih **Execute as: Me** dan **Who has access: Anyone** (termasuk pengguna tanpa login).
8. Klik **Deploy**, lalu salin URL yang berakhiran `/exec`.

## Penting
- Jangan pilih **Execute as: User accessing the web app**.
- Jangan membagikan token OAuth Apps Script atau menaruhnya di kode frontend.
- URL Web App bukan rahasia; setiap permintaan tetap harus membawa Firebase ID token yang valid.
- Setelah URL `/exec` tersedia, URL itu perlu dipasang pada konfigurasi SIMPATIK dan alur hasil siswa perlu diuji.
- Firebase Rules perlu mengizinkan siswa membaca dokumen pengerjaan miliknya sendiri setelah selesai agar nilai dapat ditampilkan; aturan tulis nilai tetap ditutup untuk siswa.
