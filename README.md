# WP-Rooms — Sistem Pemesanan Kamar Wisma Pemda Jawa Tengah

Aplikasi multi-halaman berbasis HTML5, CSS3, JavaScript murni, Google Apps Script, Google Sheets, Google Drive, dan Fonnte. Tampilan publik diperbarui dengan tema hospitality hijau natural, foto editorial, dan pengalaman reservasi responsif. Frontend tidak menggunakan React/Vue/Node/build tool.

## Mulai cepat

1. Buka `docs/PANDUAN_DEPLOY.md` dan ikuti langkah dari pembuatan Google Sheet sampai publish frontend.
2. Salin `gas/Code.gs` ke Apps Script yang terikat pada spreadsheet, jalankan `setupDatabase()`, kemudian deploy sebagai Web App.
3. Masukkan URL `/exec` ke `assets/js/config.js`.
4. Isi data asli wisma, tarif, rekening, WhatsApp, fasilitas, dan foto sebelum mengaktifkan kamar.
5. Jalankan `installDailyTrigger()` dan lakukan `docs/TEST_CHECKLIST.md`.

## Struktur proyek

```text
WP-Rooms/
├── index.html
├── kamar.html
├── detail.html
├── pesan.html
├── konfirmasi.html
├── lacak.html
├── tentang.html
├── kontak.html
├── syarat.html
├── admin/
│   ├── login.html / login.js
│   ├── dashboard.html / dashboard.js
│   ├── pesanan.html / pesanan.js
│   ├── kamar.html / kamar.js
│   ├── kalender.html / kalender.js
│   ├── laporan.html / laporan.js
│   ├── pengguna.html / pengguna.js
│   └── pengaturan.html / pengaturan.js
├── assets/
│   ├── css/style.css, admin.css
│   ├── js/config.js, api.js, utils.js, public.js, rooms-public.js,
│   │      detail.js, booking.js, confirmation.js, tracking.js, kontak.js, admin.js
│   └── img/logo.svg, hero-placeholder.svg
├── gas/
│   ├── Code.gs
│   └── appsscript.json
└── docs/
    ├── PANDUAN_DEPLOY.md
    └── TEST_CHECKLIST.md
```

## Modul utama

- **Publik:** cek ketersediaan, daftar kamar dan filter, detail/galeri, kalender ketersediaan publik 30 hari, pemesanan, konfirmasi, lacak status, upload bukti bayar, tentang, kontak/peta, dan syarat ketentuan.
- **Admin:** dashboard ringkasan dan grafik, daftar serta aksi status pesanan, manajemen kamar, kalender okupansi, laporan CSV/cetak PDF.
- **Super Admin:** kelola akun admin dan pengaturan wisma/template WhatsApp.
- **Backend:** validasi server-side, anti-double-booking memakai `LockService`, hitung biaya di server, autentikasi sesi 8 jam, rate limit login, unggah Drive privat, Fonnte dengan pencatatan `LogNotif`, serta trigger harian.

## Catatan data awal

Nama awal wisma adalah `Wisma Pemda Jawa Tengah`. Alamat, WA admin, rekening, dan tarif resmi sengaja tidak direkayasa. `setupDatabase()` mengisi placeholder dan 26 kamar contoh nonaktif/bertarif nol. Ganti semua itu dengan data resmi sebelum publikasi. Lihat bagian keterbatasan dan prosedur izin Drive di panduan deploy.

**Belum terhubung ke akun produksi:** file ini adalah source code lengkap untuk dipasang. Spreadsheet ID telah disiapkan pada konfigurasi backend. URL Web App yang sudah ada pada `assets/js/config.js` perlu diverifikasi dengan deployment Code.gs terbaru. Tarif, alamat, rekening, dan data kamar resmi tetap harus dilengkapi pengelola.
