/**
 * WP-Rooms — Wisma Pemda Jawa Tengah
 * Backend Google Apps Script (V8).
 * Set Script Properties: SPREADSHEET_ID, FONNTE_TOKEN, (optional) DRIVE_FOLDER_ID,
 * SUPERADMIN_EMAIL. Jalankan setupDatabase() sekali dari editor Apps Script.
 */
const APP = {
  NAME: 'WP-Rooms',
  DEFAULT_SPREADSHEET_ID: '1-_8zEUJZWZSis1IRrVkN9Tr2ux15CGU_fBWC7C1YpsU',
  SESSION_HOURS: 8,
  MAX_FILE_BYTES: 2 * 1024 * 1024,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCK_MINUTES: 15,
  RESULT_CACHE_SECONDS: 300,
  PAGE_LIMIT: 500,
  ACTIVE_STATUSES: ['Menunggu Verifikasi', 'Disetujui', 'Menunggu Konfirmasi Bayar', 'Lunas', 'Check-in'],
  TERMINAL_STATUSES: ['Ditolak', 'Dibatalkan', 'Kedaluwarsa', 'Selesai'],
  MIME_EXT: { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'application/pdf': ['pdf'] },
  SHEETS: {
    Kamar: ['id', 'nomor_kamar', 'tipe', 'kapasitas', 'harga_dinas', 'harga_umum', 'fasilitas', 'foto_url', 'status_aktif'],
    Pesanan: ['kode_booking', 'timestamp', 'nama', 'instansi', 'nip', 'hp', 'email', 'id_kamar', 'checkin', 'checkout', 'malam', 'jumlah_tamu', 'jenis_tamu', 'keperluan', 'total', 'surat_tugas_url', 'bukti_bayar_url', 'status', 'alasan_penolakan', 'catatan_admin', 'diproses_oleh', 'batas_bayar'],
    Pengguna: ['id', 'nama', 'email', 'password_hash', 'salt', 'role', 'hp_notif', 'aktif', 'wajib_ganti_password'],
    Sesi: ['token', 'user_id', 'expired_at'],
    Pengaturan: ['key', 'value'],
    Log: ['timestamp', 'user', 'aksi', 'detail'],
    Galeri: ['id', 'judul', 'kategori', 'foto_url', 'file_id', 'urutan', 'status_aktif', 'dibuat'],
    LogNotif: ['timestamp', 'kode_booking', 'tujuan', 'jenis', 'status', 'respons_api']
  }
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health');
  try {
    let result;
    switch (action) {
      case 'health': result = { ok: true, app: APP.NAME, time: new Date().toISOString() }; break;
      case 'publicInfo': result = apiPublicInfo_(); break;
      case 'listRooms': result = apiListRooms_(); break;
      case 'listGallery': result = apiGallery_(); break;
      case 'getRoom': result = apiGetRoom_(params.id); break;
      case 'availableRooms': result = apiAvailableRooms_(params.checkin, params.checkout); break;
      case 'availability': result = apiAvailability_(params.id, params.checkin, params.checkout); break;
      case 'calendarAvailability': result = apiCalendarAvailability_(params.id, params.from, params.days); break;
      case 'result': result = apiReadResult_(params.request_id); break;
      default: throw new Error('Aksi tidak dikenal.');
    }
    return output_(result, params.callback);
  } catch (err) {
    return output_({ ok: false, error: safeError_(err) }, params.callback);
  }
}

function doPost(e) {
  let payload = {};
  let requestId = '';
  try {
    if (e && e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    requestId = String(payload.request_id || (e && e.parameter && e.parameter.request_id) || '');
    const result = dispatchPost_(payload);
    if (requestId) cacheResult_(requestId, result);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, request_id: requestId || '' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const result = { ok: false, error: safeError_(err) };
    if (requestId) cacheResult_(requestId, result);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
}

function dispatchPost_(p) {
  const action = String(p.action || '');
  switch (action) {
    case 'createBooking': return createBooking_(p.data || {});
    case 'track': return apiTrack_((p.data || {}).kode_booking, (p.data || {}).hp);
    case 'uploadPayment': return uploadPayment_(p.data || {});
    case 'cancelBooking': return cancelBooking_(p.data || {});
    case 'login': return login_(p.data || {});
    case 'changePassword': return changePassword_(p.token, p.data || {});
    case 'adminSummary': return adminSummary_(p.token);
    case 'adminBookings': return adminBookings_(p.token, p.data || {});
    case 'bookingAction': return bookingAction_(p.token, p.data || {});
    case 'resendNotification': return resendNotification_(p.token, p.data || {});
    case 'adminRooms': return adminRooms_(p.token);
    case 'saveRoom': return saveRoom_(p.token, p.data || {});
    case 'adminGallery': return adminGallery_(p.token);
    case 'saveGallery': return saveGallery_(p.token, p.data || {});
    case 'deleteGallery': return deleteGallery_(p.token, p.data || {});
    case 'occupancy': return occupancy_(p.token, p.data || {});
    case 'report': return report_(p.token, p.data || {});
    case 'adminUsers': return adminUsers_(p.token);
    case 'saveUser': return saveUser_(p.token, p.data || {});
    case 'adminSettings': return adminSettings_(p.token);
    case 'saveSettings': return saveSettings_(p.token, p.data || {});
    case 'me': return me_(p.token);
    case 'logout': return logout_(p.token);
    default: throw new Error('Aksi tidak dikenal.');
  }
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function cacheResult_(requestId, result) {
  // Simpan JSON biasa agar tidak membutuhkan Blob/gzip.
  // Ini menghindari error MIME: Blob object must have non-null content type.
  const json = JSON.stringify(result);
  CacheService.getScriptCache().put('WPR_RESULT_' + requestId, json, APP.RESULT_CACHE_SECONDS);
}
function apiReadResult_(requestId) {
  if (!requestId || !/^[A-Za-z0-9_-]{12,80}$/.test(String(requestId))) throw new Error('ID permintaan tidak valid.');
  const key = 'WPR_RESULT_' + requestId;
  const raw = CacheService.getScriptCache().get(key);
  if (!raw) return { ok: false, pending: true, error: 'Hasil belum tersedia atau sudah kedaluwarsa.' };
  CacheService.getScriptCache().remove(key);
  return JSON.parse(raw);
}

/* ----------------------------- DATABASE ----------------------------- */
function db_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID') || APP.DEFAULT_SPREADSHEET_ID;
  if (!props.getProperty('SPREADSHEET_ID')) props.setProperty('SPREADSHEET_ID', id);
  return SpreadsheetApp.openById(id);
}
function sheet_(name) {
  const sh = db_().getSheetByName(name);
  if (!sh) throw new Error('Sheet ' + name + ' belum ada. Jalankan setupDatabase().');
  return sh;
}
function rows_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null)).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}
/* ---- Cache baca publik (CacheService). Dibersihkan otomatis saat sheet terkait ditulis. ---- */
function cached_(key, seconds, fn) {
  const c = CacheService.getScriptCache();
  try { const hit = c.get(key); if (hit) return JSON.parse(hit); } catch (_) {}
  const value = fn();
  try { c.put(key, JSON.stringify(value), seconds); } catch (_) {}
  return value;
}
function bust_(name) {
  const map = { Kamar: ['C_rooms'], Pesanan: ['C_active'], Pengaturan: ['C_info'], Galeri: ['C_gallery'] };
  if (map[name]) { try { CacheService.getScriptCache().removeAll(map[name]); } catch (_) {} }
}
function activeRooms_() { return cached_('C_rooms', 600, () => rows_('Kamar').filter(r => truthy_(r.status_aktif)).map(publicRoom_)); }
function activeBookings_() {
  return cached_('C_active', 120, () => rows_('Pesanan')
    .filter(b => APP.ACTIVE_STATUSES.indexOf(String(b.status)) >= 0)
    .map(b => ({ id_kamar: String(b.id_kamar), checkin: dateStr_(b.checkin), checkout: dateStr_(b.checkout) })));
}
function append_(name, obj) {
  bust_(name);
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(headers.map(h => obj[h] === undefined ? '' : obj[h]));
}
function updateBy_(name, key, value, patch) {
  bust_(name);
  const sh = sheet_(name);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return false;
  const headers = data[0].map(String);
  const keyCol = headers.indexOf(key);
  if (keyCol < 0) throw new Error('Kolom ' + key + ' tidak ditemukan.');
  const patchKeys = Object.keys(patch);
  const indexes = patchKeys.map(k => headers.indexOf(k));
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][keyCol]) === String(value)) {
      patchKeys.forEach((k, i) => {
        if (indexes[i] >= 0) sh.getRange(r + 1, indexes[i] + 1).setValue(patch[k]);
      });
      return true;
    }
  }
  return false;
}
function findBy_(name, key, value) {
  return rows_(name).find(r => String(r[key]) === String(value)) || null;
}
function setting_(key, fallback) {
  const item = findBy_('Pengaturan', 'key', key);
  return item ? String(item.value) : fallback;
}
function saveLog_(user, action, detail) {
  append_('Log', { timestamp: new Date(), user: String(user || 'Sistem'), aksi: String(action), detail: String(detail || '').slice(0, 4000) });
}
function setupDatabase() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('SPREADSHEET_ID') || APP.DEFAULT_SPREADSHEET_ID;
  let ss;
  if (spreadsheetId) ss = SpreadsheetApp.openById(spreadsheetId);
  else {
    ss = SpreadsheetApp.openById(spreadsheetId);
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  Object.keys(APP.SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = APP.SHEETS[name];
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    else {
      const existing = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
      headers.forEach(h => { if (existing.indexOf(h) < 0) { sh.getRange(1, sh.getLastColumn() + 1).setValue(h); existing.push(h); } });
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#12345a').setFontColor('#ffffff');
  });
  const folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('WP-Rooms Private Files');
    props.setProperty('DRIVE_FOLDER_ID', folder.getId());
  }
  seedSettings_();
  seedRooms_();
  seedSuperAdmin_();
  saveLog_('setupDatabase', 'INISIALISASI', 'Database WP-Rooms diperiksa/dibuat.');
  return 'Setup selesai. Spreadsheet: ' + ss.getUrl() + '. Periksa Execution log untuk kredensial Super Admin awal bila akun baru dibuat.';
}
function seedSettings_() {
  const defaults = {
    nama_wisma: 'Wisma Pemda Jawa Tengah',
    alamat: 'WAJIB DIISI — alamat resmi wisma',
    wa_admin: 'WAJIB DIISI',
    rekening: 'WAJIB DIISI — bank, nomor rekening, dan nama pemilik',
    jam_checkin: '14:00',
    jam_checkout: '12:00',
    batas_bayar_jam: '24',
    template_pesanan_baru_tamu: 'Terima kasih {{nama}}, pesanan {{kode_booking}} telah kami terima dan sedang menunggu verifikasi.',
    template_pesanan_baru_admin: 'Pesanan baru {{kode_booking}} dari {{nama}} ({{instansi}}), check-in {{checkin}}.',
    template_disetujui: 'Pesanan {{kode_booking}} disetujui. Total {{total}}. Transfer ke {{rekening}} sebelum {{batas_bayar}}.',
    template_ditolak: 'Mohon maaf, pesanan {{kode_booking}} ditolak. Alasan: {{alasan}}.',
    template_bukti_bayar: 'Bukti pembayaran {{kode_booking}} dari {{nama}} telah diunggah. Mohon verifikasi.',
    template_lunas: 'Pembayaran {{kode_booking}} telah dikonfirmasi lunas. Terima kasih.',
    template_reminder_h1: 'Pengingat: besok Anda check-in untuk booking {{kode_booking}}. Check-in mulai {{jam_checkin}}.',
    template_kedaluwarsa: 'Batas pembayaran booking {{kode_booking}} telah terlewati. Pesanan otomatis kedaluwarsa.',
    template_selesai: 'Terima kasih telah menginap di {{nama_wisma}}. Semoga perjalanan Anda menyenangkan.'
  };
  const current = rows_('Pengaturan');
  Object.keys(defaults).forEach(key => { if (!current.some(x => String(x.key) === key)) append_('Pengaturan', { key, value: defaults[key] }); });
}
function seedRooms_() {
  const sh = sheet_('Kamar');
  if (sh.getLastRow() > 1) return;
  const types = [
    { tipe: 'Suite', count: 2, prefix: 'S' },
    { tipe: 'VIP', count: 4, prefix: 'V' },
    { tipe: 'Superior', count: 8, prefix: 'SP' },
    { tipe: 'Standar', count: 12, prefix: 'ST' }
  ];
  const data = [];
  types.forEach(t => {
    for (let i = 1; i <= t.count; i++) {
      data.push([Utilities.getUuid(), t.prefix + '-' + String(i).padStart(2, '0'), t.tipe, t.tipe === 'Suite' ? 4 : (t.tipe === 'VIP' ? 3 : 2), 0, 0, 'WAJIB DIISI — fasilitas kamar', '', false]);
    }
  });
  sh.getRange(2, 1, data.length, data[0].length).setValues(data);
}
function seedSuperAdmin_() {
  if (rows_('Pengguna').some(u => String(u.role).toUpperCase() === 'SUPER_ADMIN')) return;
  const email = PropertiesService.getScriptProperties().getProperty('SUPERADMIN_EMAIL') || 'aditymaulino@gmail.com';
  const password = randomPassword_();
  const salt = Utilities.getUuid().replace(/-/g, '');
  append_('Pengguna', { id: Utilities.getUuid(), nama: 'Super Admin WP-Rooms', email: email.toLowerCase(), password_hash: hashPassword_(password, salt), salt, role: 'SUPER_ADMIN', hp_notif: '', aktif: true, wajib_ganti_password: true });
  Logger.log('WP-Rooms SUPER ADMIN AWAL — email: ' + email + ' | password sementara: ' + password + ' | WAJIB GANTI SAAT LOGIN PERTAMA. Simpan kredensial ini dengan aman.');
}

/**
 * Jalankan SATU KALI setelah mengisi Script Properties SUPERADMIN_EMAIL dan
 * SUPERADMIN_PASSWORD. Password tidak ditanam di source code; setelah hash
 * tersimpan, properti password langsung dihapus. Login pertama wajib ganti.
 */
function setupSuperAdminFromProperties() {
  const props = PropertiesService.getScriptProperties();
  const email = String(props.getProperty('SUPERADMIN_EMAIL') || 'aditymaulino@gmail.com').trim().toLowerCase();
  const password = String(props.getProperty('SUPERADMIN_PASSWORD') || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('SUPERADMIN_EMAIL tidak valid.');
  if (password.length < 8) throw new Error('Isi SUPERADMIN_PASSWORD (minimal 8 karakter) pada Script Properties sebelum menjalankan fungsi ini.');
  const users = rows_('Pengguna');
  const existing = users.find(u => String(u.email).toLowerCase() === email);
  const salt = Utilities.getUuid().replace(/-/g, '');
  const record = {
    nama: 'Super Admin WP-Rooms', email, password_hash: hashPassword_(password, salt), salt,
    role: 'SUPER_ADMIN', aktif: true, wajib_ganti_password: true
  };
  if (existing) updateBy_('Pengguna', 'id', existing.id, record);
  else append_('Pengguna', Object.assign({ id: Utilities.getUuid(), hp_notif: '' }, record));
  props.deleteProperty('SUPERADMIN_PASSWORD');
  props.setProperty('SUPERADMIN_EMAIL', email);
  saveLog_('Script Editor', 'SETUP_SUPER_ADMIN', 'Akun Super Admin disiapkan; password wajib diganti saat login pertama.');
  return 'Super Admin disiapkan untuk ' + email + '. Password sementara telah dihapus dari Script Properties; ganti password saat login pertama.';
}

function resetUserPassword(email, temporaryPassword) {
  const user = rows_('Pengguna').find(u => String(u.email).toLowerCase() === String(email || '').trim().toLowerCase());
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  const password = String(temporaryPassword || '');
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error('Password sementara minimal 12 karakter dan mengandung huruf serta angka.');
  const salt = Utilities.getUuid().replace(/-/g, '');
  updateBy_('Pengguna', 'id', user.id, { salt, password_hash: hashPassword_(password, salt), wajib_ganti_password: true });
  saveLog_('Script Editor', 'RESET_PASSWORD', 'Password akun ' + user.email + ' direset; wajib ganti saat login.');
  return 'Password sementara berhasil diatur. Sampaikan secara aman kepada pengguna.';
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyMaintenance').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(7).create();
  return 'Trigger harian terpasang (sekitar pukul 07.00 mengikuti timezone project).';
}

/* -------------------------- PUBLIC ENDPOINTS ------------------------- */
function apiPublicInfo_() {
  return cached_('C_info', 600, apiPublicInfoRaw_);
}
function apiPublicInfoRaw_() {
  return { ok: true, info: { nama_wisma: setting_('nama_wisma', 'Wisma Pemda Jawa Tengah'), alamat: setting_('alamat', ''), wa_admin: normalizePhone_(setting_('wa_admin', '')), jam_checkin: setting_('jam_checkin', '14:00'), jam_checkout: setting_('jam_checkout', '12:00') } };
}
function apiListRooms_() {
  return { ok: true, rooms: activeRooms_() };
}
function apiGetRoom_(id) {
  const room = activeRooms_().find(r => r.id === String(id));
  if (!room) throw new Error('Kamar tidak ditemukan atau sedang tidak tersedia.');
  return { ok: true, room };
}
function publicRoom_(r) {
  const photos = String(r.foto_url || '').split(/[\n,]+/).map(x => publicImageUrl_(x.trim())).filter(Boolean);
  return { id: String(r.id), nomor_kamar: String(r.nomor_kamar), tipe: String(r.tipe), kapasitas: Number(r.kapasitas) || 0, harga_dinas: Number(r.harga_dinas) || 0, harga_umum: Number(r.harga_umum) || 0, fasilitas: String(r.fasilitas || ''), foto_url: photos[0] || '', foto_urls: photos, status_aktif: truthy_(r.status_aktif) };
}
function apiAvailableRooms_(checkin, checkout) {
  validateDates_(checkin, checkout);
  const busy = {};
  activeBookings_().forEach(b => { if (overlaps_(checkin, checkout, b.checkin, b.checkout)) busy[b.id_kamar] = true; });
  return { ok: true, available_ids: activeRooms_().filter(r => !busy[r.id]).map(r => r.id) };
}
function apiAvailability_(id, checkin, checkout) {
  validateDates_(checkin, checkout);
  if (!activeRooms_().some(r => r.id === String(id))) throw new Error('Kamar tidak tersedia.');
  const conflicts = activeBookings_().filter(b => b.id_kamar === String(id) && overlaps_(checkin, checkout, b.checkin, b.checkout));
  return { ok: true, available: conflicts.length === 0, conflicts: conflicts.map(b => ({ checkin: b.checkin, checkout: b.checkout })) };
}
function apiCalendarAvailability_(id, from, count) {
  const days = Math.min(62, Math.max(7, Number(count) || 30));
  const start = String(from || isoToday_());
  validateDates_(start, addDays_(start, days));
  if (!activeRooms_().some(r => r.id === String(id))) throw new Error('Kamar tidak tersedia.');
  const bookings = activeBookings_().filter(b => b.id_kamar === String(id));
  const result = [];
  for (let i = 0; i < days; i++) {
    const day = addDays_(start, i);
    const busy = bookings.some(b => b.checkin <= day && b.checkout > day);
    result.push({ tanggal: day, tersedia: !busy });
  }
  return { ok: true, days: result };
}
function apiTrack_(code, phone) {
  const b = findBy_('Pesanan', 'kode_booking', String(code || '').trim().toUpperCase());
  if (!b || normalizePhone_(b.hp) !== normalizePhone_(phone)) throw new Error('Kode booking atau nomor HP tidak cocok.');
  const history = rows_('Log').filter(l => String(l.detail).indexOf(String(code).toUpperCase()) >= 0 && String(l.aksi).indexOf('STATUS:') === 0)
    .sort((a, c) => new Date(a.timestamp).getTime() - new Date(c.timestamp).getTime())
    .map(l => ({ waktu: dateTime_(l.timestamp), status: String(l.aksi).replace('STATUS: ', ''), keterangan: String(l.detail).slice(0, 240) }));
  const room = findBy_('Kamar', 'id', b.id_kamar);
  return { ok: true, booking: { kode_booking: String(b.kode_booking), nama: String(b.nama), tipe_kamar: room ? String(room.tipe) + ' — ' + String(room.nomor_kamar) : '-', checkin: dateStr_(b.checkin), checkout: dateStr_(b.checkout), malam: Number(b.malam), jumlah_tamu: Number(b.jumlah_tamu), jenis_tamu: String(b.jenis_tamu), total: Number(b.total), status: String(b.status), alasan_penolakan: String(b.alasan_penolakan || ''), batas_bayar: dateTime_(b.batas_bayar), rekening: String(b.status) === 'Disetujui' ? setting_('rekening', '') : '', bukti_bayar_tersedia: Boolean(b.bukti_bayar_url) }, history };
}
function createBooking_(d) {
  if (d.website) throw new Error('Permintaan tidak dapat diproses.');
  const name = required_(d.nama, 'Nama pemesan');
  if (name.length > 120) throw new Error('Nama maksimal 120 karakter.');
  const instansi = required_(d.instansi, 'Instansi / asal');
  if (instansi.length > 160) throw new Error('Instansi maksimal 160 karakter.');
  const phone = normalizePhone_(d.hp);
  if (!/^62\d{8,13}$/.test(phone)) throw new Error('Format nomor HP/WhatsApp tidak valid. Gunakan nomor aktif.');
  const email = String(d.email || '').trim();
  if (String(d.nip || '').length > 40) throw new Error('NIP maksimal 40 karakter.');
  const keperluan = required_(d.keperluan, 'Keperluan');
  if (keperluan.length > 250) throw new Error('Keperluan maksimal 250 karakter.')
  if (String(d.catatan || '').length > 1000) throw new Error('Catatan maksimal 1.000 karakter.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Format email tidak valid.');
  const checkin = String(d.checkin || '');
  const checkout = String(d.checkout || '');
  const nights = validateDates_(checkin, checkout);
  const guests = Number(d.jumlah_tamu);
  const room = findBy_('Kamar', 'id', d.id_kamar);
  if (!room || !truthy_(room.status_aktif)) throw new Error('Kamar tidak aktif atau tidak ditemukan.');
  if (!Number.isInteger(guests) || guests < 1 || guests > Number(room.kapasitas)) throw new Error('Jumlah tamu melebihi kapasitas kamar.');
  const guestType = String(d.jenis_tamu || '');
  if (['Dinas', 'Umum'].indexOf(guestType) < 0) throw new Error('Jenis tamu tidak valid.');
  if (guestType === 'Dinas' && !d.surat_tugas) throw new Error('Surat tugas wajib diunggah untuk tamu Dinas.');
  if (d.surat_tugas) validateUpload_(d.surat_tugas);
  const rate = guestType === 'Dinas' ? Number(room.harga_dinas) : Number(room.harga_umum);
  if (!(rate > 0)) throw new Error('Tarif kamar belum diatur. Silakan hubungi pengelola wisma.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let code = '';
  let result;
  try {
    // Wajib cek ulang ketersediaan DI DALAM lock untuk mencegah double booking bersamaan.
    const conflict = rows_('Pesanan').some(b => String(b.id_kamar) === String(room.id) && APP.ACTIVE_STATUSES.indexOf(String(b.status)) >= 0 && overlaps_(checkin, checkout, dateStr_(b.checkin), dateStr_(b.checkout)));
    if (conflict) throw new Error('Maaf, kamar baru saja dipesan pada tanggal tersebut. Silakan pilih kamar atau tanggal lain.');
    code = newBookingCode_();
    const suratUrl = d.surat_tugas ? savePrivateFile_(d.surat_tugas, 'Surat-Tugas-' + code) : '';
    append_('Pesanan', {
      kode_booking: code, timestamp: new Date(), nama: name, instansi: instansi, nip: String(d.nip || '').trim(), hp: phone, email,
      id_kamar: room.id, checkin, checkout, malam: nights, jumlah_tamu: guests, jenis_tamu: guestType,
      keperluan: keperluan, total: rate * nights, surat_tugas_url: suratUrl, bukti_bayar_url: '',
      status: 'Menunggu Verifikasi', alasan_penolakan: '', catatan_admin: String(d.catatan || '').trim(), diproses_oleh: '', batas_bayar: ''
    });
    saveLog_('Tamu', 'STATUS: Menunggu Verifikasi', 'Booking ' + code + ' dibuat oleh ' + name + '.');
    result = { ok: true, kode_booking: code, status: 'Menunggu Verifikasi', total_estimasi: rate * nights, malam: nights, checkin, checkout };
  } finally { lock.releaseLock(); }

  // Kirim WA setelah lock dilepas agar request jaringan tidak menahan antrean pemesanan.
  const booking = findBy_('Pesanan', 'kode_booking', code);
  notifyBooking_(booking, 'pesanan_baru_tamu');
  sendWhatsApp_(setting_('wa_admin', ''), renderTemplate_(setting_('template_pesanan_baru_admin', ''), booking), code, 'pesanan_baru_admin');
  return result;
}

function uploadPayment_(d) {
  const code = String(d.kode_booking || '').trim().toUpperCase();
  const phone = normalizePhone_(d.hp);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  let current; let expired = false;
  try {
    const b = findBy_('Pesanan', 'kode_booking', code);
    if (!b || normalizePhone_(b.hp) !== phone) throw new Error('Kode booking atau nomor HP tidak cocok.');
    if (String(b.status) !== 'Disetujui') throw new Error('Bukti pembayaran hanya dapat diunggah saat status Disetujui.');
    if (b.batas_bayar && new Date(b.batas_bayar).getTime() <= Date.now()) {
      updateBy_('Pesanan', 'kode_booking', code, { status: 'Kedaluwarsa' });
      saveLog_('Sistem', 'STATUS: Kedaluwarsa', 'Booking ' + code + ' kedaluwarsa sebelum bukti pembayaran diunggah.');
      current = findBy_('Pesanan', 'kode_booking', code);
      expired = true;
    } else {
      validateUpload_(d.file);
      const url = savePrivateFile_(d.file, 'Bukti-Bayar-' + code);
      updateBy_('Pesanan', 'kode_booking', code, { bukti_bayar_url: url, status: 'Menunggu Konfirmasi Bayar' });
      saveLog_('Tamu', 'STATUS: Menunggu Konfirmasi Bayar', 'Bukti pembayaran diunggah untuk ' + code + '.');
      current = findBy_('Pesanan', 'kode_booking', code);
    }
  } finally { lock.releaseLock(); }
  if (expired) {
    notifyBooking_(current, 'kedaluwarsa');
    throw new Error('Batas pembayaran telah berakhir. Pesanan otomatis kedaluwarsa. Silakan buat pemesanan baru.');
  }
  sendWhatsApp_(setting_('wa_admin', ''), renderTemplate_(setting_('template_bukti_bayar', 'Bukti pembayaran {{kode_booking}} telah diunggah.'), current), code, 'bukti_bayar');
  return { ok: true, status: 'Menunggu Konfirmasi Bayar', message: 'Bukti pembayaran berhasil diunggah.' };
}

function cancelBooking_(d) {
  const code = String(d.kode_booking || '').trim().toUpperCase();
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const b = findBy_('Pesanan', 'kode_booking', code);
    if (!b || normalizePhone_(b.hp) !== normalizePhone_(d.hp)) throw new Error('Kode booking atau nomor HP tidak cocok.');
    if (APP.TERMINAL_STATUSES.indexOf(String(b.status)) >= 0 || String(b.status) === 'Check-in') throw new Error('Pesanan tidak dapat dibatalkan pada status saat ini.');
    updateBy_('Pesanan', 'kode_booking', code, { status: 'Dibatalkan' });
    saveLog_('Tamu', 'STATUS: Dibatalkan', 'Booking ' + code + ' dibatalkan oleh tamu.');
    return { ok: true, status: 'Dibatalkan' };
  } finally { lock.releaseLock(); }
}

/* -------------------------- AUTH / SESSIONS --------------------------- */
function hashPassword_(password, salt) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + String(password), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}
function randomPassword_() { return 'Wpr!' + Utilities.getUuid().replace(/-/g, '').slice(0, 28); }
function login_(d) {
  const email = String(d.email || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const key = 'WPR_LOGIN_' + Utilities.base64EncodeWebSafe(email).slice(0, 50);
  const blockedUntil = Number(cache.get(key + '_BLOCK') || 0);
  if (blockedUntil > Date.now()) throw new Error('Login sementara diblokir karena terlalu banyak percobaan. Coba lagi setelah 15 menit.');
  const user = rows_('Pengguna').find(u => String(u.email).toLowerCase() === email && truthy_(u.aktif));
  const password = String(d.password || '');
  const valid = user && hashPassword_(password, String(user.salt)) === String(user.password_hash);
  if (!valid) {
    const attempts = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(attempts), APP.LOGIN_LOCK_MINUTES * 60);
    if (attempts >= APP.LOGIN_MAX_ATTEMPTS) { cache.put(key + '_BLOCK', String(Date.now() + APP.LOGIN_LOCK_MINUTES * 60000), APP.LOGIN_LOCK_MINUTES * 60); cache.remove(key); }
    throw new Error('Email atau password salah.');
  }
  cache.remove(key); cache.remove(key + '_BLOCK');
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const expired = new Date(Date.now() + APP.SESSION_HOURS * 3600000);
  append_('Sesi', { token, user_id: user.id, expired_at: expired });
  saveLog_(user.email, 'LOGIN', 'Login berhasil.');
  return { ok: true, token, expired_at: expired.toISOString(), must_change_password: truthy_(user.wajib_ganti_password), user: publicUser_(user) };
}
function sessionUser_(token, allowMustChange) {
  if (!token) throw new Error('Sesi tidak ditemukan. Silakan login kembali.');
  const cache = CacheService.getScriptCache(); const ck = 'S_' + token; let session = null;
  try { const hit = cache.get(ck); if (hit) session = JSON.parse(hit); } catch (_) {}
  if (!session) {
    const row = rows_('Sesi').find(s => String(s.token) === String(token));
    if (row) { session = { user_id: String(row.user_id), expired_at: row.expired_at instanceof Date ? row.expired_at.toISOString() : String(row.expired_at) }; try { cache.put(ck, JSON.stringify(session), 300); } catch (_) {} }
  }
  if (!session || new Date(session.expired_at).getTime() <= Date.now()) throw new Error('Sesi telah kedaluwarsa. Silakan login kembali.');
  const user = findBy_('Pengguna', 'id', session.user_id);
  if (!user || !truthy_(user.aktif)) throw new Error('Akun tidak aktif.');
  if (!allowMustChange && truthy_(user.wajib_ganti_password)) throw new Error('Anda wajib mengganti password sementara terlebih dahulu.');
  return user;
}
function publicUser_(u) { return { id: String(u.id), nama: String(u.nama), email: String(u.email), role: String(u.role), hp_notif: String(u.hp_notif || ''), wajib_ganti_password: truthy_(u.wajib_ganti_password) }; }
function changePassword_(token, d) {
  const user = sessionUser_(token, true);
  const oldPassword = String(d.password_lama || '');
  if (hashPassword_(oldPassword, String(user.salt)) !== String(user.password_hash)) throw new Error('Password lama tidak sesuai.');
  const next = String(d.password_baru || '');
  if (next.length < 12 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) throw new Error('Password baru minimal 12 karakter dan harus mengandung huruf serta angka.');
  const salt = Utilities.getUuid().replace(/-/g, '');
  updateBy_('Pengguna', 'id', user.id, { salt, password_hash: hashPassword_(next, salt), wajib_ganti_password: false });
  saveLog_(user.email, 'GANTI_PASSWORD', 'Password diperbarui.');
  return { ok: true, user: publicUser_(findBy_('Pengguna', 'id', user.id)) };
}
function me_(token) { const u = sessionUser_(token, true); return { ok: true, user: publicUser_(u) }; }
function logout_(token) {
  try { CacheService.getScriptCache().remove('S_' + String(token || '')); } catch (_) {}
  const sh = sheet_('Sesi'); const data = sh.getDataRange().getValues();
  if (data.length > 1) { const col = data[0].map(String).indexOf('token'); for (let i = data.length - 1; i >= 1; i--) { if (String(data[i][col]) === String(token || '')) sh.deleteRow(i + 1); } }
  return { ok: true };
}
function requireAdmin_(token) { const u = sessionUser_(token, false); if (['ADMIN', 'SUPER_ADMIN'].indexOf(String(u.role).toUpperCase()) < 0) throw new Error('Akses admin ditolak.'); return u; }
function requireSuper_(token) { const u = requireAdmin_(token); if (String(u.role).toUpperCase() !== 'SUPER_ADMIN') throw new Error('Fitur hanya untuk Super Admin.'); return u; }

/* ------------------------------ ADMIN -------------------------------- */
function adminSummary_(token) {
  const u = requireAdmin_(token); const bookings = rows_('Pesanan'); const today = isoToday_(); const month = today.slice(0, 7);
  const rooms = rows_('Kamar').filter(r => truthy_(r.status_aktif));
  const todayCheckin = bookings.filter(b => dateStr_(b.checkin) === today && ['Lunas', 'Check-in'].includes(String(b.status))).length;
  const todayCheckout = bookings.filter(b => dateStr_(b.checkout) === today && ['Lunas', 'Check-in', 'Selesai'].includes(String(b.status))).length;
  const occupied = bookings.filter(b => APP.ACTIVE_STATUSES.indexOf(String(b.status)) >= 0 && dateStr_(b.checkin) <= today && dateStr_(b.checkout) > today).length;
  const paidEvents = rows_('Log').filter(l => String(l.aksi) === 'STATUS: Lunas');
  const paidEntries = paidEvents.map(l => { const match = String(l.detail).match(/WPR-\d{8}-[A-F0-9]{4}/i); const booking = match ? bookings.find(b => String(b.kode_booking) === match[0]) : null; return booking ? { month: dateStr_(l.timestamp).slice(0, 7), total: Number(booking.total) || 0 } : null; }).filter(Boolean);
  const paidMonth = paidEntries.filter(x => x.month === month).reduce((sum, x) => sum + x.total, 0);
  const failedNotif = rows_('LogNotif').filter(n => String(n.status).toLowerCase() !== 'success' && String(n.status).toLowerCase() !== 'berhasil' && new Date(n.timestamp).getTime() > Date.now() - 30 * 86400000).length;
  const byMonth = {};
  paidEntries.forEach(x => { byMonth[x.month] = (byMonth[x.month] || 0) + x.total; });
  return { ok: true, stats: { pesanan_baru: bookings.filter(b => String(b.status) === 'Menunggu Verifikasi').length, checkin_hari_ini: todayCheckin, checkout_hari_ini: todayCheckout, okupansi: rooms.length ? Math.round(occupied / rooms.length * 100) : 0, kamar_terisi: occupied, total_kamar_aktif: rooms.length, pendapatan_bulan_ini: paidMonth, notif_gagal: failedNotif }, revenue: Object.keys(byMonth).sort().slice(-6).map(k => ({ bulan: k, total: byMonth[k] })) };
}
function adminBookings_(token, filter) {
  requireAdmin_(token);
  let data = rows_('Pesanan');
  if (filter.status) data = data.filter(b => String(b.status) === String(filter.status));
  if (filter.dari) data = data.filter(b => dateStr_(b.checkin) >= String(filter.dari));
  if (filter.sampai) data = data.filter(b => dateStr_(b.checkin) <= String(filter.sampai));
  data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  data = data.slice(0, Math.min(APP.PAGE_LIMIT, Math.max(1, Number(filter.limit) || 200)));
  const rooms = rows_('Kamar');
  return { ok: true, bookings: data.map(b => Object.assign({}, b, { checkin: dateStr_(b.checkin), checkout: dateStr_(b.checkout), timestamp: dateTime_(b.timestamp), batas_bayar: dateTime_(b.batas_bayar), hp: String(b.hp || ''), id_kamar: String(b.id_kamar), nomor_kamar: (rooms.find(r => String(r.id) === String(b.id_kamar)) || {}).nomor_kamar || '' })) };
}
function bookingAction_(token, d) {
  const user = requireAdmin_(token); const code = String(d.kode_booking || '').toUpperCase();
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  let current; let next = '';
  try {
    const b = findBy_('Pesanan', 'kode_booking', code);
    if (!b) throw new Error('Pesanan tidak ditemukan.');
    const action = String(d.aksi || '');
    if (action === 'approve' && String(b.status) === 'Menunggu Verifikasi') next = 'Disetujui';
    else if (action === 'reject' && String(b.status) === 'Menunggu Verifikasi') { next = 'Ditolak'; if (!String(d.alasan || '').trim()) throw new Error('Alasan penolakan wajib diisi.'); }
    else if (action === 'paid' && String(b.status) === 'Menunggu Konfirmasi Bayar') next = 'Lunas';
    else if (action === 'checkin' && String(b.status) === 'Lunas') next = 'Check-in';
    else if (action === 'complete' && String(b.status) === 'Check-in') next = 'Selesai';
    else if (action === 'cancel' && APP.ACTIVE_STATUSES.indexOf(String(b.status)) >= 0) next = 'Dibatalkan';
    else throw new Error('Aksi tidak sesuai dengan status pesanan saat ini.');
    const patch = { status: next, diproses_oleh: user.email, catatan_admin: String(d.catatan_admin || b.catatan_admin || '') };
    if (next === 'Disetujui') { const hours = Math.max(1, Number(setting_('batas_bayar_jam', '24')) || 24); patch.batas_bayar = new Date(Date.now() + hours * 3600000); }
    if (next === 'Ditolak') patch.alasan_penolakan = String(d.alasan).trim();
    updateBy_('Pesanan', 'kode_booking', code, patch);
    saveLog_(user.email, 'STATUS: ' + next, 'Booking ' + code + ' diubah menjadi ' + next + '.');
    current = findBy_('Pesanan', 'kode_booking', code);
  } finally { lock.releaseLock(); }
  if (next === 'Disetujui') notifyBooking_(current, 'disetujui');
  if (next === 'Ditolak') notifyBooking_(current, 'ditolak');
  if (next === 'Lunas') notifyBooking_(current, 'lunas');
  if (next === 'Selesai') notifyBooking_(current, 'selesai');
  return { ok: true, status: next };
}

function resendNotification_(token, d) {
  const user = requireAdmin_(token); const b = findBy_('Pesanan', 'kode_booking', String(d.kode_booking || '').toUpperCase());
  if (!b) throw new Error('Pesanan tidak ditemukan.');
  const type = String(d.jenis || 'status');
  const templateKey = ({ disetujui: 'template_disetujui', ditolak: 'template_ditolak', lunas: 'template_lunas', selesai: 'template_selesai', pesanan_baru_tamu: 'template_pesanan_baru_tamu' })[type];
  const message = templateKey ? renderTemplate_(setting_(templateKey, ''), b) : ('Informasi booking ' + b.kode_booking + ': status saat ini ' + b.status + '.');
  const result = sendWhatsApp_(b.hp, message, b.kode_booking, 'resend_' + type);
  saveLog_(user.email, 'KIRIM_ULANG_NOTIFIKASI', 'Booking ' + b.kode_booking + ', status API: ' + result.status);
  return { ok: true, status: result.status };
}
function adminRooms_(token) { requireAdmin_(token); return { ok: true, rooms: rows_('Kamar').map(r => Object.assign(publicRoom_(r), { foto_url: String(r.foto_url || '') })) }; }
function saveRoom_(token, d) {
  const user = requireAdmin_(token); const id = String(d.id || '');
  const room = { id: id || Utilities.getUuid(), nomor_kamar: required_(d.nomor_kamar, 'Nomor kamar'), tipe: required_(d.tipe, 'Tipe kamar'), kapasitas: Number(d.kapasitas), harga_dinas: Number(d.harga_dinas), harga_umum: Number(d.harga_umum), fasilitas: String(d.fasilitas || ''), foto_url: String(d.foto_url || ''), status_aktif: !!d.status_aktif };
  if (!Number.isInteger(room.kapasitas) || room.kapasitas < 1) throw new Error('Kapasitas harus bilangan positif.');
  if (room.foto_url) { const urls = room.foto_url.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); if (urls.some(x => !/^https:\/\//i.test(x) && !/^assets\/img\//i.test(x))) throw new Error('URL foto harus menggunakan HTTPS atau path assets/img/.'); }
  if (room.harga_dinas < 0 || room.harga_umum < 0 || !isFinite(room.harga_dinas) || !isFinite(room.harga_umum)) throw new Error('Harga tidak valid.');
  if (d.foto) { if (!['image/jpeg', 'image/png'].includes(String(d.foto.mimeType).toLowerCase())) throw new Error('Foto kamar harus berupa JPG atau PNG.'); validateUpload_(d.foto); room.foto_url = savePrivateFile_(d.foto, 'Foto-Kamar-' + room.nomor_kamar); }
  if (id && findBy_('Kamar', 'id', id)) updateBy_('Kamar', 'id', id, room);
  else append_('Kamar', room);
  saveLog_(user.email, 'SIMPAN_KAMAR', 'Kamar ' + room.nomor_kamar + ' disimpan.');
  return { ok: true, room: publicRoom_(room) };
}
function occupancy_(token, d) {
  requireAdmin_(token); const from = d.dari || isoToday_(); const days = Math.min(31, Math.max(7, Number(d.hari) || 14));
  const rooms = rows_('Kamar').filter(r => truthy_(r.status_aktif)); const bookings = rows_('Pesanan').filter(b => APP.ACTIVE_STATUSES.indexOf(String(b.status)) >= 0);
  const dates = []; const start = new Date(from + 'T00:00:00Z');
  for (let i = 0; i < days; i++) { const x = new Date(start.getTime() + i * 86400000); dates.push(x.toISOString().slice(0, 10)); }
  return { ok: true, dates, rooms: rooms.map(r => ({ id: String(r.id), nomor_kamar: String(r.nomor_kamar), tipe: String(r.tipe), days: dates.map(day => { const b = bookings.find(x => String(x.id_kamar) === String(r.id) && dateStr_(x.checkin) <= day && dateStr_(x.checkout) > day); return b ? { status: String(b.status), kode_booking: String(b.kode_booking), nama: String(b.nama) } : null; }) })) };
}
function report_(token, d) {
  requireAdmin_(token); const from = String(d.dari || '2000-01-01'), to = String(d.sampai || '2999-12-31');
  const data = rows_('Pesanan').filter(b => dateStr_(b.checkin) >= from && dateStr_(b.checkin) <= to).sort((a, b) => dateStr_(a.checkin).localeCompare(dateStr_(b.checkin)));
  return { ok: true, rows: data.map(b => { const r = findBy_('Kamar', 'id', b.id_kamar) || {}; return { kode_booking: b.kode_booking, nama: b.nama, instansi: b.instansi, nomor_kamar: r.nomor_kamar || '', tipe: r.tipe || '', checkin: dateStr_(b.checkin), checkout: dateStr_(b.checkout), malam: b.malam, jenis_tamu: b.jenis_tamu, total: b.total, status: b.status }; }) };
}
function adminUsers_(token) { requireSuper_(token); return { ok: true, users: rows_('Pengguna').map(u => ({ id: u.id, nama: u.nama, email: u.email, role: u.role, hp_notif: u.hp_notif, aktif: truthy_(u.aktif) })) }; }
function saveUser_(token, d) {
  const actor = requireSuper_(token); const id = String(d.id || ''); const email = required_(d.email, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email tidak valid.');
  if (rows_('Pengguna').some(u => String(u.email).toLowerCase() === email && String(u.id) !== id)) throw new Error('Email sudah digunakan.');
  const role = String(d.role || 'ADMIN').toUpperCase(); if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new Error('Role tidak valid.');
  const patch = { nama: required_(d.nama, 'Nama'), email, role, hp_notif: normalizePhone_(d.hp_notif || ''), aktif: !!d.aktif };
  if (id && findBy_('Pengguna', 'id', id)) {
    if (d.password) { if (String(d.password).length < 12) throw new Error('Password minimal 12 karakter.'); const salt = Utilities.getUuid().replace(/-/g, ''); patch.salt = salt; patch.password_hash = hashPassword_(d.password, salt); patch.wajib_ganti_password = true; }
    updateBy_('Pengguna', 'id', id, patch);
  } else {
    if (String(d.password || '').length < 12) throw new Error('Password awal minimal 12 karakter.');
    const salt = Utilities.getUuid().replace(/-/g, ''); Object.assign(patch, { id: Utilities.getUuid(), salt, password_hash: hashPassword_(d.password, salt), wajib_ganti_password: true }); append_('Pengguna', patch);
  }
  saveLog_(actor.email, 'SIMPAN_PENGGUNA', 'Akun ' + email + ' disimpan.');
  return { ok: true };
}
function adminSettings_(token) { requireSuper_(token); return { ok: true, settings: rows_('Pengaturan') }; }
function saveSettings_(token, d) {
  const actor = requireSuper_(token); const allowed = ['nama_wisma', 'alamat', 'wa_admin', 'rekening', 'jam_checkin', 'jam_checkout', 'batas_bayar_jam', 'template_pesanan_baru_tamu', 'template_pesanan_baru_admin', 'template_disetujui', 'template_ditolak', 'template_bukti_bayar', 'template_lunas', 'template_reminder_h1', 'template_kedaluwarsa', 'template_selesai'];
  Object.keys(d).forEach(key => { if (allowed.indexOf(key) < 0) return; const val = String(d[key] == null ? '' : d[key]); if (findBy_('Pengaturan', 'key', key)) updateBy_('Pengaturan', 'key', key, { value: val }); else append_('Pengaturan', { key, value: val }); });
  saveLog_(actor.email, 'SIMPAN_PENGATURAN', 'Pengaturan wisma diperbarui.'); return { ok: true };
}

/* ------------------------ AUTOMATION / WHATSAPP ---------------------- */
function dailyMaintenance() {
  const now = new Date(); const today = isoToday_();
  rows_('Pesanan').forEach(b => {
    const code = String(b.kode_booking);
    if (String(b.status) === 'Disetujui' && b.batas_bayar && new Date(b.batas_bayar).getTime() <= now.getTime()) {
      const lock = LockService.getScriptLock(); lock.waitLock(30000);
      let expiredBooking = null;
      try {
        const latest = findBy_('Pesanan', 'kode_booking', code);
        if (latest && String(latest.status) === 'Disetujui' && latest.batas_bayar && new Date(latest.batas_bayar).getTime() <= Date.now()) {
          updateBy_('Pesanan', 'kode_booking', code, { status: 'Kedaluwarsa' });
          saveLog_('Sistem', 'STATUS: Kedaluwarsa', 'Booking ' + code + ' kedaluwarsa karena batas pembayaran.');
          expiredBooking = findBy_('Pesanan', 'kode_booking', code);
        }
      } finally { lock.releaseLock(); }
      if (expiredBooking) notifyBooking_(expiredBooking, 'kedaluwarsa');
    }
    if (dateStr_(b.checkin) === addDays_(today, 1) && String(b.status) === 'Lunas') {
      const sent = rows_('LogNotif').some(n => String(n.kode_booking) === code && String(n.jenis) === 'reminder_h1' && new Date(n.timestamp).getTime() > now.getTime() - 36 * 3600000);
      if (!sent) notifyBooking_(b, 'reminder_h1');
    }
  });
  saveLog_('Sistem', 'MAINTENANCE_HARIAN', 'Pemeriksaan kedaluwarsa dan pengingat H-1 selesai pada ' + today + '.');
}

function notifyBooking_(b, type) {
  if (!b) return { status: 'skip' };
  const map = {
    pesanan_baru_tamu: 'template_pesanan_baru_tamu', disetujui: 'template_disetujui', ditolak: 'template_ditolak',
    lunas: 'template_lunas', reminder_h1: 'template_reminder_h1', kedaluwarsa: 'template_kedaluwarsa', selesai: 'template_selesai'
  };
  const key = map[type]; if (!key) return { status: 'skip' };
  return sendWhatsApp_(b.hp, renderTemplate_(setting_(key, ''), b), b.kode_booking, type);
}
function renderTemplate_(template, b) {
  const room = findBy_('Kamar', 'id', b.id_kamar) || {};
  const values = {
    nama: b.nama || '', kode_booking: b.kode_booking || '', instansi: b.instansi || '', checkin: formatDateId_(b.checkin), checkout: formatDateId_(b.checkout),
    total: rupiah_(b.total), rekening: setting_('rekening', ''), batas_bayar: dateTime_(b.batas_bayar), alasan: b.alasan_penolakan || '',
    jam_checkin: setting_('jam_checkin', '14:00'), nama_wisma: setting_('nama_wisma', APP.NAME), nomor_kamar: room.nomor_kamar || ''
  };
  return String(template || '').replace(/\{\{([a-z_]+)\}\}/g, (m, k) => values[k] === undefined ? '' : values[k]);
}
function sendWhatsApp_(phone, message, code, type) {
  const target = normalizePhone_(phone); const token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  if (!target || !token) { logNotif_(code, target, type, 'GAGAL', !target ? 'Nomor tujuan kosong/tidak valid.' : 'FONNTE_TOKEN belum diisi.'); return { status: 'GAGAL' }; }
  try {
    const sendCache = CacheService.getScriptCache();
    const lastSent = Number(sendCache.get('WPR_LAST_FONNTE_SEND') || 0);
    const waitMs = 2000 - (Date.now() - lastSent);
    if (waitMs > 0) Utilities.sleep(waitMs);
    const response = UrlFetchApp.fetch('https://api.fonnte.com/send', { method: 'post', headers: { Authorization: token }, payload: { target, message: String(message || '') }, muteHttpExceptions: true });
    sendCache.put('WPR_LAST_FONNTE_SEND', String(Date.now()), 60);
    const body = response.getContentText(); const parsed = safeJson_(body); const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300 && parsed && parsed.status !== false && !parsed.reason;
    logNotif_(code, target, type, ok ? 'BERHASIL' : 'GAGAL', body.slice(0, 4000));
    return { status: ok ? 'BERHASIL' : 'GAGAL', response: body.slice(0, 500) };
  } catch (err) { logNotif_(code, target, type, 'GAGAL', safeError_(err)); return { status: 'GAGAL' }; }
}
function logNotif_(code, target, type, status, response) { try { append_('LogNotif', { timestamp: new Date(), kode_booking: code || '', tujuan: target || '', jenis: type || '', status, respons_api: String(response || '').slice(0, 4000) }); } catch (e) { Logger.log('Gagal menulis LogNotif: ' + e); } }


/* ------------------------------- GALERI ------------------------------ */
// Foto galeri bersifat publik (tampil di website), berbeda dari berkas privat (bukti bayar, surat tugas).
function ensureGallerySheet_() {
  const ss = db_(); let sh = ss.getSheetByName('Galeri');
  if (!sh) {
    const headers = APP.SHEETS.Galeri; sh = ss.insertSheet('Galeri');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#12345a').setFontColor('#ffffff'); sh.setFrozenRows(1);
  }
  return sh;
}
function galleryItem_(r) {
  return { id: String(r.id), judul: String(r.judul || ''), kategori: String(r.kategori || 'Umum'), foto_url: String(r.foto_url || ''), urutan: Number(r.urutan) || 0, status_aktif: truthy_(r.status_aktif) };
}
function sortGallery_(a, b) { return (a.urutan - b.urutan) || String(a.id).localeCompare(String(b.id)); }
function apiGallery_() {
  ensureGallerySheet_();
  const items = cached_('C_gallery', 600, () => rows_('Galeri').map(galleryItem_).filter(i => i.status_aktif && publicImageUrl_(i.foto_url)).sort(sortGallery_).map(i => ({ id: i.id, judul: i.judul, kategori: i.kategori, src: i.foto_url })));
  return { ok: true, items: items };
}
function adminGallery_(token) {
  requireAdmin_(token); ensureGallerySheet_();
  return { ok: true, items: rows_('Galeri').map(galleryItem_).sort(sortGallery_) };
}
function galleryFolder_() {
  const props = PropertiesService.getScriptProperties(); let id = props.getProperty('GALLERY_FOLDER_ID'); let folder = null;
  if (id) { try { folder = DriveApp.getFolderById(id); } catch (_) { folder = null; } }
  if (!folder) { folder = DriveApp.createFolder('WP-Rooms Galeri Publik'); props.setProperty('GALLERY_FOLDER_ID', folder.getId()); }
  return folder;
}
function saveGalleryFile_(file, judul) {
  const checked = validateUpload_(file);
  if (checked.mime === 'application/pdf') throw new Error('Foto galeri harus berupa JPG atau PNG.');
  const blob = Utilities.newBlob(checked.bytes, checked.mime, 'Galeri-' + Date.now() + '.' + checked.ext);
  const created = galleryFolder_().createFile(blob);
  try { created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { created.setTrashed(true); throw new Error('Google Drive tidak mengizinkan berbagi publik. Gunakan opsi URL foto, atau minta admin Google Workspace mengizinkan berbagi file.'); }
  return { file_id: created.getId(), url: 'https://lh3.googleusercontent.com/d/' + created.getId() + '=w1600' };
}
function saveGallery_(token, d) {
  const user = requireAdmin_(token); ensureGallerySheet_();
  const id = String(d.id || ''); const old = id ? findBy_('Galeri', 'id', id) : null;
  if (id && !old) throw new Error('Foto tidak ditemukan.');
  const item = {
    id: old ? id : Utilities.getUuid(),
    judul: String(d.judul || '').trim().slice(0, 80),
    kategori: String(d.kategori || 'Umum').trim().slice(0, 30) || 'Umum',
    urutan: isFinite(Number(d.urutan)) ? Number(d.urutan) : 0,
    status_aktif: d.status_aktif === undefined ? true : !!d.status_aktif,
    foto_url: old ? String(old.foto_url || '') : '', file_id: old ? String(old.file_id || '') : '',
    dibuat: old ? old.dibuat : new Date()
  };
  if (d.foto) {
    const saved = saveGalleryFile_(d.foto, item.judul);
    if (old && old.file_id) { try { DriveApp.getFileById(String(old.file_id)).setTrashed(true); } catch (_) {} }
    item.foto_url = saved.url; item.file_id = saved.file_id;
  } else if (d.foto_url) {
    const u = String(d.foto_url).trim();
    if (!publicImageUrl_(u)) throw new Error('URL foto harus HTTPS (bukan link drive.google.com) atau path assets/img/.');
    item.foto_url = u;
  }
  if (!item.foto_url) throw new Error('Pilih file foto atau isi URL foto.');
  if (!item.judul) item.judul = 'Foto ' + item.kategori;
  if (old) updateBy_('Galeri', 'id', id, item); else append_('Galeri', item);
  bust_('Galeri');
  saveLog_(user.email, 'SIMPAN_GALERI', 'Foto galeri "' + item.judul + '" disimpan.');
  return { ok: true, item: galleryItem_(item) };
}
function deleteGallery_(token, d) {
  const user = requireAdmin_(token); ensureGallerySheet_();
  const id = required_(d.id, 'ID foto'); const old = findBy_('Galeri', 'id', id);
  if (!old) throw new Error('Foto tidak ditemukan.');
  const sh = sheet_('Galeri'); const data = sh.getDataRange().getValues(); const col = data[0].map(String).indexOf('id');
  for (let r = 1; r < data.length; r++) { if (String(data[r][col]) === id) { sh.deleteRow(r + 1); break; } }
  if (old.file_id) { try { DriveApp.getFileById(String(old.file_id)).setTrashed(true); } catch (_) {} }
  bust_('Galeri');
  saveLog_(user.email, 'HAPUS_GALERI', 'Foto galeri "' + old.judul + '" dihapus.');
  return { ok: true };
}

/* ---------------------------- FILES / UTILS -------------------------- */
function validateUpload_(file) {
  if (!file || !file.base64 || !file.name || !file.mimeType) throw new Error('File unggahan tidak lengkap.');
  const mime = String(file.mimeType).toLowerCase(); const ext = String(file.name).split('.').pop().toLowerCase();
  if (!APP.MIME_EXT[mime] || APP.MIME_EXT[mime].indexOf(ext) < 0) throw new Error('File harus JPG, PNG, atau PDF dengan ekstensi dan MIME yang sesuai.');
  if (String(file.base64).length > Math.ceil(APP.MAX_FILE_BYTES * 4 / 3) + 16) throw new Error('Ukuran file maksimal 2 MB.');
  const bytes = Utilities.base64Decode(String(file.base64).replace(/^data:[^,]+,/, ''));
  if (bytes.length > APP.MAX_FILE_BYTES) throw new Error('Ukuran file maksimal 2 MB.');
  if (bytes.length === 0) throw new Error('File kosong.');
  // Cocokkan signature biner agar MIME yang dikirim browser tidak menjadi satu-satunya dasar validasi.
  const head = bytes.slice(0, 8).map(b => (b + 256) % 256);
  const isJpeg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
  const isPng = head.join(',') === '137,80,78,71,13,10,26,10';
  const prefix = bytes.slice(0, 5).map(b => String.fromCharCode((b + 256) % 256)).join('');
  const isPdf = prefix === '%PDF-';
  if ((mime === 'image/jpeg' && !isJpeg) || (mime === 'image/png' && !isPng) || (mime === 'application/pdf' && !isPdf)) throw new Error('Isi file tidak sesuai dengan tipe file yang diunggah.');
  return { bytes, mime, ext };
}
function savePrivateFile_(file, prefix) {
  const checked = validateUpload_(file); const props = PropertiesService.getScriptProperties(); const folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (!folderId) throw new Error('Folder Drive belum diinisialisasi. Jalankan setupDatabase().');
  const blob = Utilities.newBlob(checked.bytes, checked.mime, prefix + '-' + Date.now() + '.' + checked.ext);
  const created = DriveApp.getFolderById(folderId).createFile(blob);
  // Jangan set sharing ANYONE. File tetap mengikuti permission Drive pemilik/folder.
  return created.getUrl();
}
function safeDriveUrl_(url) { const s = String(url || ''); return /^https:\/\/drive\.google\.com\//.test(s) ? s : ''; }
function publicImageUrl_(url) { const s = String(url || '').trim(); if (/^assets\/img\/[a-z0-9_.\/-]+$/i.test(s)) return s; return /^https:\/\/(?!drive\.google\.com\/)[^\s]+$/i.test(s) ? s : ''; }
function required_(v, label) { const s = String(v == null ? '' : v).trim(); if (!s) throw new Error(label + ' wajib diisi.'); return s; }
function truthy_(v) { return v === true || v === 1 || String(v).toLowerCase() === 'true' || String(v) === '1' || String(v).toLowerCase() === 'ya'; }
function validateDates_(checkin, checkout) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkin)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(checkout))) throw new Error('Tanggal harus valid.');
  const a = new Date(checkin + 'T00:00:00Z'), b = new Date(checkout + 'T00:00:00Z');
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || a.toISOString().slice(0, 10) !== checkin || b.toISOString().slice(0, 10) !== checkout) throw new Error('Tanggal tidak valid.');
  if (checkin < isoToday_()) throw new Error('Tanggal check-in tidak boleh lampau.');
  if (checkout <= checkin) throw new Error('Tanggal check-out harus setelah check-in.');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function overlaps_(aStart, aEnd, bStart, bEnd) { return String(aStart) < String(bEnd) && String(aEnd) > String(bStart); }
function dateStr_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v); return isNaN(d.getTime()) ? s : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function dateTime_(v) { if (!v) return ''; const d = v instanceof Date ? v : new Date(v); return isNaN(d.getTime()) ? String(v) : Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm'); }
function formatDateId_(v) { const s = dateStr_(v); if (!s) return ''; const d = new Date(s + 'T00:00:00Z'); return Utilities.formatDate(d, 'Asia/Jakarta', 'dd MMMM yyyy'); }
function isoToday_() { return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'); }
function addDays_(iso, days) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function normalizePhone_(phone) { let p = String(phone || '').replace(/\D/g, ''); if (p.startsWith('0')) p = '62' + p.slice(1); else if (p.startsWith('8')) p = '62' + p; return p; }
function maskPhone_(p) { const s = String(p || ''); return s.length > 5 ? s.slice(0, 4) + '••••' + s.slice(-3) : '••••'; }
function newBookingCode_() { const day = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd'); let code; do { code = 'WPR-' + day + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase(); } while (findBy_('Pesanan', 'kode_booking', code)); return code; }
function rupiah_(n) { return 'Rp' + (Number(n) || 0).toLocaleString('id-ID'); }
function safeJson_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function safeError_(err) { const s = String(err && err.message ? err.message : err || 'Terjadi kesalahan.'); return s.slice(0, 500); }
