/**
 * GOOGLE APPS SCRIPT - Máy chủ phụ trợ cho website Thế Giới Công Nghệ (Trường THCS Vĩnh Xuân)
 * Tác giả: Thầy Nguyễn Thanh Việt
 *  1) Ghi kết quả bài làm của học sinh vào Google Sheets (lớp 7 và lớp 8, mỗi khối 1 bảng tính riêng).
 *  2) Đếm số lượt truy cập website (Tổng lượt truy cập, Hôm nay, Người truy cập).
 *  3) (Tùy chọn) Máy chủ trung gian gọi Gemini AI từ máy chủ Google tại Mỹ (US) — không bao giờ bị chặn vùng địa lý.
 */

// ID Google Sheets nhận kết quả (lấy từ địa chỉ .../spreadsheets/d/<ID>/edit)
var SHEET_IDS = {
  '7': '1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ',  // KẾT QUẢ LỚP 7
  '8': '1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY'   // KẾT QUẢ LỚP 8
};

// KHÓA API GEMINI (chạy từ máy chủ Mỹ của Google nên KHÔNG BAO GIỜ bị lỗi "User location is not supported"):
// Thầy dán khóa AIzaSy... vào giữa cặp dấu nháy đơn bên dưới:
var GEMINI_API_KEY = '';
var RESULT_TAB = 'KetQua';   // tên trang tính; tự tạo nếu chưa có
var HEADERS = [
  'Thời gian', 'Họ và tên', 'Lớp', 'Khối', 'Bài luyện tập',
  'Trắc nghiệm đúng', 'Tổng câu trắc nghiệm',
  'Đúng/Sai: ý đúng', 'Đúng/Sai: tổng ý', 'Tỉ lệ đúng (%)', 'Điểm thưởng'
];

// ---------- Nhận dữ liệu ----------
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'result') return out(saveResult(d));
    if (d.action === 'ai') return out(callGeminiFromUS(d.payload));
    return out({ ok: false, error: 'Yêu cầu không hợp lệ' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || 'stats';
  if (a === 'hit') return out(countVisit(e.parameter));
  return out(getStats());
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- 1. Ghi kết quả vào Google Sheets ----------
function clean(v, max) { // chống chèn công thức (=, +, -, @) và giới hạn độ dài
  var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 100);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function num(v) { v = Number(v); return isFinite(v) ? v : 0; }

function saveResult(d) {
  var grade = String(d.grade);
  var id = SHEET_IDS[grade];
  if (!id) return { ok: false, error: 'Khối lớp không hợp lệ' };
  var name = clean(d.name, 60), cls = clean(d.cls, 15);
  if (!name || !cls) return { ok: false, error: 'Thiếu họ tên hoặc lớp' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(id);
    var sh = ss.getSheetByName(RESULT_TAB) || ss.insertSheet(RESULT_TAB);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e3f2fd');
      sh.setFrozenRows(1);
    }
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
      name, cls, 'Công nghệ ' + grade, clean(d.lesson, 150),
      num(d.mcqRight), num(d.mcqTotal), num(d.tfRight), num(d.tfTotal), num(d.percent), num(d.bonus)
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ---------- 2. Đếm lượt truy cập ----------
function today() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd'); }

function getStats() {
  var p = PropertiesService.getScriptProperties();
  return {
    ok: true,
    total: Number(p.getProperty('total') || 0),
    unique: Number(p.getProperty('unique') || 0),
    today: Number(p.getProperty('day_' + today()) || 0)
  };
}

function countVisit(params) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = PropertiesService.getScriptProperties();
    var k = 'day_' + today();
    p.setProperty('total', String(Number(p.getProperty('total') || 0) + 1));
    p.setProperty(k, String(Number(p.getProperty(k) || 0) + 1));
    if (params && params.isNew === '1') p.setProperty('unique', String(Number(p.getProperty('unique') || 0) + 1));
  } finally {
    lock.releaseLock();
  }
  return getStats();
}

// ---------- 3. Gọi Gemini từ máy chủ Google tại Mỹ (US) ----------
function callGeminiFromUS(payload) {
  var key = GEMINI_API_KEY || PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key || !payload) return { ok: false, error: 'NO_GAS_KEY' };
  var models = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash'];
  for (var i = 0; i < models.length; i++) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent?key=' + encodeURIComponent(key);
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      return JSON.parse(res.getContentText());
    }
  }
  return { ok: false, error: 'UPSTREAM_ERROR' };
}
