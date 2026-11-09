(function () {
  'use strict'; const W = window.WPR; const form = W.$('#track-form'); if (!form) return;
  const codeParam = W.query('code'); if (codeParam) W.$('#track-code').value = codeParam;
  form.addEventListener('submit', e => {
    e.preventDefault(); const code = W.$('#track-code').value.trim().toUpperCase(), hp = W.$('#track-phone').value.trim();
    W.alertBox(W.$('#track-message'), 'Memeriksa status pesanan…');
    W.api.post('track', { kode_booking: code, hp }).then(data => { W.$('#track-message').replaceChildren(); render(data); }).catch(err => W.alertBox(W.$('#track-message'), err.message, 'error'));
  });
  function render(data) {
    const b = data.booking, host = W.$('#track-result'); host.replaceChildren(); const card = W.node('section', null, 'content-card');
    card.append(W.node('h2', 'Ringkasan Pesanan'), W.node('p', b.kode_booking, 'confirmation-code'), W.statusBadge(b.status), W.node('p', 'Kamar: ' + b.tipe_kamar), W.node('p', 'Check-in: ' + W.dateId(b.checkin)), W.node('p', 'Check-out: ' + W.dateId(b.checkout)), W.node('p', 'Jumlah tamu: ' + b.jumlah_tamu), W.node('p', 'Total estimasi: ' + W.money(b.total)));
    if (b.batas_bayar) card.appendChild(W.node('p', 'Batas pembayaran: ' + b.batas_bayar));
    if (b.alasan_penolakan) card.appendChild(W.node('p', 'Alasan penolakan: ' + b.alasan_penolakan));
    host.appendChild(card);
    const hist = W.node('section', null, 'content-card'); hist.appendChild(W.node('h3', 'Riwayat Status'));
    if (!data.history.length) hist.appendChild(W.node('p', 'Riwayat belum tersedia.'));
    data.history.forEach(item => { const p = W.node('p'); p.append(W.node('strong', item.status + ' — '), document.createTextNode(item.waktu + ' · ' + item.keterangan)); hist.appendChild(p); }); host.appendChild(hist);
    if (b.status === 'Disetujui') renderPaymentForm(host, b);
  }
  function renderPaymentForm(host, booking) {
    const card = W.node('section', null, 'content-card'); card.append(W.node('h3', 'Unggah Bukti Transfer'), W.node('p', 'Unggah bukti pembayaran setelah transfer ke rekening resmi yang diberikan oleh petugas.'));
    const bank = W.node('div', booking.rekening || 'Detail rekening akan diinformasikan melalui WhatsApp/konfirmasi resmi pengelola.', 'alert'); card.appendChild(bank);
    const form = W.node('form'); const label = W.node('label', 'File bukti transfer (JPG/PNG/PDF, maksimal 2 MB)'); label.htmlFor = 'payment-file'; const file = W.node('input'); file.id = 'payment-file'; file.type = 'file'; file.accept = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'; file.required = true;
    const btn = W.node('button', 'Kirim Bukti Pembayaran', 'btn btn-gold'); btn.type = 'submit'; const msg = W.node('div'); form.append(label,file,btn,msg); form.addEventListener('submit', async e => {
      e.preventDefault(); W.setBusy(btn,true,'Mengunggah…');
      try { const payload = await W.fileToPayload(file.files[0]); const result = await W.api.post('uploadPayment', { kode_booking: booking.kode_booking, hp: W.$('#track-phone').value.trim(), file: payload }); W.alertBox(msg, result.message || 'Bukti berhasil dikirim. Status menunggu konfirmasi admin.', 'success'); btn.disabled = true; }
      catch (err) { W.alertBox(msg, err.message, 'error'); W.setBusy(btn,false); }
    }); card.appendChild(form); host.appendChild(card);
  }
})();
