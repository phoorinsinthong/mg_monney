const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

/**
 * Ask Gemini AI a pension/เบี้ยหวัด question in Thai.
 * Returns a plain Thai text answer (or a simple Flex placeholder).
 */

// Simple in-memory cache (TTL: 1 hour)
const RESPONSE_CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const PensionService = require('./pensionService');

function getCacheKey(query) {
  return PensionService.prototype.preprocessQuery(query) || query.trim().toLowerCase();
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
  RESPONSE_CACHE.set(key, { answer, timestamp: Date.now() });
}

async function answer(question, contextData = null) {
  // Check cache first
  const cached = getCachedResponse(question);
  if (cached) {
    console.log('Gemini cache hit');
    return cached;
  }

  // Inject context if available
  let contextStr = '';
  if (contextData) {
    contextStr = `\nข้อมูลอ้างอิงเบื้องต้นจากฐานข้อมูล:\nหัวข้อ: ${contextData.topic || '-'}\nคำตอบ: ${contextData.answer || '-'}\nแหล่งที่มา: ${contextData.source_url || '-'}\nหากข้อมูลนี้เกี่ยวข้อง ให้ใช้เป็นแนวทางในการตอบครับ\n`;
  }

  // Build a richer system prompt
  const systemPrompt = `
คุณเป็นผู้เชี่ยวชาญด้านกฎหมายและสวัสดิการสังคมของประเทศไทย
ให้ตอบคำถามเกี่ยวกับ "เบี้ยหวัด", "บำนาญ" หรือสวัสดิการภาครัฐอย่างละเอียดในภาษาไทย
- คำตอบควรสั้นกระชับ ตรงประเด็น ไม่ต้องอธิบายยาว
- หากอ้างอิงข้อมูลจากแหล่งรัฐบาล ให้ใส่ URL ในรูปแบบ (URL) ท้ายประโยค
- อย่าตอบนอกหัวข้อ ถ้าคำถามไม่เกี่ยวกับสวัสดิการสังคม เบี้ยหวัด หรือบำนาญ ให้ตอบว่า "ขออภัย ฉันไม่เข้าใจคำถามนี้"
`;

  const prompt = `${systemPrompt}${contextStr}\nคำถาม: ${question}\nตอบ:`;
  const result = await model.generateContent([prompt]);
  const text = await result.response.text();
  const answerText = text.trim();
  setCacheResponse(question, answerText);
  return answerText;
}

module.exports = { answer };
