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
      // Existing load logic
      // Ensure the kbPath is an absolute path before reading
      const absoluteKbPath = path.resolve(this.kbPath);
      console.log(`Loading KB from: ${absoluteKbPath}`); // Debugging log
      if (!fs.existsSync(absoluteKbPath)) {
        console.warn(`KB file not found at ${absoluteKbPath}. Initializing with empty KB.`);
        this.kb = [];
        this.fuse = new Fuse(this.kb, { keys: ['question', 'topic', 'answer'], threshold: 0.4, includeScore: true });
        return;
      }
      const raw = fs.readFileSync(absoluteKbPath, 'utf8');
      this.kb = JSON.parse(raw);
      console.log(`Loaded ${this.kb.length} items from KB.`);
    } catch (e) {
      console.error('Error loading KB:', e);
      this.kb = []; // Ensure kb is an array even on error
    }
    // Initialize Fuse after KB is loaded
    this.fuse = new Fuse(this.kb, { keys: ['question', 'topic', 'answer'], threshold: 0.4, includeScore: true });
  }
    // Duplicate loadKB block removed

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
    if (!query || this.kb.length === 0) {
      console.log('Search query or KB is empty.');
      return null;
    }

    const q = this.preprocessQuery(query);
    console.log(`Searching KB for: "${q}"`);

    // Use Fuse fuzzy search
    const results = this.fuse.search(q);
    if (results.length > 0) {
      const best = results[0];
      console.log('Found item in KB (score:', best.score, '):', best.item);
      // Attach score for potential use by caller
      best.item._score = best.score;
      return best.item;
    } else {
      console.log('No matching item found in KB.');
      return null;
    }
  }
}

module.exports = PensionService;