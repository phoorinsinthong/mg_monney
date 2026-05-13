const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

// ─── Optional Redis Distributed Cache Setup ─────────────────
let redisClient = null;
if (process.env.REDIS_URL) {
  try {
    const redis = require('redis');
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
    redisClient.connect().catch((err) => {
      console.error('❌ Failed to connect to Redis, falling back to Memory Cache:', err);
      redisClient = null;
    });
  } catch (e) {
    console.error('❌ Redis package not available or setup failed:', e);
    redisClient = null;
  }
}

// Simple in-memory cache fallback (TTL: 1 hour, max 500 entries)
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
  const base = preprocessCacheKey(query) || query.trim().toLowerCase();
  return `gemini:cache:${base}`;
}

async function getCachedResponse(query) {
  const key = getCacheKey(query);
  if (redisClient && redisClient.isReady) {
    try {
      const res = await redisClient.get(key);
      if (res) return res;
    } catch (e) {
      console.error('Redis get error:', e);
    }
  }
  // Memory Cache Fallback
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry.answer;
}

async function setCacheResponse(query, answer) {
  const key = getCacheKey(query);
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.setEx(key, 3600, answer);
      return;
    } catch (e) {
      console.error('Redis set error:', e);
    }
  }
  // Memory Cache Fallback
  if (RESPONSE_CACHE.size >= CACHE_MAX_SIZE) {
    const firstKey = RESPONSE_CACHE.keys().next().value;
    RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, { answer, timestamp: Date.now() });
}

/**
 * Ask Gemini AI a pension/เบี้ยหวัด question in Thai.
 * Returns a plain Thai text answer.
 */
async function answer(question, contextData = null) {
  // Check cache first
  const cached = await getCachedResponse(question);
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
      await setCacheResponse(question, answerText);
      return answerText;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  throw lastError;
}

/**
 * Use Gemini AI to extract structured parameters from calculation requests.
 * This acts as a robust natural language extraction helper if standard regex fails.
 */
async function extractCalculationParams(question) {
  const jsonModel = genAI.getGenerativeModel({ 
    model: config.gemini.model,
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `วิเคราะห์ประโยคคำถามภาษาไทยต่อไปนี้ เพื่อสกัดข้อมูลสำหรับการคำนวณบำนาญหรืออายุเกษียณ
ให้ตอบกลับเป็น JSON object เท่านั้น โดยมี structure ดังนี้:
{
  "intent": "pension" หรือ "retirement" หรือ "service_years" หรือ null,
  "finalSalary": ตัวเลขเงินเดือนสุดท้าย (number) หรือ null,
  "yearsOfService": ตัวเลขปีที่ทำงาน (number) หรือ null,
  "birthDate": สตริงวันที่เกิดในรูปแบบ "YYYY-MM-DD" (แปลงปี พ.ศ. เป็น ค.ศ. ให้ถูกต้อง) หรือ null,
  "scheme": "gpf" (หากระบุว่า กบข.) หรือ "old" (หากเป็นระบบเดิมหรือไม่ระบุ)
}

ตัวอย่าง 1: "เงินเดือน 40000 ทำงานมา 25 ปี กบข"
-> {"intent": "pension", "finalSalary": 40000, "yearsOfService": 25, "birthDate": null, "scheme": "gpf"}

ตัวอย่าง 2: "เกิด 15 พ.ค. 2505 เกษียณเมื่อไหร่"
-> {"intent": "retirement", "finalSalary": null, "yearsOfService": null, "birthDate": "1962-05-15", "scheme": "old"}

ประโยคคำถาม: "${question}"`;

  try {
    const result = await jsonModel.generateContent([prompt]);
    const text = await result.response.text();
    return JSON.parse(text.trim());
  } catch (err) {
    console.error('❌ Failed to extract params via Gemini:', err);
    return null;
  }
}

module.exports = { answer, extractCalculationParams };
