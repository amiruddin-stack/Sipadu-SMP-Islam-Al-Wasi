# Mengaktifkan Impor Google Forms di SIMPATIK

Integrasi menggunakan Google Forms API v1 dan Google Identity Services. Aplikasi meminta scope baca saja: `https://www.googleapis.com/auth/forms.body.readonly`. Token akses disimpan sementara di memori browser dan tidak ditulis ke Firestore atau local storage.

## 1. Aktifkan Google Forms API

1. Buka https://console.cloud.google.com/
2. Pilih atau buat satu Google Cloud project milik sekolah.
3. Buka **APIs & Services → Library**.
4. Cari **Google Forms API**, lalu tekan **Enable**.

## 2. Siapkan OAuth consent screen

1. Buka **Google Auth Platform → Branding** dan isi nama aplikasi: `SIMPATIK SMP Islam Al-Wasi’`.
2. Isi email dukungan dan informasi kontak yang diminta.
3. Pada **Audience**, pilih Internal hanya jika semua pengguna memakai akun Google Workspace dalam satu organisasi sekolah. Jika guru memakai Gmail pribadi, pilih External.
4. Jika status External masih Testing, tambahkan akun Google guru/pemilik formulir pada daftar **Test users**.
5. Pada **Data Access**, tambahkan scope `https://www.googleapis.com/auth/forms.body.readonly`.

Google dapat meminta proses verifikasi OAuth sebelum aplikasi eksternal dipakai secara luas. Untuk tahap uji coba, batasi akses pada akun test users yang sudah ditambahkan.

## 3. Buat OAuth Client ID

1. Buka **Google Auth Platform → Clients** (atau **APIs & Services → Credentials**).
2. Pilih **Create Client → Web application**.
3. Nama client: `SIMPATIK GitHub Pages`.
4. Tambahkan **Authorized JavaScript origins**:
   - `https://amiruddin-stack.github.io`
   - `http://localhost:3000` untuk pengujian lokal.
5. GIS token flow yang dipakai aplikasi ini tidak membutuhkan Authorized redirect URI.
6. Buat client, lalu salin **Client ID** yang berakhiran `.apps.googleusercontent.com`.

Jangan membuat atau menaruh Client Secret di aplikasi frontend. SIMPATIK hanya menggunakan Client ID publik.

## 4. Masukkan Client ID ke GitHub

1. Buka repository `amiruddin-stack/Sipadu-SMP-Islam-Al-Wasi`.
2. Masuk ke **Settings → Secrets and variables → Actions**.
3. Pilih **New repository secret**.
4. Nama secret harus persis: `VITE_GOOGLE_CLIENT_ID`.
5. Isi nilainya dengan OAuth Client ID dari Google Cloud.
6. Simpan.

Workflow GitHub Pages sudah disiapkan untuk membaca secret tersebut saat membangun aplikasi. Perubahan baru tampil di situs setelah perubahan kode masuk ke branch `main` dan workflow deploy berjalan.

## 5. Cara guru mengimpor

1. Masuk ke SIMPATIK dengan akun admin yang berwenang mengelola Bank Soal.
2. Buka **Modul Ujian → Unggah File / Impor Soal**.
3. Pilih kelas dan mata pelajaran.
4. Tekan **Hubungkan Google**, lalu pilih akun Google yang memiliki akses ke formulir.
5. Tempel tautan Google Form dan tekan **Ambil soal dari Google Form**.
6. Periksa pratinjau. Jawaban benar yang terbaca ditandai hijau.
7. Tekan **Simpan soal ke Bank Soal**.

Gunakan tautan Google Form yang dapat diakses akun tersebut, idealnya tautan edit `https://docs.google.com/forms/d/FORM_ID/edit`.

## Batasan impor saat ini

- Mendukung soal pilihan ganda satu jawaban (Radio dan Dropdown).
- Formulir harus dapat dibaca oleh akun Google yang dihubungkan.
- Kunci jawaban dan poin diambil jika tersedia di bagian Grading pada kuis Google Forms.
- Soal yang tidak memiliki satu kunci jawaban tunggal tetap dapat diimpor, tetapi kuncinya tidak disimpan.
- Checkbox dengan banyak jawaban benar, jawaban paragraf, unggah file, gambar, kisi-kisi, dan tipe pertanyaan lain belum didukung.
- Token Google bersifat sementara. Jika halaman dimuat ulang atau izin kedaluwarsa, guru perlu menghubungkan Google kembali.
- Impor dan penyimpanan soal memerlukan koneksi internet.

## Privasi dan biaya

Aplikasi meminta izin baca isi formulir saja. Tidak ada Client Secret yang disimpan di GitHub Pages, tidak ada Google Apps Script, dan integrasi ini tidak membutuhkan Firebase Blaze. Kuota Google Forms API tetap mengikuti batas penggunaan Google Cloud project.
