/**
 * Pension calculation service for civil servants.
 * Provides functions to calculate retirement age and pension amount.
 */
class PensionCalcService {
  /**
   * Calculate retirement age based on birth date.
   * For civil servants, retirement age is 60 years old.
   * @param {string} birthDateStr - Date in format YYYY-MM-DD or DD/MM/YYYY
   * @returns {Object} retirement age and date
   */
  calculateRetirementAge(birthDateStr) {
    if (!birthDateStr) return null;
    let birthDate;
    // Try parsing YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
      birthDate = new Date(birthDateStr);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthDateStr)) {
      const parts = birthDateStr.split('/');
      birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      return null;
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    const retirementAge = 60;
    const yearsToRetirement = retirementAge - age;
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);

    return {
      currentAge: age,
      retirementAge: retirementAge,
      yearsToRetirement: yearsToRetirement > 0 ? yearsToRetirement : 0,
      retirementDate: retirementDate.toISOString().split('T')[0],
      message: yearsToRetirement > 0
        ? `คุณจะเกษียณอายุในอีก ${yearsToRetirement} ปี (วันที่ ${retirementDate.toISOString().split('T')[0]})`
        : `คุณมีอายุ ${age} ปีแล้ว ซึ่งเกินหรือเท่ากับอายุเกษียณ 60 ปี`
    };
  }

  /**
   * Calculate pension amount for civil servants.
   * Formula: pension = finalSalary * 0.025 * yearsOfService (capped at 60% of finalSalary)
   * @param {number} finalSalary - Final monthly salary
   * @param {number} yearsOfService - Years of service (can be fractional)
   * @returns {Object} pension amount and details
   */
  calculatePension(finalSalary, yearsOfService) {
    if (isNaN(finalSalary) || isNaN(yearsOfService) || finalSalary <= 0 || yearsOfService < 0) {
      return null;
    }
    let pensionRate = 0.025 * yearsOfService; // 2.5% per year
    const maxRate = 0.60; // 60% max
    if (pensionRate > maxRate) pensionRate = maxRate;
    const pensionAmount = finalSalary * pensionRate;
    return {
      finalSalary,
      yearsOfService,
      pensionRate: pensionRate * 100, // percentage
      pensionAmount: Math.round(pensionAmount),
      message: `เงินบำนาญที่คาดว่าจะได้รับต่อเดือน: ${Math.round(pensionAmount)} บาท (คิดจากเงินเดือนสุดท้าย ${finalSalary} บาท × ${(pensionRate*100).toFixed(1)}% ตามปีที่ทำงาน ${yearsOfService} ปี)`
    };
  }
}

module.exports = PensionCalcService;
