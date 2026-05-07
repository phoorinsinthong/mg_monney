// Pension knowledge base service (Thai)

const fs = require('fs');
const path = require('path');

class PensionService {
  constructor(options = {}) {
    // Default KB path relative to this service file
    this.kbPath = options.kbPath || path.resolve(__dirname, '../../k/knowledge_base.json');
    this.kb = [];
    this.loadKB();
  }

  loadKB() {
    try {
      // Ensure the kbPath is an absolute path before reading
      const absoluteKbPath = path.resolve(this.kbPath);
      console.log(`Loading KB from: ${absoluteKbPath}`); // Debugging log
      if (!fs.existsSync(absoluteKbPath)) {
        console.warn(`KB file not found at ${absoluteKbPath}. Initializing with empty KB.`);
        this.kb = [];
        return;
      }
      const raw = fs.readFileSync(absoluteKbPath, 'utf8');
      this.kb = JSON.parse(raw);
      console.log(`Loaded ${this.kb.length} items from KB.`);
    } catch (e) {
      console.error('Error loading KB:', e);
      this.kb = []; // Ensure kb is an array even on error
    }
  }

  search(query) {
    if (!query || this.kb.length === 0) {
      console.log('Search query or KB is empty.');
      return null;
    }

    const q = query.toLowerCase();
    console.log(`Searching KB for: "${q}"`);

    // Simple search: match question, topic, or answer
    const foundItem = this.kb.find(item =>
      (item.question && item.question.toLowerCase().includes(q)) ||
      (item.topic && item.topic.toLowerCase().includes(q)) ||
      (item.answer && item.answer.toLowerCase().includes(q))
    );

    if (foundItem) {
      console.log('Found item in KB:', foundItem);
    } else {
      console.log('No matching item found in KB.');
    }
    return foundItem;
  }
}

module.exports = PensionService;