(function () {
  'use strict'; const W = window.WPR; const list = W.$('#rooms-list'); if (!list) return;
  let rooms = [];
  const params = new URLSearchParams(window.location.search);
  ['checkin','checkout'].forEach(key => { if (params.get(key)) W.$('#filter-' + key).value = params.get(key); });
  if (params.get('tamu')) W.$('#filter-capacity').value = String(params.get('tamu'));
  W.api.getCached('listRooms').then(data => { rooms = data.rooms; render(); }).catch(err => { list.replaceChildren(); W.alertBox(W.$('#rooms-message'), err.message, 'error'); });
  ['#filter-type','#filter-capacity','#filter-guest','#filter-checkin','#filter-checkout'].forEach(sel => W.$(sel).addEventListener('change', render));
  let seq = 0;
  function render() {
    const my = ++seq;
    const type = W.$('#filter-type').value, cap = Number(W.$('#filter-capacity').value || 0), ci = W.$('#filter-checkin').value, co = W.$('#filter-checkout').value, guest = W.$('#filter-guest').value;
    const base = rooms.filter(r => (!type || r.tipe === type) && r.kapasitas >= cap);
    const useDates = ci && co && co > ci;
    const ready = useDates ? W.api.getCached('availableRooms', { checkin: ci, checkout: co }, 60000).then(a => base.filter(r => a.available_ids.indexOf(r.id) >= 0)) : Promise.resolve(base);
    ready.then(items => {
      if (my !== seq) return;
      list.replaceChildren();
      items.forEach(r => list.appendChild(card(r, guest, ci, co)));
      if (!items.length) list.appendChild(W.node('div', 'Tidak ada kamar yang cocok atau tersedia pada tanggal tersebut.', 'empty'));
      const msg = W.$('#rooms-message'); if (msg) W.alertBox(msg, items.length + ' kamar ditemukan.', '');
    }).catch(err => { if (my === seq) { list.replaceChildren(); W.alertBox(W.$('#rooms-message'), err.message, 'error'); } });
  }
  function card(room, guest, ci, co) {
    const card = W.node('article', null, 'room-card'), photo = W.node('div', null, 'room-photo');
    if (room.foto_url) { const img = W.node('img'); img.src = room.foto_url; img.alt = 'Foto kamar ' + room.nomor_kamar; img.loading = 'lazy'; img.decoding = 'async'; photo.appendChild(img); } else photo.appendChild(W.node('span', 'Foto kamar belum tersedia', 'hint'));
    const body = W.node('div', null, 'room-card-body'); body.append(W.node('h3', room.tipe + ' · Kamar ' + room.nomor_kamar), W.node('div', 'Kapasitas ' + room.kapasitas + ' orang', 'room-meta'), W.node('p', room.fasilitas || 'Fasilitas belum diatur.', 'hint'));
    const rate = guest === 'Dinas' ? room.harga_dinas : room.harga_umum; body.appendChild(W.node('div', W.money(rate) + ' / malam (' + guest + ')', 'room-price'));
    const link = W.node('a', 'Detail & Pesan', 'btn btn-small'); link.href = 'detail.html?id=' + encodeURIComponent(room.id) + (ci && co ? '&checkin=' + ci + '&checkout=' + co : ''); body.appendChild(link); card.append(photo, body); return card;
  }
})();
