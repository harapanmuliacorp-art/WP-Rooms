(function () {
  'use strict'; const W = window.WPR; const form = W.$('#booking-form'); if (!form) return;
  const roomId = W.query('id'); const ci = W.query('checkin'), co = W.query('checkout'); const ciEl = W.$('#checkin'), coEl = W.$('#checkout');
  ciEl.min = W.todayISO(); coEl.min = W.todayISO(); if (ci) ciEl.value = ci; if (co) coEl.value = co;
  ciEl.addEventListener('change', () => { coEl.min = ciEl.value || W.todayISO(); if (coEl.value && coEl.value <= ciEl.value) coEl.value = ''; });
  const typeEl = W.$('#jenis-tamu'), fileEl = W.$('#surat-tugas');
  function updateDuty() { fileEl.required = typeEl.value === 'Dinas'; W.$('#surat-field label').textContent = typeEl.value === 'Dinas' ? 'Surat tugas (wajib untuk Dinas, JPG/PNG/PDF maks. 2 MB) *' : 'Surat tugas (opsional untuk Umum)'; }
  typeEl.addEventListener('change', updateDuty); updateDuty();
  let room;
  W.api.get('getRoom', { id: roomId }).then(data => { room = data.room; W.$('#booking-room-summary').textContent = room.tipe + ' — ' + room.nomor_kamar + ' | Kapasitas ' + room.kapasitas + ' orang | Tarif Dinas ' + W.money(room.harga_dinas) + ' / malam, Umum ' + W.money(room.harga_umum) + ' / malam. Total final dihitung server.'; W.$('#jumlah-tamu').max = String(room.kapasitas); }).catch(err => W.alertBox(W.$('#booking-message'), err.message, 'error'));
  form.addEventListener('submit', async e => {
    e.preventDefault(); const button = W.$('#submit-booking'); W.setBusy(button, true, 'Mengirim…');
    try {
      if (!room) throw new Error('Data kamar belum siap. Muat ulang halaman.');
      const data = { id_kamar: roomId, nama: W.$('#nama').value.trim(), instansi: W.$('#instansi').value.trim(), nip: W.$('#nip').value.trim(), hp: W.$('#hp').value.trim(), email: W.$('#email').value.trim(), jenis_tamu: typeEl.value, checkin: ciEl.value, checkout: coEl.value, jumlah_tamu: Number(W.$('#jumlah-tamu').value), keperluan: W.$('#keperluan').value.trim(), catatan: W.$('#catatan').value.trim() };
      if (data.jenis_tamu === 'Dinas' && !fileEl.files[0]) throw new Error('Surat tugas wajib diunggah untuk tamu Dinas.');
      if (fileEl.files[0]) data.surat_tugas = await W.fileToPayload(fileEl.files[0]);
      const result = await W.api.post('createBooking', data);
      try { sessionStorage.setItem('wpr_last_booking', JSON.stringify({ kode_booking: result.kode_booking, total: result.total_estimasi, malam: result.malam, checkin: data.checkin, checkout: data.checkout, room: room.nomor_kamar, nama: data.nama })); } catch (_) {}
      window.location.href = 'konfirmasi.html?code=' + encodeURIComponent(result.kode_booking);
    } catch (err) { W.alertBox(W.$('#booking-message'), err.message, 'error'); W.setBusy(button, false); }
  });
})();
