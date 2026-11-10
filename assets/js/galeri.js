(function () {
  'use strict';
  var items = Array.isArray(window.WPR_GALLERY) ? window.WPR_GALLERY : [];
  var grid = document.getElementById('gallery-grid');
  var filters = document.getElementById('gallery-filters');
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('.lb-cap');
  var current = [];
  var idx = 0;
  var lastFocus = null;
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#dfe6df"/><text x="50%" y="50%" fill="#718078" font-family="Arial" font-size="26" text-anchor="middle">Foto belum tersedia</text></svg>');

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function render(cat) {
    current = items.filter(function (i) { return cat === 'Semua' || i.kategori === cat; });
    grid.textContent = '';
    if (!current.length) { grid.appendChild(el('div', 'empty', 'Belum ada foto untuk ditampilkan.')); return; }
    current.forEach(function (it, n) {
      var btn = el('button', 'g-item');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Perbesar foto: ' + it.judul);
      var img = el('img'); img.loading = 'lazy'; img.alt = it.judul || ''; img.src = it.src;
      img.onerror = function () { img.onerror = null; img.src = PLACEHOLDER; };
      var cap = el('span', 'g-cap', it.judul);
      btn.appendChild(img); btn.appendChild(cap);
      btn.addEventListener('click', function () { open(n); });
      grid.appendChild(btn);
    });
  }

  function buildFilters() {
    var cats = ['Semua'];
    items.forEach(function (i) { if (i.kategori && cats.indexOf(i.kategori) < 0) cats.push(i.kategori); });
    if (cats.length < 3) { filters.classList.add('hidden'); return; }
    cats.forEach(function (c, n) {
      var b = el('button', 'chip' + (n === 0 ? ' on' : ''), c);
      b.type = 'button';
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(filters.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on'); render(c);
      });
      filters.appendChild(b);
    });
  }

  function show() {
    var it = current[idx];
    lbImg.onerror = function () { lbImg.onerror = null; lbImg.src = PLACEHOLDER; };
    lbImg.src = it.src; lbImg.alt = it.judul || '';
    lbCap.textContent = (it.judul || '') + '  (' + (idx + 1) + '/' + current.length + ')';
  }
  function open(n) { lastFocus = document.activeElement; idx = n; show(); lb.classList.add('show'); document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); }
  function close() { lb.classList.remove('show'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  function step(d) { idx = (idx + d + current.length) % current.length; show(); }

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  function start() { buildFilters(); render('Semua'); }
  // Ambil foto dari admin (Google Sheet); bila kosong/gagal, pakai daftar contoh di galeri-data.js
  var W = window.WPR;
  if (W && W.api && W.api.get) {
    W.api.get('listGallery').then(function (d) {
      var list = (d && d.items) || [];
      if (list.length) items = list.map(function (i) { return { src: i.src, judul: i.judul, kategori: i.kategori }; });
      start();
    }).catch(start);
  } else start();
})();
