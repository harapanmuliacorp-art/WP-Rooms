(function () {
  'use strict'; const W = window.WPR; const id = W.query('id'); const host = W.$('#room-detail'); let room;
  if (!id) { W.alertBox(W.$('#detail-message'), 'ID kamar tidak ditemukan.', 'error'); host.textContent = ''; return; }
  const ci = W.query('checkin'); const co = W.query('checkout'); if (ci) W.$('#availability-in').value = ci; if (co) W.$('#availability-out').value = co;
  W.$('#availability-in').min = W.todayISO(); W.$('#availability-out').min = W.todayISO();
  loadCalendar();
  W.api.getCached('getRoom', { id }).then(data => { room = data.room; render(); syncBookLink(); }).catch(err => { host.textContent = ''; W.alertBox(W.$('#detail-message'), err.message, 'error'); });
  function loadCalendar() {
    const target = W.$('#room-calendar');
    target.replaceChildren();
    W.api.get('calendarAvailability', { id, from: W.todayISO(), days: 30 }).then(data => {
      const names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      names.forEach(name => target.appendChild(W.node('span', name, 'calendar-weekday')));
      const first = new Date(data.days[0].tanggal + 'T00:00:00').getDay();
      for (let i = 0; i < first; i++) target.appendChild(W.node('span', '', 'calendar-day empty-day'));
      data.days.forEach(item => {
        const date = new Date(item.tanggal + 'T00:00:00');
        const cell = W.node('span', String(date.getDate()), 'calendar-day' + (item.tersedia ? '' : ' busy'));
        cell.title = item.tanggal + (item.tersedia ? ' — Tersedia' : ' — Terisi');
        target.appendChild(cell);
      });
    }).catch(err => { target.replaceChildren(W.node('span', 'Kalender belum dapat dimuat: ' + err.message, 'hint')); });
  }
  function syncBookLink() {
    const a = W.$('#availability-in').value, b = W.$('#availability-out').value; const btn = W.$('.detail-side a.btn-gold');
    if (btn) btn.href = 'pesan.html?id=' + encodeURIComponent(id) + (a && b && b > a ? '&checkin=' + a + '&checkout=' + b : '');
  }
  ['#availability-in', '#availability-out'].forEach(sel => W.$(sel).addEventListener('change', syncBookLink));
  function render() {
    host.replaceChildren(); const grid = W.node('div', null, 'detail-grid'); const left = W.node('div'); const photo = W.node('div', null, 'detail-photo');
    if (room.foto_url) { const img = W.node('img'); img.src = room.foto_url; img.alt = 'Foto kamar ' + room.nomor_kamar; photo.appendChild(img); } else photo.appendChild(W.node('span', 'Foto kamar belum tersedia', 'hint'));
    left.appendChild(photo);
    if (room.foto_urls && room.foto_urls.length > 1) { const gallery = W.node('div', null, 'photo-gallery'); room.foto_urls.slice(1).forEach((src, i) => { const img = W.node('img'); img.src = src; img.alt = 'Galeri kamar ' + room.nomor_kamar + ' ' + (i + 2); img.loading = 'lazy'; img.decoding = 'async'; gallery.appendChild(img); }); left.appendChild(gallery); }
    left.append(W.node('h2', room.tipe + ' — ' + room.nomor_kamar)); left.appendChild(W.node('p', room.fasilitas || 'Fasilitas belum diperbarui.'));
    const side = W.node('aside', null, 'detail-side'); side.append(W.node('span', room.tipe, 'tag'), W.node('h2', room.nomor_kamar), W.node('p', 'Kapasitas maksimal ' + room.kapasitas + ' orang.'));
    const prices = W.node('div', null, 'price-list'); const p1 = W.node('div', null, 'price-box'); p1.append(W.node('small', 'Tarif Dinas'), W.node('strong', W.money(room.harga_dinas) + ' / malam')); const p2 = W.node('div', null, 'price-box'); p2.append(W.node('small', 'Tarif Umum'), W.node('strong', W.money(room.harga_umum) + ' / malam')); prices.append(p1,p2); side.appendChild(prices);
    const book = W.node('a', 'Lanjut Pesan', 'btn btn-gold'); book.href = 'pesan.html?id=' + encodeURIComponent(room.id); side.appendChild(book); grid.append(left,side); host.appendChild(grid);
  }
  W.$('#check-room').addEventListener('click', () => {
    const a = W.$('#availability-in').value, b = W.$('#availability-out').value; const msg = W.$('#availability-message'); W.$('#availability-days').replaceChildren();
    if (!a || !b || b <= a) { W.alertBox(msg, 'Isi tanggal check-in dan check-out dengan benar.', 'error'); return; }
    W.api.get('availability', { id, checkin: a, checkout: b }).then(result => {
      W.alertBox(msg, result.available ? 'Kamar tersedia pada rentang tanggal tersebut. Silakan lanjutkan pemesanan.' : 'Kamar tidak tersedia pada salah satu atau beberapa tanggal tersebut.', result.available ? 'success' : 'error');
      result.conflicts.forEach(x => { const chip = W.node('span', W.dateId(x.checkin) + ' – ' + W.dateId(x.checkout), 'day-chip busy'); W.$('#availability-days').appendChild(chip); });
      if (result.available) { const btn = W.$('.detail-side a'); if (btn) btn.href = 'pesan.html?id=' + encodeURIComponent(id) + '&checkin=' + a + '&checkout=' + b; }
    }).catch(err => W.alertBox(msg, err.message, 'error'));
  });
})();
