const { parseDateFromText, isValidDate } = require('../src/utils/dateParser');

describe('dateParser', () => {
  describe('parseDateFromText', () => {
    test('should parse standard YYYY-MM-DD or return null if not matched directly by custom regexes', () => {
      // parseDateFromText supports today, yesterday, tomorrow, DD/MM/YYYY, DD-MM-YYYY, Thai month format.
      // Standard YYYY-MM-DD is usually handled directly or parsed by components, let's test supported formats.
      const res1 = parseDateFromText('15/05/2020');
      expect(res1).toBe('2020-05-15');

      const res2 = parseDateFromText('12-04-2021');
      expect(res2).toBe('2021-04-12');
    });

    test('should parse Thai natural date with Buddhist Era (BE) year', () => {
      const res = parseDateFromText('18 ก.ย. 2561');
      expect(res).toBe('2018-09-18');

      const resFull = parseDateFromText('1 มกราคม 2565');
      expect(resFull).toBe('2022-01-01');
    });

    test('should support relative keywords', () => {
      expect(parseDateFromText('วันนี้')).not.toBeNull();
      expect(parseDateFromText('เมื่อวาน')).not.toBeNull();
      expect(parseDateFromText('พรุ่งนี้')).not.toBeNull();
    });

    test('should return null for unrecognized strings allowing Gemini fallback', () => {
      expect(parseDateFromText('วันจันทร์หน้า')).toBeNull();
      expect(parseDateFromText('random text')).toBeNull();
    });
  });

  describe('isValidDate', () => {
    test('should validate correct YYYY-MM-DD strings', () => {
      expect(isValidDate('2020-05-15')).toBe(true);
      expect(isValidDate('2021-02-28')).toBe(true);
      expect(isValidDate('2020-02-29')).toBe(true); // Leap year
    });

    test('should return false for invalid dates', () => {
      expect(isValidDate('2021-02-29')).toBe(false); // Not a leap year
      expect(isValidDate('2020-13-01')).toBe(false);
      expect(isValidDate('invalid')).toBe(false);
    });
  });
});
