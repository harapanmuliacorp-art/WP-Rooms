(function () {
  'use strict'; const W = window.WPR; const host = W.$('#confirmation-content'); if (!host) return;
  const code = W.query('code'); let data = null; try { data = JSON.parse(sessionStorage.getItem('wpr_last_booking') || 'null'); } catch (_) {}
  host.replaceChildren(); host.appendChild(W.node('p', 'Permohonan pemesanan Anda telah diterima dan menunggu verifikasi petugas.'));
  const codeEl = W.node('div', code || (data && data.kode_booking) || 'Kode booking tidak tersedia', 'confirmation-code'); host.appendChild(codeEl);
  if (data) {
    const table = W.node('div', null, 'content-card'); table.append(W.node('p', 'Nama: ' + data.nama), W.node('p', 'Kamar: ' + data.room), W.node('p', 'Periode: ' + W.dateId(data.checkin) + ' – ' + W.dateId(data.checkout)), W.node('p', 'Lama menginap: ' + data.malam + ' malam'), W.node('p', 'Estimasi biaya: ' + W.money(data.total))); host.appendChild(table);
  }
  host.appendChild(W.node('p', 'Simpan kode booking dan gunakan nomor HP yang sama untuk melacak status. Pembayaran hanya dilakukan setelah permohonan disetujui.'));
})();
