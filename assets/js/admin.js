(function () {
  'use strict'; const W = window.WPR; const token = localStorage.getItem('wpr_admin_token') || ''; const page = document.body.dataset.adminPage || '';
  const links = [ ['dashboard','dashboard.html','Dashboard'], ['pesanan','pesanan.html','Pesanan'], ['kamar','kamar.html','Kamar'], ['kalender','kalender.html','Kalender Okupansi'], ['laporan','laporan.html','Laporan'], ['pengguna','pengguna.html','Pengguna'], ['pengaturan','pengaturan.html','Pengaturan'] ];
  const sidebar = W.$('#admin-sidebar');
  if (sidebar) {
    const brand = W.node('div',null,'brand'); const img = W.node('img'); img.src='../assets/img/logo.svg'; img.alt=''; brand.append(img); const label = W.node('span','WP-ROOMS'); label.appendChild(W.node('small','ADMIN PANEL')); brand.appendChild(label); sidebar.appendChild(brand);
    links.forEach(([key,url,title]) => { const a = W.node('a',title); a.href=url; if(key===page) a.classList.add('active'); if(key==='pengguna'||key==='pengaturan') a.dataset.superOnly='true'; sidebar.appendChild(a); });
    const logout = W.node('button','Keluar','logout'); logout.addEventListener('click',logoutNow); sidebar.appendChild(logout);
  }
  function logoutNow(){ const oldToken=localStorage.getItem('wpr_admin_token')||''; if(oldToken&&W.api){W.api.post('logout',{},oldToken).catch(()=>{}).finally(()=>{localStorage.removeItem('wpr_admin_token');localStorage.removeItem('wpr_admin_user');window.location.href='login.html';});}else{localStorage.removeItem('wpr_admin_token');localStorage.removeItem('wpr_admin_user');window.location.href='login.html';} }
  const mobile = W.$('#mobile-menu'); if(mobile) mobile.addEventListener('click',()=>sidebar.classList.toggle('show-mobile'));
  if (!token) { window.location.href='login.html'; return; }
  W.api.post('me',{},token).then(data=>{
    if(data.user.wajib_ganti_password){ window.location.href='login.html?force_password=1'; return; }
    const userBox=W.$('#admin-who'); if(userBox) userBox.textContent=data.user.nama+' · '+data.user.role;
    if(data.user.role!=='SUPER_ADMIN'){ W.$$('.sidebar [data-super-only]').forEach(a=>a.remove()); }
    window.WPR_ADMIN={token,user:data.user,logout:logoutNow};
    document.dispatchEvent(new CustomEvent('wpr-admin-ready',{detail:{token,user:data.user}}));
  }).catch(err=>{localStorage.removeItem('wpr_admin_token');localStorage.removeItem('wpr_admin_user');window.location.href='login.html?expired=1';});
})();
