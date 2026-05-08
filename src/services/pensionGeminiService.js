const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

/**
 * Ask Gemini AI a pension/เบี้ยหวัด question in Thai.
 * Returns a plain Thai text answer (or a simple Flex placeholder).
 */
async function answer(question) {
  const prompt = `
  คุณเป็นผู้เชี่ยวชาญด้านกฎหมายและสวัสดิการสังคมของประเทศไทย
  ตอบคำถามเกี่ยวกับ "เบี้ยหวัด" หรือ "บำนาญ" อย่างละเอียดในภาษาไทย อย่าใส่ข้อความอื่นนอกจากคำตอบที่ตรงประเด็น
  หากมีข้อมูลอ้างอิงจากเว็บไซต์ภาครัฐ ให้ใส่ URL ที่ท้ายประโยคในรูปแบบ (URL)
  ตัวอย่าง: "สิทธิได้รับเบี้ยหวัดตามกฎหมายคุ้มครองผู้สูงอายุ คือ... (https://www.example.go.th)"

  คำถาม: ${question}
  ตอบ:`;
  const result = await model.generateContent([prompt]);
  const text = await result.response.text();
  return text.trim();
}

module.exports = { answer };
