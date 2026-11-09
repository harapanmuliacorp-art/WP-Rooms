(function () {
  'use strict';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  function node(tag, text, className) {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (className) n.className = className;
    return n;
  }
  function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0); }
  function dateId(value) {
    if (!value) return '-';
    const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
  }
  function dateTimeId(value) {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }
  function query(name) { return new URLSearchParams(window.location.search).get(name) || ''; }
  function alertBox(container, message, type) {
    container.replaceChildren();
    const box = node('div', message, 'alert' + (type ? ' ' + type : ''));
    container.appendChild(box);
  }
  function slugStatus(status) {
    if (['Lunas', 'Selesai'].includes(status)) return 'ok';
    if (['Ditolak', 'Dibatalkan', 'Kedaluwarsa'].includes(status)) return 'bad';
    return 'wait';
  }
  function statusBadge(status) { return node('span', status, 'status ' + slugStatus(status)); }
  function fileToPayload(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      if (file.size > 2 * 1024 * 1024) return reject(new Error('Ukuran file maksimal 2 MB.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File gagal dibaca.'));
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        resolve({ name: file.name, mimeType: file.type, base64: dataUrl.split(',')[1] || '' });
      };
      reader.readAsDataURL(file);
    });
  }
  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
      button.disabled = true; button.setAttribute('aria-busy','true');
      button.innerHTML = '<span class="wpr-button-spinner" aria-hidden="true"></span> ' + (label || 'Memproses…');
    } else {
      button.disabled = false; button.removeAttribute('aria-busy');
      button.textContent = button.dataset.originalText || 'Kirim';
      delete button.dataset.originalText;
    }
  }
  function todayISO() {
    const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  window.WPR = Object.assign(window.WPR || {}, { $, $$, node, money, dateId, dateTimeId, query, alertBox, statusBadge, fileToPayload, setBusy, todayISO });
})();
