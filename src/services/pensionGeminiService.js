const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

/**
 * Ask Gemini AI a pension/เบี้ยหวัด question in Thai.
 * Returns a plain Thai text answer (or a simple Flex placeholder).
 */

// Simple in-memory cache (TTL: 1 hour, max 500 entries)
const RESPONSE_CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_SIZE = 500;

function preprocessCacheKey(query) {
  if (!query) return '';
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(สอบถาม|อยากรู้|ช่วยถาม|คำถามว่า|ถามว่า|เรื่อง|เกี่ยวกับ)\s*/i, '')
    .replace(/[!?.,;:]/g, '');
}

function getCacheKey(query) {
  return preprocessCacheKey(query) || query.trim().toLowerCase();
}

function getCachedResponse(query) {
  const key = getCacheKey(query);
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry.answer;
}

function setCacheResponse(query, answer) {
  const key = getCacheKey(query);
  // Evict oldest entry when at capacity
  if (RESPONSE_CACHE.size >= CACHE_MAX_SIZE) {
    const firstKey = RESPONSE_CACHE.keys().next().value;
    RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, { answer, timestamp: Date.now() });
}

async function answer(question, contextData = null) {
  // Check cache first
  const cached = getCachedResponse(question);
  if (cached) {
    console.log('Gemini cache hit');
    return cached;
  }

  const systemPrompt = `คุณคือผู้ช่วยด้านสวัสดิการและบำนาญภาครัฐของประเทศไทย มีความเชี่ยวชาญด้านกฎหมายและระเบียบที่เกี่ยวข้อง

กฎการตอบ:
1. ตอบเป็นภาษาไทยเสมอ ใช้ภาษาที่เข้าใจง่าย ไม่ใช้ศัพท์ยากโดยไม่จำเป็น
2. ถ้าคำถามถามว่า "ใครมีสิทธิ" หรือ "เงื่อนไข" ให้ตอบเป็นข้อ ๆ พร้อมเงื่อนไขครบถ้วน
3. ถ้าคำถามถามว่า "วิธีขอรับ" หรือ "ขั้นตอน" ให้ตอบเป็นลำดับขั้นตอน 1, 2, 3...
4. ถ้าคำถามถามเรื่องจำนวนเงิน ให้ระบุตัวเลขชัดเจนพร้อมเงื่อนไข
5. ถ้ามีกฎหมายหรือระเบียบอ้างอิง ให้ระบุชื่อกฎหมาย/ระเบียบด้วย
6. ท้ายคำตอบ ถ้ามี URL แหล่งข้อมูลรัฐบาลที่เกี่ยวข้อง ให้ระบุในรูป (อ้างอิง: URL)
7. ถ้าคำถามไม่เกี่ยวกับเบี้ยหวัด บำนาญ หรือสวัสดิการภาครัฐไทย ให้ตอบว่า "ขออภัย ฉันไม่เข้าใจคำถามนี้" เท่านั้น ไม่ต้องอธิบายเพิ่ม`;

  let contextStr = '';
  if (contextData) {
    contextStr = `\n\nข้อมูลจากฐานข้อมูลที่อาจเกี่ยวข้อง:\nหัวข้อ: ${contextData.topic || '-'}\nสรุป: ${contextData.answer || '-'}\nแหล่งที่มา: ${contextData.source_url || '-'}\nหากข้อมูลนี้ตรงกับคำถาม ให้ใช้เป็นฐาน แต่ขยายความและจัดรูปแบบให้ดีขึ้นตามกฎข้างต้น`;
  }

  const prompt = `${systemPrompt}${contextStr}\n\nคำถาม: ${question}\n\nคำตอบ:`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent([prompt]);
      const text = await result.response.text();
      const answerText = text.trim();
      // Detect off-topic response from Gemini
      if (answerText.startsWith('ขออภัย ฉันไม่เข้าใจคำถามนี้')) {
        return answerText;
      }
      setCacheResponse(question, answerText);
      return answerText;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  throw lastError;
}

module.exports = { answer };
