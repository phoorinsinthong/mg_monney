/**
 * Thai Date Parser
 * แปลงคำภาษาไทยเกี่ยวกับวันที่เป็น YYYY-MM-DD
 */

/**
 * สร้างวันที่ในเขตเวลาไทย (UTC+7)
 */
function getThaiDate(offsetDays = 0) {
  const now = new Date();
  // แปลงเป็นเวลาไทย
  const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  thaiTime.setUTCDate(thaiTime.getUTCDate() + offsetDays);
  return formatDate(thaiTime);
}

/**
 * Format Date เป็น YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * วันที่วันนี้ (Bangkok timezone)
 */
function getToday() {
  return getThaiDate(0);
}

/**
 * วันที่เมื่อวาน (Bangkok timezone)
 */
function getYesterday() {
  return getThaiDate(-1);
}

/**
 * พยายาม parse วันที่จากข้อความภาษาไทย
 * ถ้า parse ไม่ได้ return null (ให้ Gemini จัดการ)
 */
function parseDateFromText(text) {
  // Added support for Thai month names/abbreviations (e.g., "18 ก.ย. 2561")
  const thaiMonthMap = {
    'มกราคม': '01', 'ม.ค.': '01', 'มค': '01',
    'กุมภาพันธ์': '02', 'ก.พ.': '02', 'กพ': '02',
    'มีนาคม': '03', 'มี.ค.': '03', 'มีค': '03',
    'เมษายน': '04', 'เม.ย.': '04', 'เมย': '04',
    'พฤษภาคม': '05', 'พ.ค.': '05', 'พค': '05',
    'มิถุนายน': '06', 'มิ.ย.': '06', 'มิย': '06',
    'กรกฎาคม': '07', 'ก.ค.': '07', 'กค': '07',
    'สิงหาคม': '08', 'ส.ค.': '08', 'สค': '08',
    'กันยายน': '09', 'ก.ย.': '09', 'กย': '09',
    'ตุลาคม': '10', 'ต.ค.': '10', 'ตค': '10',
    'พฤศจิกายน': '11', 'พ.ย.': '11', 'พย': '11',
    'ธันวาคม': '12', 'ธ.ค.': '12', 'ธค': '12'
  };

  const lowerText = text.toLowerCase();

  // วันนี้
  if (lowerText.includes('วันนี้')) {
    return getToday();
  }

  // เมื่อวาน
  if (lowerText.includes('เมื่อวาน')) {
    return getYesterday();
  }

  // พรุ่งนี้
  if (lowerText.includes('พรุ่งนี้')) {
    return getThaiDate(1);
  }

  // Format DD/MM/YYYY
  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format DD-MM-YYYY
  const dashMatch = text.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Thai date with month name (e.g., "18 ก.ย. 2561")
  const thaiMatch = text.match(/(\d{1,2})\s+([฀-๿\.]+)\s+(\d{4})/);
  if (thaiMatch) {
    let [, day, monthName, year] = thaiMatch;
    let monthKey = monthName.trim();
    let monthNum = thaiMonthMap[monthKey];
    if (!monthNum) {
      // try without periods
      monthKey = monthKey.replace(/\./g, '');
      monthNum = thaiMonthMap[monthKey];
    }
    if (!monthNum) {
      // try with added period
      monthNum = thaiMonthMap[monthKey + '.'];
    }
    if (monthNum) {
      // Convert Buddhist Era year to Gregorian if needed (>2500)
      let yr = parseInt(year, 10);
      if (yr > 2500) yr -= 543;
      return `${yr}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }

  return null; // ให้ Gemini จัดการ
}

/**
 * Validate ว่าเป็น YYYY-MM-DD ที่ถูกต้อง
 */
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

module.exports = {
  getToday,
  getYesterday,
  parseDateFromText,
  isValidDate,
  formatDate,
};
