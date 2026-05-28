const { parseDateFromText } = require('../utils/dateParser');

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function toThaiDate(date) {
  const d = date.getDate();
  const m = THAI_MONTHS[date.getMonth()];
  const y = date.getFullYear() + 543;
  return `${d} ${m} ${y}`;
}

class PensionCalcService {
  /**
   * Calculate retirement age based on birth date.
   * For civil servants, retirement age is 60 years old.
   * @param {string} birthDateStr - Date in format YYYY-MM-DD or DD/MM/YYYY
   * @returns {Object} retirement age and date
   */
  calculateRetirementAge(birthDateStr, options = {}) {
    if (!birthDateStr) return null;
    let birthDate;
    // Normalize input: replace any slash with dash, then split
    const normalized = birthDateStr.replace(/\//g, '-');
    const parts = normalized.split('-');
    if (parts.length !== 3) return null;

    let year, month, day;
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // 0-indexed
      day = parseInt(parts[2], 10);
    } else {
      // Assume DD-MM-YYYY or DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    // Handle Buddhist Era (BE) if year > 2500
    if (year > 2500) {
      year = year - 543;
    }

    // Validate ranges before constructing Date
    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
    birthDate = new Date(year, month, day);
    if (isNaN(birthDate.getTime())) return null;
    // Reject if JS normalized the date (e.g. month 13 rolled over)
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month || birthDate.getDate() !== day) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const retirementAge = options.retirementAge || 60;
    const yearsToRetirement = retirementAge - age;
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);

    const retirementDateStr = toThaiDate(retirementDate);
    return {
      currentAge: age,
      retirementAge: retirementAge,
      yearsToRetirement: yearsToRetirement > 0 ? yearsToRetirement : 0,
      retirementDate: retirementDateStr,
      message: yearsToRetirement > 0
        ? `คุณจะเกษียณอายุในอีก ${yearsToRetirement} ปี (วันที่ ${retirementDateStr})`
        : `คุณมีอายุ ${age} ปีแล้ว ซึ่งเกินหรือเท่ากับอายุเกษียณ ${retirementAge} ปี`
    };
  }

  /**
   * Calculate pension amount for civil servants / military.
   * Supports both Old System (ระบบเดิม) and GPF System (กบข.).
   * Formula Old: pension = finalSalary * 0.025 * yearsOfService (capped at 60% or 70% depending on rule)
   * Formula GPF: pension = avgSalary60Months * 0.025 * yearsOfService (capped at 70%)
   * @param {number} finalSalary - Final monthly salary
   * @param {number} yearsOfService - Years of service (can be fractional)
   * @param {Object} options - Configuration options (scheme: 'old' | 'gpf')
   * @returns {Object} pension amount and details
   */
  calculatePension(finalSalary, yearsOfService, options = {}) {
    if (isNaN(finalSalary) || isNaN(yearsOfService) || finalSalary <= 0 || yearsOfService < 0) {
      return null;
    }

    const scheme = options.scheme || 'old';
    let pensionRate = 0.025 * yearsOfService; // 2.5% per year
    let maxRate = 0.60; // default cap for normal old system
    let baseSalary = finalSalary;
    let isEstimatedAvg = false;

    if (scheme === 'gpf') {
      maxRate = 0.70; // GPF allows up to 70%
      // In GPF, base salary is average of last 60 months.
      // If user provided averageSalary explicitly in options, use it. Otherwise estimate from finalSalary.
      if (options.averageSalary && !isNaN(options.averageSalary)) {
        baseSalary = parseFloat(options.averageSalary);
      } else {
        // Estimate average of last 60 months to be roughly 90% of final salary for convenience
        baseSalary = Math.round(finalSalary * 0.90);
        isEstimatedAvg = true;
      }
    } else {
      // scheme === 'old'
      // Check if user specified a special military cap or if yearsOfService is extremely high
      if (options.capRate) {
        maxRate = parseFloat(options.capRate);
      }
    }

    if (pensionRate > maxRate) pensionRate = maxRate;
    const pensionAmount = baseSalary * pensionRate;
    
    // บำเหน็จ = เงินเดือนสุดท้าย × ปีที่ทำงาน (ไม่มี cap) สำหรับระบบเดิม
    // สำหรับ กบข. บำเหน็จก็ใช้สูตรคล้ายกันแต่รับเงินก้อน กบข. เพิ่มเติม
    const gratuityAmount = finalSalary * yearsOfService;

    const schemeLabel = scheme === 'gpf' ? 'สมาชิก กบข. (เพดาน 70%)' : 'ระบบเดิม (เพดาน 60%)';
    const salaryLabel = scheme === 'gpf' 
      ? `เงินเดือนเฉลี่ย 60 เดือน: ${baseSalary.toLocaleString()} บาท${isEstimatedAvg ? ' (โดยประมาณ)' : ''}`
      : `เงินเดือนสุดท้าย: ${finalSalary.toLocaleString()} บาท`;

    return {
      scheme,
      schemeLabel,
      finalSalary,
      baseSalary,
      isEstimatedAvg,
      yearsOfService,
      pensionRate: pensionRate * 100,
      maxRate: maxRate * 100,
      pensionAmount: Math.round(pensionAmount),
      gratuityAmount: Math.round(gratuityAmount),
      message: `[${schemeLabel}] ${salaryLabel} | บำนาญรายเดือน: ${Math.round(pensionAmount).toLocaleString()} บาท | บำเหน็จ: ${Math.round(gratuityAmount).toLocaleString()} บาท`
    };
  }

  /**
   * Calculate years of service from start date (DD/MM/YYYY or DD-MM-YYYY or Thai month format)
   * @param {string} startDateStr - start date in supported formats
   * @returns {Object} years of service and formatted message
   */
  calculateServiceYears(startDateStr) {
    const parsed = parseDateFromText(startDateStr);
    if (!parsed) return null;
    const start = new Date(parsed);
    const today = new Date();
    let diff = today - start;
    if (diff < 0) return null;
    const years = diff / (1000 * 60 * 60 * 24 * 365.25);
    const rounded = Math.floor(years);
    return {
      years: rounded,
      startDate: parsed,
      message: `คุณทำงานมาแล้วประมาณ ${rounded} ปี (ตั้งแต่ ${parsed})`
    };
  }
}

module.exports = PensionCalcService;
