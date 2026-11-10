(function () {
  'use strict';
  function apiUrl() {
    const url = window.WPR_CONFIG && window.WPR_CONFIG.API_URL;
    if (!url || url.indexOf('ISI_URL') === 0) throw new Error('URL Web App Apps Script belum diisi pada assets/js/config.js.');
    return url;
  }
  // Indicador global de actividad para llamadas al backend.
  let activeRequests = 0, showTimer = null, hideTimer = null;
  function ensureLoader() {
    if (document.getElementById('wpr-global-loader')) return;
    const style = document.createElement('style');
    style.textContent = `
      #wpr-global-loader{position:fixed;z-index:99999;top:16px;right:18px;display:flex;align-items:center;gap:10px;padding:10px 15px;background:#173c36;color:#fff;border-radius:999px;box-shadow:0 8px 28px #102b4e30;font:600 13px/1.2 Inter,Segoe UI,Arial,sans-serif;opacity:0;transform:translateY(-8px);pointer-events:none;transition:opacity .2s,transform .2s}
      #wpr-global-loader.visible{opacity:1;transform:translateY(0)}
      #wpr-global-loader .wpr-spinner{width:16px;height:16px;border:2px solid #ffffff55;border-top-color:#e7c994;border-radius:50%;animation:wpr-spin .7s linear infinite}
      #wpr-global-progress{position:fixed;z-index:100000;top:0;left:0;width:100%;height:3px;pointer-events:none;opacity:0;transition:opacity .2s}
      #wpr-global-progress.visible{opacity:1}
      #wpr-global-progress:before{content:"";display:block;width:34%;height:100%;background:#c49a58;box-shadow:0 0 12px #c49a58;animation:wpr-progress 1.15s ease-in-out infinite}
      @keyframes wpr-spin{to{transform:rotate(360deg)}}
      @keyframes wpr-progress{0%{transform:translateX(-110%)}100%{transform:translateX(310%)}}
      @media(max-width:560px){#wpr-global-loader{top:auto;bottom:16px;right:12px}}
      @media(prefers-reduced-motion:reduce){#wpr-global-loader .wpr-spinner,#wpr-global-progress:before{animation:none}}
    `;
    document.head.appendChild(style);
    const pill=document.createElement('div');pill.id='wpr-global-loader';pill.setAttribute('role','status');pill.setAttribute('aria-live','polite');
    const spin=document.createElement('span');spin.className='wpr-spinner';spin.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent='Sedang memproses…';pill.append(spin,label);
    const bar=document.createElement('div');bar.id='wpr-global-progress';
    document.body.append(pill,bar);
  }
  function beginActivity() {
    activeRequests++;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer=null; }
    if (showTimer) clearTimeout(showTimer);
    showTimer=setTimeout(()=>{ensureLoader();const pill=document.getElementById('wpr-global-loader'),bar=document.getElementById('wpr-global-progress');if(pill)pill.classList.add('visible');if(bar)bar.classList.add('visible');},180);
  }
  function endActivity() {
    activeRequests=Math.max(0,activeRequests-1);
    if(activeRequests===0){
      if(showTimer){clearTimeout(showTimer);showTimer=null;}
      hideTimer=setTimeout(()=>{const pill=document.getElementById('wpr-global-loader'),bar=document.getElementById('wpr-global-progress');if(pill)pill.classList.remove('visible');if(bar)bar.classList.remove('visible');},220);
    }
  }
  function tracked(task) { beginActivity(); return Promise.resolve().then(task).finally(endActivity); }

  function getRaw(action, params) {
    return new Promise((resolve, reject) => {
      let url;
      try { url = new URL(apiUrl()); } catch (e) { reject(e); return; }
      url.searchParams.set('action', action);
      Object.keys(params || {}).forEach(k => url.searchParams.set(k, params[k]));
      const callback = 'wpr_cb_' + Math.random().toString(36).slice(2);
      url.searchParams.set('callback', callback);
      const script = document.createElement('script');
      const timer = window.setTimeout(() => finish(new Error('Server tidak merespons. Periksa URL dan deployment Apps Script.')), 15000);
      function finish(error, data) {
        window.clearTimeout(timer);
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        script.remove();
        if (error) reject(error); else if (!data || (action !== 'result' && data.ok === false)) reject(new Error((data && data.error) || 'Permintaan gagal.')); else resolve(data);
      }
      window[callback] = data => finish(null, data);
      script.onerror = () => finish(new Error('Tidak dapat menghubungi API Google Apps Script.'));
      script.src = url.toString(); document.head.appendChild(script);
    });
  }
  function postRaw(action, data, token) {
    return new Promise((resolve, reject) => {
      let endpoint;
      try { endpoint = apiUrl(); } catch (e) { reject(e); return; }
      const requestId = 'wpr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
      const payload = { action, data: data || {}, token: token || '', request_id: requestId };
      const frameName = 'wpr_frame_' + requestId.replace(/[^a-zA-Z0-9_]/g, '');
      const iframe = document.createElement('iframe'); iframe.name = frameName; iframe.style.display = 'none'; iframe.title = 'Pengiriman formulir';
      const form = document.createElement('form'); form.method = 'POST'; form.action = endpoint; form.target = frameName; form.style.display = 'none';
      const input = document.createElement('input'); input.type = 'hidden'; input.name = 'payload'; input.value = JSON.stringify(payload); form.appendChild(input);
      document.body.append(iframe, form);
      let finished = false; let attempts = 0;
      function cleanup() { form.remove(); iframe.remove(); }
      function poll() {
        if (finished) return;
        attempts += 1;
        getRaw('result', { request_id: requestId }).then(result => {
          if (result.pending) {
            if (attempts < 22) window.setTimeout(poll, 800);
            else { finished = true; cleanup(); reject(new Error('Server belum memberikan hasil. Periksa koneksi atau Apps Script Executions.')); }
            return;
          }
          finished = true; cleanup();
          if (result.ok === false) reject(new Error(result.error || 'Permintaan gagal.'));
          else resolve(result);
        }).catch(err => {
          if (attempts < 22) window.setTimeout(poll, 800);
          else { finished = true; cleanup(); reject(err); }
        });
      }
      form.submit();
      window.setTimeout(poll, 1000);
      window.setTimeout(() => { if (!finished) { finished = true; cleanup(); reject(new Error('Waktu permintaan habis. Coba lagi.')); } }, 21000);
    });
  }
  function get(action, params) { return tracked(() => getRaw(action, params)); }
  function getCached(action, params, ttlMs) {
    const key = 'wpr_c_' + action + '_' + JSON.stringify(params || {}); const ttl = ttlMs || 120000;
    try { const hit = JSON.parse(sessionStorage.getItem(key) || 'null'); if (hit && Date.now() - hit.t < ttl) return Promise.resolve(hit.d); } catch (_) {}
    return get(action, params).then(d => { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (_) {} return d; });
  }
  function post(action, data, token) { return tracked(() => postRaw(action, data, token)); }
  window.WPR = Object.assign(window.WPR || {}, { api: { get, getCached, post } });
})();
