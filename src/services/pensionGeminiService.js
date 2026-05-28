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

  const systemPrompt = `คุณคือผู้ช่วยด้านสวัสดิการและบำนาญภาครัฐของประเทศไทย มีความเชี่ยวชาญด้านกฎหมายและระเบียบที่เกี่ยวข้องอย่างสูง

กฎการตอบอย่างมีประสิทธิภาพบน LINE:
1. ตอบเป็นภาษาไทยด้วยน้ำเสียงสุภาพ เป็นมิตร และกระชับ หลีกเลี่ยงประโยคที่ยาวเกินความจำเป็น
2. ใช้การจัดรูปแบบให้อ่านง่าย เช่น ใช้ตัวหนา (*ข้อความ*) เพื่อเน้นหัวข้อสำคัญ และใช้ไอคอนอิโมจิ (เช่น 👵, ♿, 💰, 📋, 🔗) นำหน้าหัวข้อ
3. หากผู้ใช้ถามถึง "เงื่อนไข" หรือ "สิทธิ์" ให้สรุปเป็นข้อๆ พร้อมระบุคุณสมบัติให้ชัดเจนครบถ้วน
4. หากถามถึง "ขั้นตอน" หรือ "วิธีขอรับสิทธิ์" ให้จัดลำดับเป็นข้อ 1, 2, 3... ให้เข้าใจง่ายและชัดเจน
5. หากถามถึง "จำนวนเงิน" หรือ "อัตราเบี้ย" ต้องระบุตัวเลขจำนวนเงินให้ถูกต้องและชัดเจน
6. หากในข้อมูลอ้างอิงมีชื่อกฎหมาย ระเบียบ หรือ URL แหล่งข้อมูลรัฐบาล ให้ระบุอ้างอิงตอนท้ายประโยคเสมอ ในรูปแบบ (อ้างอิง: URL)
7. ถ้าคำถามไม่เกี่ยวข้องกับเบี้ยยังชีพ เบี้ยหวัด บำนาญ บำเหน็จ หรือสวัสดิการภาครัฐของไทยเลย ให้ตอบว่า "ขออภัย ฉันไม่เข้าใจคำถามนี้" เท่านั้น ห้ามตอบนอกเรื่องเด็ดขาด`;

  let contextStr = '';
  if (contextData) {
    contextStr = `\n\nข้อมูลอ้างอิงอย่างเป็นทางการ (ห้ามดัดแปลงข้อมูลหลักหรือตัวเลขเด็ดขาด):
[หัวข้อ]: ${contextData.topic || '-'}
[ข้อมูลกฎเกณฑ์]: ${contextData.answer || '-'}
[แหล่งข้อมูลหลัก]: ${contextData.source_url || '-'}

คำสั่งเพิ่มเติม: ให้ใช้ข้อมูลอ้างอิงอย่างเป็นทางการข้างต้นเป็นแหล่งข้อมูลที่ถูกต้องที่สุดในการร่างคำตอบ หากข้อมูลไม่ตรงกับฐานความรู้ หรือไม่มีในฐานความรู้ ให้ปฏิเสธอย่างสุภาพ หรือค้นหาสิ่งที่ใกล้เคียงที่สุดในข้อมูลอ้างอิงข้างต้นมาตอบอย่างเป็นธรรมชาติ`;
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
  "scheme": "gpf" (หากระบุว่า กบข.) หรือ "old" (หากเป็นระบบเดิมหรือไม่ระบุ),
  "retirementAge": ตัวเลขอายุเกษียณหากมีการระบุเฉพาะเจาะจงในคำถาม เช่น 55, 65, 70 (number) หรือ null
}

ตัวอย่าง 1: "เงินเดือน 40000 ทำงานมา 25 ปี กบข"
-> {"intent": "pension", "finalSalary": 40000, "yearsOfService": 25, "birthDate": null, "scheme": "gpf", "retirementAge": null}

ตัวอย่าง 2: "เกิด 15 พ.ค. 2505 เกษียณเมื่อไหร่"
-> {"intent": "retirement", "finalSalary": null, "yearsOfService": null, "birthDate": "1962-05-15", "scheme": "old", "retirementAge": null}

ตัวอย่าง 3: "เกิด 1 ม.ค. 2520 ถ้าจะเกษียณตอนอายุ 55 จะเกษียณปีไหน"
-> {"intent": "retirement", "finalSalary": null, "yearsOfService": null, "birthDate": "1977-01-01", "scheme": "old", "retirementAge": 55}

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
