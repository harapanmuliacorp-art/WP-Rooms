# Checklist Uji WP-Rooms

Lakukan pada deployment staging dengan tarif dummy, nomor uji, dan folder Drive khusus pengujian. Jangan menggunakan dokumen atau data pribadi asli saat uji awal.

## Database dan konfigurasi

- [ ] Jalankan `setupDatabase()` dua kali. Tidak boleh menggandakan header, kamar contoh, atau akun Super Admin.
- [ ] Pastikan tujuh sheet memiliki nama dan header yang benar.
- [ ] Pastikan semua kamar contoh nonaktif dan tarif nol sampai diedit.
- [ ] Pastikan `FONNTE_TOKEN` dan `SPREADSHEET_ID` tidak muncul pada file frontend.
- [ ] Pastikan folder unggahan Drive tetap berstatus Restricted.

## Pemesanan dan tanggal

- [ ] Pemesanan dengan check-in hari lampau ditolak.
- [ ] Checkout sama dengan atau sebelum check-in ditolak.
- [ ] Jumlah tamu melebihi kapasitas ditolak.
- [ ] Nomor HP tidak valid ditolak; nomor `08…`, `8…`, dan `62…` dinormalisasi menjadi `62…`.
- [ ] Tamu Dinas tanpa surat tugas ditolak.
- [ ] Tamu Umum dapat mengirim tanpa surat tugas.
- [ ] Total yang tersimpan sama dengan tarif server sesuai jenis tamu dikali jumlah malam, walaupun angka total palsu dikirim dari browser.
- [ ] Rentang [check-in, check-out) beririsan dengan pesanan aktif: ditolak.
- [ ] Pemesanan baru mulai pada tanggal checkout pesanan sebelumnya: diterima (checkout hari X membuat kamar bebas untuk check-in hari X).
- [ ] Dua browser mengirim pesanan untuk kamar dan tanggal sama hampir bersamaan. Hanya satu yang boleh berhasil; yang lain menerima pesan kamar baru saja dipesan.
- [ ] Pesanan yang masih Menunggu Verifikasi tetap memblokir rentang yang sama agar permohonan tidak bertumpuk.

## Unggahan berkas

- [ ] JPG valid di bawah 2 MB diterima untuk surat tugas/bukti bayar.
- [ ] PNG valid di bawah 2 MB diterima.
- [ ] PDF valid di bawah 2 MB diterima untuk surat tugas/bukti bayar.
- [ ] File di atas 2 MB ditolak.
- [ ] File `.jpg` yang sebenarnya berisi teks atau PDF ditolak karena signature tidak cocok.
- [ ] MIME dan ekstensi yang tidak cocok ditolak.
- [ ] File foto kamar PDF ditolak; hanya JPG/PNG diterima.
- [ ] Link dokumen di Drive tidak dapat dibuka oleh akun publik yang tidak diberi akses.

## Status, lacak, dan pembayaran

- [ ] Kode booking mengikuti format `WPR-YYYYMMDD-XXXX`.
- [ ] Lacak dengan kode dan HP yang benar berhasil.
- [ ] Lacak dengan kode benar tetapi nomor HP salah gagal tanpa menampilkan detail booking.
- [ ] Nomor HP dan NIP tidak muncul pada endpoint publik.
- [ ] Admin dapat menyetujui pesanan Menunggu Verifikasi.
- [ ] Saat disetujui, `batas_bayar` dihitung mulai dari waktu persetujuan, bukan dari waktu pengajuan.
- [ ] Admin menolak tanpa alasan: ditolak oleh validasi. Dengan alasan: status berubah menjadi Ditolak dan alasan tercatat.
- [ ] Bukti transfer hanya dapat diunggah pada status Disetujui.
- [ ] Setelah bukti diunggah, status berubah menjadi Menunggu Konfirmasi Bayar.
- [ ] Tandai Lunas hanya berhasil dari status Menunggu Konfirmasi Bayar.
- [ ] Check-in hanya berhasil dari status Lunas; Selesai hanya dari status Check-in.
- [ ] Pesanan dengan status Disetujui melewati `batas_bayar` berubah menjadi Kedaluwarsa setelah `dailyMaintenance` berjalan.
- [ ] `dailyMaintenance` mengirim pengingat H-1 hanya ke pesanan Lunas dan tidak mengirim berulang untuk hari pengingat yang sama.

## Keamanan admin

- [ ] Buka dashboard admin tanpa token: diarahkan ke halaman login.
- [ ] Panggil endpoint admin tanpa token: server menolak.
- [ ] Token sesi yang diubah atau kedaluwarsa ditolak.
- [ ] Sesi kedaluwarsa setelah 8 jam (untuk uji cepat, ubah `expired_at` di sheet Sesi ke waktu lampau).
- [ ] Lima kali login salah menyebabkan blokir sementara untuk email tersebut.
- [ ] Login pertama Super Admin meminta password baru.
- [ ] Password baru kurang dari 12 karakter atau tanpa kombinasi huruf dan angka ditolak.
- [ ] Admin biasa tidak dapat membuka endpoint pengguna atau pengaturan.
- [ ] Logout menghapus token sesi di sheet Sesi.
- [ ] Teks berisi HTML/script seperti `<img onerror=...>` tampil sebagai teks, bukan dieksekusi.

## WhatsApp dan pencatatan

- [ ] Dengan token Fonnte valid, pesanan baru mengirim WA ke tamu dan admin.
- [ ] Persetujuan, penolakan, bukti bayar, lunas, pengingat H-1, kedaluwarsa, dan selesai memicu template yang sesuai.
- [ ] Pastikan jeda antar pengiriman beruntun sekitar dua detik.
- [ ] Dengan token kosong/salah atau nomor admin kosong, proses pemesanan tetap tersimpan.
- [ ] Kegagalan dicatat pada `LogNotif` dan terlihat pada badge dashboard.
- [ ] Tombol Kirim Ulang Notifikasi menulis percobaan baru di `LogNotif`.

## Laporan dan kompatibilitas

- [ ] Filter tanggal/status pada daftar pesanan bekerja.
- [ ] CSV dapat dibuka di Excel dan nilai berawalan `=`, `+`, `-`, `@` tidak dieksekusi sebagai formula.
- [ ] Cetak / Save as PDF menampilkan tabel tanpa sidebar dan tombol admin.
- [ ] Uji seluruh halaman publik dari domain GitHub Pages/Netlify HTTPS, bukan hanya file lokal.
- [ ] Uji form POST dan polling `request_id` dari browser Chrome/Firefox yang akan dipakai petugas.
- [ ] Uji tampilan mobile untuk halaman publik dan admin.
