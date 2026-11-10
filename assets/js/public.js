(function () {
  'use strict';
  const W = window.WPR;
  W.$$('.menu-toggle').forEach(btn => { btn.setAttribute('aria-expanded', 'false'); btn.addEventListener('click', () => { const open = W.$('.nav-links')?.classList.toggle('open'); btn.setAttribute('aria-expanded', String(!!open)); }); });
  const footerName = W.$('[data-wisma-name]');
  if (footerName) footerName.textContent = 'Wisma Pemda Jawa Tengah';
  if (W.api && (W.$('[data-address]') || W.$('[data-wa]'))) {
    W.api.get('publicInfo').then(data => {
      const info = data.info || {};
      W.$$('[data-wisma-name]').forEach(el => el.textContent = info.nama_wisma || 'Wisma Pemda Jawa Tengah');
      W.$$('[data-address]').forEach(el => el.textContent = info.alamat || 'Alamat belum dilengkapi.');
      W.$$('[data-wa]').forEach(el => el.textContent = info.wa_admin || 'Nomor WhatsApp belum dilengkapi.');
      W.$$('[data-wa-link]').forEach(el => { if (info.wa_admin) el.href = 'https://wa.me/' + info.wa_admin; else el.removeAttribute('href'); });
    }).catch(() => {});
  }
  const year = W.$('[data-year]'); if (year) year.textContent = new Date().getFullYear();
  const searchForm = W.$('#availability-search');
  if (searchForm) {
    const ci = W.$('#search-checkin'); const co = W.$('#search-checkout');
    ci.min = W.todayISO(); co.min = W.todayISO();
    ci.addEventListener('change', () => { co.min = ci.value || W.todayISO(); if (co.value && co.value <= ci.value) co.value = ''; });
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!ci.value || !co.value || co.value <= ci.value) { W.alertBox(W.$('#search-message'), 'Tanggal check-out harus setelah check-in.', 'error'); return; }
      const params = new URLSearchParams({ checkin: ci.value, checkout: co.value, tamu: W.$('#search-guests').value || '1' });
      window.location.href = 'kamar.html?' + params.toString();
    });
  }
  const featured = W.$('#featured-rooms');
  if (featured) {
    W.api.getCached('listRooms').then(data => {
      featured.replaceChildren();
      const seen = {}; const picks = data.rooms.filter(r => !seen[r.tipe] && (seen[r.tipe] = true)).slice(0, 3);
      picks.forEach(room => featured.appendChild(roomCard(room)));
      if (!data.rooms.length) featured.appendChild(W.node('div', 'Kamar belum dipublikasikan. Silakan hubungi pengelola.', 'empty'));
    }).catch(err => W.alertBox(W.$('#featured-message'), err.message, 'error'));
  }
  function roomCard(room) {
    const card = W.node('article', null, 'room-card');
    const photo = W.node('div', null, 'room-photo');
    if (room.foto_url) { const img = W.node('img'); img.src = room.foto_url; img.alt = 'Foto ' + room.tipe; img.loading = 'lazy'; photo.appendChild(img); }
    else photo.appendChild(W.node('span', 'Foto kamar akan ditampilkan', 'hint'));
    const body = W.node('div', null, 'room-card-body');
    body.append( W.node('h3', room.tipe + ' · Kamar ' + room.nomor_kamar), W.node('div', 'Kapasitas ' + room.kapasitas + ' orang', 'room-meta'));
    body.appendChild(W.node('p', room.fasilitas || 'Fasilitas belum diperbarui.', 'hint'));
    const price = W.node('div', null, 'room-price'); price.textContent = 'Umum ' + W.money(room.harga_umum) + ' · Dinas ' + W.money(room.harga_dinas) + ' / malam'; body.appendChild(price);
    const actions = W.node('div', null, 'room-card-actions'); const link = W.node('a', 'Lihat detail', 'btn btn-outline btn-small'); link.href = 'detail.html?id=' + encodeURIComponent(room.id); actions.appendChild(link); body.appendChild(actions); card.append(photo, body); return card;
  }
  W.renderRoomCard = roomCard;
})();
