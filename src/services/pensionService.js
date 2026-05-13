// Pension knowledge base service (Thai)

const fs = require('fs');
const path = require('path');

const Fuse = require('fuse.js');

class PensionService {
  constructor(options = {}) {
    // Default KB path relative to this service file
    this.kbPath = options.kbPath || path.resolve(__dirname, '../../k/knowledge_base.json');
    this.kb = [];
    this.loadKB();
  }

  loadKB() {
    try {
      const absoluteKbPath = path.resolve(this.kbPath);
      if (!fs.existsSync(absoluteKbPath)) {
        console.warn(`KB file not found at ${absoluteKbPath}. Initializing with empty KB.`);
        this.kb = [];
      } else {
        const raw = fs.readFileSync(absoluteKbPath, 'utf8');
        this.kb = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading KB:', e);
      this.kb = [];
    }
    this.fuse = new Fuse(this.kb, { keys: ['question', 'topic', 'answer'], threshold: 0.4, includeScore: true });
  }

  preprocessQuery(query) {
    if (!query) return '';
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // normalize whitespace
      // remove common prefixes
      .replace(/^(สอบถาม|อยากรู้|ช่วยถาม|คำถามว่า|ถามว่า|เรื่อง|เกี่ยวกับ)\s*/i, '')
      .replace(/[!?.,;:]/g, ''); // remove punctuation that doesn't affect meaning
  }

  search(query) {
    if (!query || this.kb.length === 0) return null;

    const q = this.preprocessQuery(query);
    const results = this.fuse.search(q);
    if (results.length > 0) {
      const best = results[0];
      best.item._score = best.score;
      return best.item;
    }
    return null;
  }
}

module.exports = PensionService;