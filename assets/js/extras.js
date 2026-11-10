(function () {
  'use strict';
  var K = window.WPR_KONTEN || {};
  var W = window.WPR || {};
  var info = {};

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function validWa(n) { n = String(n || '').replace(/\D/g, ''); return n.length >= 9 ? n : ''; }
  function validAddr(a) { a = String(a || '').trim(); return a && !/^WAJIB DIISI/i.test(a) ? a : ''; }

  /* ---------- Tombol WhatsApp melayang (semua halaman publik) ---------- */
  function waButton() {
    var n = validWa(info.wa_admin) || validWa(K.wa);
    var old = document.getElementById('wa-float'); if (old) old.remove();
    if (!n) return;
    var a = el('a', 'wa-float');
    a.id = 'wa-float'; a.target = '_blank'; a.rel = 'noopener';
    a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent('Halo, saya ingin bertanya tentang kamar di ' + (info.nama_wisma || 'Wisma Pemda Jawa Tengah') + '.');
    a.setAttribute('aria-label', 'Chat WhatsApp');
    a.innerHTML = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M16 3C9 3 3.4 8.6 3.4 15.5c0 2.3.6 4.4 1.7 6.3L3 29l7.4-2c1.8 1 3.800 1.500 5.600 1.500 7 0 12.600-5.600 12.600-12.500S23 3 16 3zm0 22.800c-1.800 0-3.500-.5-5-1.400l-.4-.2-4.400 1.200 1.200-4.300-.3-.4a10.200 10.200 0 0 1-1.600-5.500C5.500 9.700 10.200 5.200 16 5.200s10.500 4.500 10.500 10.300S21.800 25.800 16 25.800zm5.800-7.600c-.3-.2-1.900-.9-2.200-1-.3-.1-.5-.2-.7.200l-1 1.200c-.2.200-.4.200-.7.100a8.500 8.500 0 0 1-4.200-3.700c-.3-.6.300-.5.900-1.700.1-.2 0-.4 0-.5l-1-2.300c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.100-.9.400s-1.200 1.200-1.200 2.800 1.200 3.300 1.400 3.500c.2.200 2.400 3.700 5.800 5.100 2.100.9 2.900.9 3.900.8.600-.1 1.900-.8 2.200-1.600.3-.8.300-1.400.2-1.600-.1-.1-.3-.2-.6-.4z"/></svg><span>Tanya via WhatsApp</span>';
    document.body.appendChild(a);
  }

  /* ---------- Bagian beranda ---------- */
  function section(id, kicker, title, sub, muted) {
    var s = el('section', 'section' + (muted ? ' section-muted' : '')); s.id = id;
    var c = el('div', 'container'); var h = el('div', 'section-head');
    h.appendChild(el('span', 'section-kicker', kicker)); h.appendChild(el('h2', null, title));
    if (sub) h.appendChild(el('p', null, sub));
    c.appendChild(h); s.appendChild(c); return { s: s, c: c };
  }

  function buildHome(root) {
    root.textContent = '';
    if ((K.fasilitas || []).length) {
      var f = section('fasilitas', 'Fasilitas', 'Yang Anda dapatkan saat menginap', 'Kebutuhan dasar untuk istirahat yang nyaman.', false);
      var g = el('div', 'amenity-grid');
      K.fasilitas.forEach(function (i) { var d = el('div', 'amenity'); d.appendChild(el('span', 'amenity-ico', i.ikon)); d.appendChild(el('span', null, i.nama)); g.appendChild(d); });
      f.c.appendChild(g); root.appendChild(f.s);
    }
    if ((K.atraksi || []).length) {
      var a = section('atraksi', 'Jelajahi sekitar', 'Wisata di Jawa Tengah', K.atraksiCatatan, true);
      var ag = el('div', 'attr-grid');
      K.atraksi.forEach(function (i, n) {
        var d = el('article', 'attr'); d.appendChild(el('span', 'attr-no', String(n + 1).padStart(2, '0')));
        d.appendChild(el('h3', null, i.judul)); d.appendChild(el('p', null, i.teks)); ag.appendChild(d);
      });
      a.c.appendChild(ag); root.appendChild(a.s);
    }
    if ((K.ulasan || []).length) {
      var u = section('ulasan', 'Kata tamu', 'Pengalaman mereka menginap', '', false);
      var ug = el('div', 'review-grid');
      K.ulasan.forEach(function (i) {
        var d = el('blockquote', 'review'); d.appendChild(el('p', null, '“' + i.teks + '”'));
        d.appendChild(el('footer', null, i.nama + (i.asal ? ' • ' + i.asal : ''))); ug.appendChild(d);
      });
      u.c.appendChild(ug); root.appendChild(u.s);
    }
    if ((K.faq || []).length) {
      var q = section('faq', 'Pertanyaan umum', 'Sebelum Anda memesan', '', true);
      var w = el('div', 'faq');
      K.faq.forEach(function (i) { var d = el('details'); d.appendChild(el('summary', null, i.t)); d.appendChild(el('p', null, i.j)); w.appendChild(d); });
      q.c.appendChild(w); root.appendChild(q.s);
    }
    var addr = validAddr(info.alamat) || validAddr(K.alamat);
    var src = K.petaLink || (addr ? 'https://www.google.com/maps?q=' + encodeURIComponent(addr) + '&output=embed' : '');
    var l = section('lokasi', 'Lokasi', 'Temukan kami', addr || 'Alamat akan segera ditampilkan.', false);
    if (src) {
      var fr = el('iframe', 'map-frame'); fr.loading = 'lazy'; fr.title = 'Peta lokasi wisma'; fr.referrerPolicy = 'no-referrer-when-downgrade'; fr.src = src; fr.style.height = '360px';
      l.c.appendChild(fr);
    }
    var p = el('p', null); p.style.cssText = 'text-align:center;margin-top:20px';
    var b = el('a', 'btn btn-outline', 'Informasi Kontak'); b.href = 'kontak.html'; p.appendChild(b); l.c.appendChild(p);
    root.appendChild(l.s);
  }

  /* ---------- SEO: data terstruktur ---------- */
  function jsonLd() {
    var o = { '@context': 'https://schema.org', '@type': 'LodgingBusiness', name: info.nama_wisma || 'Wisma Pemda Jawa Tengah', description: 'Penginapan Wisma Pemda Jawa Tengah: lihat kamar, cek ketersediaan, dan pesan daring.', inLanguage: 'id' };
    var addr = validAddr(info.alamat) || validAddr(K.alamat); if (addr) o.address = { '@type': 'PostalAddress', streetAddress: addr, addressCountry: 'ID' };
    var n = validWa(info.wa_admin) || validWa(K.wa); if (n) o.telephone = '+' + n;
    if (K.ogImage) o.image = K.ogImage;
    var s = document.getElementById('ld-json') || el('script'); s.id = 'ld-json'; s.type = 'application/ld+json'; s.textContent = JSON.stringify(o);
    if (!s.parentNode) document.head.appendChild(s);
  }

  function homeGallery() {
    var figs = document.querySelectorAll('.editorial-gallery figure');
    if (!figs.length || !W.api || !W.api.get) return;
    W.api.get('listGallery').then(function (d) {
      var list = (d && d.items) || [];
      if (list.length < 3) return;
      figs.forEach(function (f, n) {
        var it = list[n]; if (!it) return;
        var img = f.querySelector('img'); if (img) { img.src = it.src; img.alt = it.judul; }
        var st = f.querySelector('strong'); if (st) st.textContent = it.judul;
        var sp = f.querySelector('figcaption span'); if (sp) sp.textContent = it.kategori;
      });
    }).catch(function () {});
  }

  function render() {
    waButton();
    var root = document.getElementById('home-extra');
    if (root) { buildHome(root); jsonLd(); }
  }

  homeGallery();
  render(); // langsung dengan data cadangan
  if (W.api && W.api.get) {
    W.api.get('publicInfo').then(function (d) { info = (d && d.info) || {}; render(); }).catch(function () {});
  }
})();
