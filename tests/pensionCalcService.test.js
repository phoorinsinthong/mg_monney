const PensionCalcService = require('../src/services/pensionCalcService');

describe('PensionCalcService', () => {
  let calcService;

  beforeEach(() => {
    calcService = new PensionCalcService();
  });

  describe('calculatePension', () => {
    test('should calculate pension for normal civil servant (Old system) capped at 60%', () => {
      const result = calcService.calculatePension(50000, 30, { scheme: 'old' });
      expect(result).not.toBeNull();
      expect(result.scheme).toBe('old');
      // 30 years * 2.5% = 75%, capped at 60%
      expect(result.maxRate).toBe(60);
      expect(result.pensionRate).toBe(60);
      expect(result.pensionAmount).toBe(30000); // 50000 * 0.6
      expect(result.gratuityAmount).toBe(1500000); // 50000 * 30
    });

    test('should calculate pension for normal civil servant (Old system) below cap', () => {
      const result = calcService.calculatePension(40000, 20, { scheme: 'old' });
      expect(result).not.toBeNull();
      // 20 years * 2.5% = 50%
      expect(result.pensionRate).toBe(50);
      expect(result.pensionAmount).toBe(20000); // 40000 * 0.5
    });

    test('should calculate pension for GPF member (กบข.) capped at 70% with estimated average salary', () => {
      const result = calcService.calculatePension(50000, 30, { scheme: 'gpf' });
      expect(result).not.toBeNull();
      expect(result.scheme).toBe('gpf');
      expect(result.maxRate).toBe(70);
      // Base salary estimated to be roughly 90% of final salary
      expect(result.baseSalary).toBe(45000); // 50000 * 0.9
      // 30 years * 2.5% = 75%, capped at 70%
      expect(result.pensionRate).toBe(70);
      expect(result.pensionAmount).toBe(31500); // 45000 * 0.7
    });

    test('should calculate pension for GPF member with provided average salary', () => {
      const result = calcService.calculatePension(50000, 25, { scheme: 'gpf', averageSalary: 46000 });
      expect(result).not.toBeNull();
      expect(result.baseSalary).toBe(46000);
      // 25 years * 2.5% = 62.5%
      expect(result.pensionRate).toBe(62.5);
      expect(result.pensionAmount).toBe(28750); // 46000 * 0.625
    });

    test('should return null for invalid inputs', () => {
      expect(calcService.calculatePension(-100, 20)).toBeNull();
      expect(calcService.calculatePension(30000, -5)).toBeNull();
      expect(calcService.calculatePension('abc', 20)).toBeNull();
    });
  });

  describe('calculateRetirementAge', () => {
    test('should calculate correctly for valid birth date string', () => {
      const result = calcService.calculateRetirementAge('1980-05-15');
      expect(result).not.toBeNull();
      expect(result.retirementAge).toBe(60);
      expect(typeof result.currentAge).toBe('number');
      expect(typeof result.yearsToRetirement).toBe('number');
    });

    test('should return null for invalid date formats', () => {
      expect(calcService.calculateRetirementAge('invalid-date')).toBeNull();
      expect(calcService.calculateRetirementAge('9999-99-99')).toBeNull();
    });
  });

  describe('calculateServiceYears', () => {
    test('should calculate service years correctly', () => {
      const result = calcService.calculateServiceYears('2010-01-01');
      expect(result).not.toBeNull();
      expect(typeof result.years).toBe('number');
      expect(result.years).toBeGreaterThan(10);
    });
  });
});
