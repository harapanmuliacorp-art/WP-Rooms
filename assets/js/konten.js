/*
 * KONTEN BERANDA — edit file ini saja, tidak perlu mengubah HTML.
 * Bagian yang datanya kosong ([]) otomatis disembunyikan.
 * Alamat dan nomor WhatsApp diambil dari Admin > Pengaturan; isi di sini hanya cadangan.
 *
 * PENTING: pastikan semua isi benar sebelum dipublikasikan.
 * Daftar fasilitas, atraksi, dan FAQ di bawah adalah CONTOH UMUM — sesuaikan dengan kenyataan wisma.
 * Jangan menulis ulasan palsu; isi "ulasan" hanya dengan testimoni tamu yang sungguh ada (dan izin mereka).
 */
window.WPR_KONTEN = {
  wa: '',                 // cadangan, format 62xxxxxxxxxx (dipakai jika Pengaturan admin belum diisi)
  alamat: '',             // cadangan alamat untuk peta
  petaLink: '',           // opsional: tempel link "Bagikan > Sematkan peta" (src iframe) dari Google Maps
  ogImage: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=70', // GANTI dengan foto asli (URL lengkap)

  fasilitas: [
    { ikon: '❄', nama: 'Kamar ber-AC' },
    { ikon: '📶', nama: 'Wi-Fi' },
    { ikon: '🚗', nama: 'Area parkir' },
    { ikon: '🍳', nama: 'Sarapan' },
    { ikon: '🚿', nama: 'Kamar mandi pribadi' },
    { ikon: '🛎', nama: 'Resepsionis' }
  ],

  atraksi: [
    { judul: 'Candi Borobudur', teks: 'Candi Buddha terbesar di dunia, Warisan Dunia UNESCO.' },
    { judul: 'Dataran Tinggi Dieng', teks: 'Telaga, kawah, dan candi di udara pegunungan yang sejuk.' },
    { judul: 'Kota Lama Semarang', teks: 'Kawasan bangunan kolonial untuk jalan santai dan berfoto.' },
    { judul: 'Lawang Sewu', teks: 'Gedung bersejarah ikonik di pusat Kota Semarang.' }
  ],
  atraksiCatatan: 'Destinasi populer di Jawa Tengah. Tanyakan jarak dan rute dari wisma kepada kami.',

  ulasan: [
    // { nama: 'Nama Tamu', asal: 'Kota', teks: 'Kamarnya bersih dan pelayanannya ramah.' }
  ],

  faq: [
    { t: 'Jam check-in dan check-out?', j: 'Jam check-in dan check-out tercantum di halaman detail kamar dan pada konfirmasi pemesanan Anda.' },
    { t: 'Bagaimana cara memesan?', j: 'Pilih tanggal di beranda, pilih kamar yang tersedia, lalu isi data. Anda akan mendapat kode booking untuk memantau status.' },
    { t: 'Bagaimana cara membayar?', j: 'Petunjuk pembayaran dan nomor rekening resmi akan ditampilkan setelah pemesanan disetujui pengelola.' },
    { t: 'Bagaimana memeriksa status pesanan?', j: 'Buka menu Lacak Pesanan lalu masukkan kode booking Anda.' },
    { t: 'Bisa bertanya dulu sebelum memesan?', j: 'Bisa. Gunakan tombol WhatsApp di pojok kanan bawah untuk menghubungi pengelola.' }
  ]
};
