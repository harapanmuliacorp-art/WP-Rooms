(function () {
  'use strict';
  const W = window.WPR; let token = '', items = [];
  const $ = s => document.querySelector(s);
  function msg(t, type) { W.alertBox($('#g-message'), t, type); }

  document.addEventListener('wpr-admin-ready', e => { token = e.detail.token; load(); });

  async function load() {
    try { const d = await W.api.post('adminGallery', {}, token); items = d.items || []; render(); }
    catch (err) { $('#g-list').textContent = ''; msg(err.message, 'error'); }
  }

  function render() {
    const list = $('#g-list'); list.textContent = '';
    $('#g-count').textContent = items.length ? '(' + items.length + ')' : '';
    const cats = [...new Set(items.map(i => i.kategori))];
    $('#g-cats').replaceChildren(...cats.map(c => { const o = document.createElement('option'); o.value = c; return o; }));
    if (!items.length) { list.appendChild(W.node('p', 'Belum ada foto. Tambahkan lewat formulir di atas. Selama kosong, website menampilkan foto contoh.', 'muted')); return; }
    items.forEach(it => {
      const card = W.node('figure', null, 'g-admin-card' + (it.status_aktif ? '' : ' off'));
      const img = document.createElement('img'); img.src = it.foto_url; img.alt = it.judul; img.loading = 'lazy';
      const cap = W.node('figcaption'); cap.appendChild(W.node('strong', it.judul)); cap.appendChild(W.node('span', it.kategori + ' • urutan ' + it.urutan + (it.status_aktif ? '' : ' • disembunyikan'), 'muted'));
      const act = W.node('div', null, 'inline-actions');
      const edit = W.node('button', 'Edit', 'action-btn gold'); edit.type = 'button'; edit.addEventListener('click', () => fill(it));
      const tog = W.node('button', it.status_aktif ? 'Sembunyikan' : 'Tampilkan', 'action-btn gray'); tog.type = 'button';
      tog.addEventListener('click', () => quick(it, { status_aktif: !it.status_aktif }, tog));
      const del = W.node('button', 'Hapus', 'action-btn red'); del.type = 'button'; del.addEventListener('click', () => remove(it, del));
      act.append(edit, tog, del); card.append(img, cap, act); list.appendChild(card);
    });
  }

  function payloadOf(it, extra) { return Object.assign({ id: it.id, judul: it.judul, kategori: it.kategori, urutan: it.urutan, status_aktif: it.status_aktif, foto_url: it.foto_url }, extra); }
  async function quick(it, patch, btn) {
    W.setBusy(btn, true, '…');
    try { await W.api.post('saveGallery', payloadOf(it, patch), token); await load(); } catch (err) { msg(err.message, 'error'); } finally { W.setBusy(btn, false); }
  }
  async function remove(it, btn) {
    if (!confirm('Hapus foto "' + it.judul + '" dari galeri? Tindakan ini tidak bisa dibatalkan.')) return;
    W.setBusy(btn, true, 'Menghapus…');
    try { await W.api.post('deleteGallery', { id: it.id }, token); await load(); } catch (err) { msg(err.message, 'error'); } finally { W.setBusy(btn, false); }
  }

  function fill(it) {
    $('#g-id').value = it.id; $('#g-title').value = it.judul; $('#g-cat').value = it.kategori; $('#g-order').value = it.urutan;
    $('#g-active').value = String(it.status_aktif); $('#g-url').value = /^https:\/\/lh3\.googleusercontent\.com\//.test(it.foto_url) ? '' : it.foto_url;
    $('#g-files').value = ''; $('#g-form-title').textContent = 'Edit Foto'; $('#g-save').textContent = 'Simpan Perubahan';
    const pv = $('#g-preview'); pv.classList.remove('hidden'); pv.replaceChildren(Object.assign(document.createElement('img'), { src: it.foto_url, alt: '' }), W.node('span', 'Pilih file baru hanya jika ingin mengganti foto.', 'small-print'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() {
    $('#g-form').reset(); $('#g-id').value = ''; $('#g-form-title').textContent = 'Tambah Foto'; $('#g-save').textContent = 'Simpan Foto';
    $('#g-cat').value = 'Kamar'; $('#g-preview').classList.add('hidden'); $('#g-preview').textContent = '';
  }
  $('#g-reset').addEventListener('click', reset);

  // Kecilkan foto di browser: maks 1600px, JPEG. Menjaga unggahan di bawah batas 2 MB.
  function compress(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('"' + file.name + '" bukan JPG/PNG/WebP.'));
      const url = URL.createObjectURL(file); const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('"' + file.name + '" tidak bisa dibaca sebagai gambar.')); };
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1600, r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        let q = 0.85, data = c.toDataURL('image/jpeg', q);
        while (data.length * 0.75 > 1.7 * 1024 * 1024 && q > 0.4) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
        if (data.length * 0.75 > 1.9 * 1024 * 1024) return reject(new Error('"' + file.name + '" terlalu besar setelah dikecilkan.'));
        resolve({ name: 'foto.jpg', mimeType: 'image/jpeg', base64: data.split(',')[1] });
      };
      img.src = url;
    });
  }

  $('#g-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn = $('#g-save'); msg('', '');
    const id = $('#g-id').value; const files = [...$('#g-files').files];
    const base = { judul: $('#g-title').value.trim(), kategori: $('#g-cat').value.trim() || 'Umum', urutan: Number($('#g-order').value) || 0, status_aktif: $('#g-active').value === 'true' };
    const url = $('#g-url').value.trim();
    if (!id && !files.length && !url) return msg('Pilih minimal satu foto atau isi URL foto.', 'error');
    W.setBusy(btn, true, 'Mengunggah…');
    try {
      if (id) {
        const d = Object.assign({ id }, base); if (url) d.foto_url = url;
        if (files[0]) d.foto = await compress(files[0]);
        await W.api.post('saveGallery', d, token);
      } else if (files.length) {
        let ok = 0;
        for (const f of files) {
          btn.textContent = 'Mengunggah ' + (ok + 1) + '/' + files.length + '…';
          const judul = base.judul ? (files.length > 1 ? base.judul + ' ' + (ok + 1) : base.judul) : '';
          await W.api.post('saveGallery', Object.assign({}, base, { judul, foto: await compress(f) }), token); ok++;
        }
      } else { await W.api.post('saveGallery', Object.assign({}, base, { foto_url: url }), token); }
      reset(); msg('Foto berhasil disimpan.', 'success'); await load();
    } catch (err) { msg(err.message, 'error'); await load(); }
    finally { W.setBusy(btn, false); btn.textContent = id ? 'Simpan Perubahan' : 'Simpan Foto'; }
  });
})();
