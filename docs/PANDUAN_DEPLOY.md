# Panduan Deploy WP-Rooms

## A. Persiapan Google Sheets

1. Gunakan Google Spreadsheet yang sudah disediakan: ID `1-_8zEUJZWZSis1IRrVkN9Tr2ux15CGU_fBWC7C1YpsU`. Pastikan akun yang menjalankan Apps Script memiliki akses Editor ke spreadsheet tersebut.
2. Buka **Extensions → Apps Script** dari Spreadsheet tersebut. Dengan cara ini, `setupDatabase()` dapat mengenali spreadsheet aktif.
3. Hapus kode contoh pada editor Apps Script, lalu salin seluruh isi `gas/Code.gs` ke file `Code.gs`.
4. Pada Apps Script, buka **Project Settings → Script Properties**. Tambahkan:
   - `SUPERADMIN_EMAIL` = `aditymaulino@gmail.com`.
   - `SUPERADMIN_PASSWORD` = password awal yang diberikan pemilik (isi sementara di Script Properties; jangan ditulis di source code atau dibagikan).
   - `FONNTE_TOKEN` = token API Fonnte. Boleh belum diisi saat pengembangan awal.
   - `SPREADSHEET_ID` tidak perlu diisi bila project dibuat dari menu Extensions pada spreadsheet. `setupDatabase()` akan menyimpannya otomatis. Untuk project standalone, isi dengan ID spreadsheet secara manual.
   - `DRIVE_FOLDER_ID` tidak perlu diisi. Fungsi setup membuat folder Drive privat dan menyimpan ID-nya otomatis.
5. Pada **Project Settings**, pastikan timezone project adalah `Asia/Jakarta`. Manifest `gas/appsscript.json` juga menggunakan timezone tersebut.
6. Jalankan fungsi `setupDatabase()` dari Apps Script. Setujui permintaan akses Google Sheets dan Google Drive.
7. Setelah setup database selesai, jalankan `setupSuperAdminFromProperties()` satu kali. Fungsi ini membuat/memperbarui akun Super Admin, menyimpan password dalam bentuk hash, lalu menghapus properti password mentah. Login pertama wajib mengganti password.
8. Lanjutkan pemeriksaan sheet dan data kamar.
9. Periksa spreadsheet. Fungsi akan membuat tujuh sheet dengan nama persis: `Kamar`, `Pesanan`, `Pengguna`, `Sesi`, `Pengaturan`, `Log`, `LogNotif`.
10. Buka **Executions / Execution log** untuk memastikan setup berhasil. Password awal tidak dicetak ke log. Password wajib diganti saat login pertama.

### Catatan struktur database

- Header `Pengguna` memiliki satu kolom tambahan `wajib_ganti_password` untuk memaksa penggantian password saat login pertama atau setelah reset. Kolom lain mengikuti skema yang diminta.
- `setupDatabase()` menambahkan 26 kamar contoh: Suite 2, VIP 4, Superior 8, Standar 12. Semua contoh kamar dibuat nonaktif dengan tarif nol. Ini disengaja agar data contoh tidak bisa dipesan sebelum harga dan identitas kamar resmi dimasukkan.
- Isi `Pengaturan` dengan alamat wisma, nomor WhatsApp admin format `62…`, nomor rekening resmi, jam check-in/check-out, batas pembayaran, dan template WhatsApp.
- Ganti fasilitas, nomor kamar, kapasitas, foto, serta `harga_dinas` dan `harga_umum` di sheet `Kamar` menggunakan data resmi. Aktifkan `status_aktif` hanya setelah data diverifikasi.
- Folder Drive dibuat privat. Berikan akses **Restricted** kepada akun Google petugas yang memang perlu melihat surat tugas, bukti bayar, dan foto unggahan. Jangan mengaktifkan akses `Anyone` untuk dokumen tamu.

## B. Reset password Super Admin

Jika password sementara hilang, dari Apps Script jalankan fungsi `resetUserPassword(email, temporaryPassword)` dengan email yang terdaftar dan password sementara minimal 12 karakter yang mengandung huruf serta angka. Fungsi ini menandai akun agar wajib mengganti password ketika login berikutnya. Jalankan hanya oleh pemilik project yang berwenang.

## C. Deploy Web App Apps Script

1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. **Execute as:** `Me` (akun pemilik/deployer).
4. **Who has access:** `Anyone` / `Anyone, even anonymous` sesuai pilihan yang tersedia di akun.
5. Klik Deploy, berikan otorisasi, lalu salin URL Web App yang berakhiran `/exec`.
6. Jangan membagikan URL `/dev` sebagai endpoint produksi. Gunakan URL deployment `/exec`.
7. Setelah mengubah `Code.gs`, buat versi baru melalui **Deploy → Manage deployments → Edit → New version → Deploy**.

> Kebijakan Google Workspace dapat membatasi akses anonim. Jika opsi Anyone tidak tersedia, minta administrator Workspace mengizinkan Web App publik atau jalankan pada akun Google yang kebijakannya memperbolehkan.

## D. Konfigurasi frontend

1. Buka `assets/js/config.js`.
2. Ganti nilai `API_URL` dengan URL `/exec` dari Apps Script, contoh format: `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`.
3. Jangan menambahkan `SPREADSHEET_ID`, `FONNTE_TOKEN`, password, atau secret lain ke `config.js`. File ini dikirim ke browser sehingga isinya bersifat publik.
4. Uji halaman `index.html` dari hosting HTTPS. Daftar kamar akan kosong sampai sekurangnya satu kamar diaktifkan dan diberi tarif resmi.

### Catatan komunikasi lintas-domain

Frontend menggunakan JSONP untuk permintaan GET publik. Permintaan yang mengubah data dikirim lewat form HTML ke Apps Script dalam iframe tersembunyi, lalu hasilnya diambil satu kali menggunakan `request_id` acak dari cache server. Pola ini menghindari preflight CORS untuk POST dari hosting statis. Tetap lakukan uji langsung dari domain hosting final karena kebijakan akun Google, redirect deployment, ekstensi browser, atau Content Security Policy dapat memengaruhi komunikasi. Jangan mengganti POST menjadi GET untuk operasi tulis.

## E. Hubungkan WhatsApp Fonnte

1. Aktifkan dan hubungkan perangkat WhatsApp di akun Fonnte sesuai panduan resmi Fonnte.
2. Salin token API dari dashboard Fonnte.
3. Masukkan token ke **Apps Script → Project Settings → Script Properties** sebagai `FONNTE_TOKEN`.
4. Isi nomor `wa_admin` di sheet `Pengaturan` dalam format Indonesia internasional, misalnya `62812…`.
5. Atur template di menu **Admin → Pengaturan**. Placeholder yang didukung: `{{nama}}`, `{{kode_booking}}`, `{{instansi}}`, `{{checkin}}`, `{{checkout}}`, `{{total}}`, `{{rekening}}`, `{{batas_bayar}}`, `{{alasan}}`, `{{jam_checkin}}`, `{{nama_wisma}}`, `{{nomor_kamar}}`.
6. Proses pemesanan tetap disimpan meskipun Fonnte gagal. Periksa `LogNotif` dan badge notifikasi gagal pada dashboard.

## F. Pasang trigger harian

1. Di Apps Script, pilih fungsi `installDailyTrigger` lalu klik Run.
2. Setujui izin trigger bila diminta.
3. Fungsi ini memasang trigger `dailyMaintenance` sekali sehari sekitar pukul 07.00 menurut timezone project.
4. Trigger menandai pesanan berstatus `Disetujui` menjadi `Kedaluwarsa` bila batas bayar lewat dan mengirim pengingat H-1 kepada pesanan berstatus `Lunas`.
5. Pastikan menu **Triggers** menampilkan satu trigger harian untuk `dailyMaintenance`.

## G. Publish frontend

### GitHub Pages

1. Buat repository GitHub baru.
2. Upload seluruh isi folder `WP-Rooms` ke root repository (termasuk `index.html`, `admin/`, `assets/`).
3. Pilih **Settings → Pages**.
4. Source: Deploy from a branch; pilih branch utama dan folder `/root`.
5. Simpan. Tunggu proses GitHub Pages selesai, kemudian buka URL HTTPS yang diberikan.

### Netlify

1. Pastikan file `config.js` sudah berisi URL Apps Script produksi.
2. Drag-and-drop folder `WP-Rooms` ke Netlify Deploy, atau hubungkan repository GitHub.
3. Tidak memerlukan build command maupun publish directory selain root folder proyek.
4. Pastikan `index.html` berada di root hasil deploy.

## H. Operasi awal

1. Login melalui `/admin/login.html` dengan kredensial sementara dari Execution log.
2. Ganti password saat diminta.
3. Buka **Pengaturan** dan lengkapi data wisma, rekening, WhatsApp, jam layanan, dan template.
4. Buka **Kamar** dan perbarui seluruh data contoh, tarif dinas/umum, fasilitas, dan status aktif.
5. Buat akun Admin tambahan lewat menu **Pengguna**. Akun baru wajib mengganti password saat login pertama.
6. Pastikan akun petugas Google memiliki akses Restricted ke folder Drive unggahan.
7. Lakukan seluruh checklist pengujian sebelum URL dipublikasikan ke tamu.

## I. Keterbatasan yang perlu dipahami sebelum produksi

- Project ini merupakan implementasi dasar siap-deploy, bukan deployment yang sudah tersambung ke akun Google, Sheet, domain, atau token Fonnte milik instansi. Integrasi nyata baru aktif setelah langkah konfigurasi dan pengujian di atas.
- File surat tugas dan bukti transfer tetap privat di Drive. Link hanya akan berguna untuk admin yang memiliki izin Drive. Jangan menjadikan dokumen pribadi tamu publik.
- Foto kamar yang diunggah ke Drive tetap privat. Agar galeri bisa dilihat pengunjung, isi kolom `foto_url` dengan URL HTTPS gambar publik yang memang disetujui untuk publikasi, atau path `assets/img/...` pada website. Beberapa URL dapat disimpan satu per baris.
- Data tarif, rekening, alamat, nomor admin, kebijakan menginap, dan peta belum diisi karena harus menggunakan data resmi dari pengelola.
- Untuk kebutuhan institusi dan volume transaksi tinggi, lakukan audit keamanan, kebijakan retensi dokumen, pencadangan Sheet/Drive, dan uji beban sebelum produksi penuh.
