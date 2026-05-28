const fs = require('fs');
const path = require('path');

describe('Knowledge Base Validation', () => {
  const kbPath = path.resolve(__dirname, '../k/knowledge_base.json');

  test('should exist', () => {
    expect(fs.existsSync(kbPath)).toBe(true);
  });

  test('should be a valid JSON array', () => {
    const raw = fs.readFileSync(kbPath, 'utf8');
    let parsed;
    expect(() => {
      parsed = JSON.parse(raw);
    }).not.toThrow();
    expect(Array.isArray(parsed)).toBe(true);
  });

  test('each item should have required fields and non-empty values', () => {
    const raw = fs.readFileSync(kbPath, 'utf8');
    const kb = JSON.parse(raw);

    kb.forEach((item, index) => {
      const errorMsg = `Item at index ${index} (ID: ${item.id || 'unknown'}) is invalid`;

      expect(item).toHaveProperty('id');
      expect(typeof item.id).toBe('string');
      expect(item.id.trim()).not.toBe('');

      expect(item).toHaveProperty('topic');
      expect(typeof item.topic).toBe('string');
      expect(item.topic.trim()).not.toBe('');

      expect(item).toHaveProperty('question');
      expect(typeof item.question).toBe('string');
      expect(item.question.trim()).not.toBe('');

      expect(item).toHaveProperty('answer');
      expect(typeof item.answer).toBe('string');
      expect(item.answer.trim()).not.toBe('');

      expect(item).toHaveProperty('source_url');
      expect(typeof item.source_url).toBe('string');

      expect(item).toHaveProperty('last_updated');
      expect(typeof item.last_updated).toBe('string');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(item.last_updated)).toBe(true); // YYYY-MM-DD format
    });
  });
});
