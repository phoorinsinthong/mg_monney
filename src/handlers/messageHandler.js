// Message handler – handles pension/เบี้ยหวัด queries and calculations (Thai)

const PensionService = require('../services/pensionService');
const PensionGeminiService = require('../services/pensionGeminiService');
const PensionCalcService = require('../services/pensionCalcService');
const { buildPensionFlex, buildCalculationFlex, buildAnswerFlex } = require('../messages/flexPension');
const { parseDateFromText } = require('../utils/dateParser');

const pensionService = new PensionService();
const pensionCalcService = new PensionCalcService();

// Simple response utilities
const GENERAL_RESPONSES = {
  greeting: 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยเกี่ยวกับเบี้ยหวัดหรือบำนาญได้บ้างครับ/คะ?',
  help: 'ส่งคำถามเกี่ยวกับเบี้ยหวัดหรือบำนาญมาได้เลย เช่น "สิทธิบำนาญคืออะไร" หรือ "เบี้ยหวัดต้องทำอย่างไร"',
  error: 'ขออภัยค่ะ',
  noData: 'ขออภัยค่ะ',
};

const PENSION_CONTEXT_KEYWORDS = ['บำนาญ', 'เบี้ยหวัด', 'เบี้ย', 'บำเหน็จ', 'เกษียณ', 'สิทธิ', 'ราชการ', 'ชราภาพ', 'ผู้สูงอายุ'];

function hasPensionContext(msg) {
  return PENSION_CONTEXT_KEYWORDS.some(k => msg.includes(k));
}

function isGreeting(msg) {
  if (hasPensionContext(msg)) return false;
  const greetings = ['สวัสดี', 'hello', 'hi', 'ฮัลโล'];
  return greetings.some(g => msg.toLowerCase().includes(g));
}

function isHelpRequest(msg) {
  if (hasPensionContext(msg)) return false;
  const helpWords = ['ช่วย', 'วิธี', 'อย่างไร', 'info'];
  return helpWords.some(w => msg.toLowerCase().includes(w));
}

// Detect if query is a calculation request (retirement or pension)
function isCalculationQuery(msg) {
  const lower = msg.toLowerCase();
  // Explicit calc phrases always trigger
  const explicitCalc = ['คำนวณ', 'คำนวน', 'คำนวณบำนาญ', 'จะได้บำนาญเท่าไหร่', 'อายุเท่าไหร่จะเกษียณ'];
  if (explicitCalc.some(k => lower.includes(k))) return true;
  // เกษียณ / อายุราชการ only trigger when there's a number
  if ((lower.includes('เกษียณ') || lower.includes('อายุราชการ')) && /\d/.test(msg)) return true;
  // มีทั้งเงินเดือนและปี → ต้องการคำนวณ
  if (lower.includes('เงินเดือน') && /\d/.test(msg) && lower.includes('ปี')) return true;
  return false;
}
// Detect service years queries (e.g., "อายุราชการ 18 ก.ย. 2561")
function isServiceYearsQuery(msg) {
  return msg.includes('อายุราชการ') && /\d{1,2}[\s\/\-]+[ก-๿\.]+[\s\.]*\d{4}/.test(msg);
}

const MAX_INPUT_LENGTH = 500;

async function handleTextMessage(userId, userMessage) {
  if (userMessage.length > MAX_INPUT_LENGTH) {
    return 'ข้อความยาวเกินไปค่ะ กรุณาสรุปคำถามให้สั้นลง (ไม่เกิน 500 ตัวอักษร)';
  }

  if (isServiceYearsQuery(userMessage)) {
    return handleServiceYearsQuery(userMessage);
  }
  if (isGreeting(userMessage)) return GENERAL_RESPONSES.greeting;
  if (isHelpRequest(userMessage)) return GENERAL_RESPONSES.help;

  if (isCalculationQuery(userMessage)) {
    return handleCalculationQuery(userMessage);
  }

  return handlePensionQuery(userMessage);
}

async function handlePensionQuery(query) {
  // Try knowledge base first
  const kbResult = pensionService.search(query);
  
  // If good match (score <= 0.5, where 0 is exact match)
  if (kbResult && kbResult._score !== undefined && kbResult._score <= 0.5) {
    return buildPensionFlex(kbResult);
  }

  // If low-confidence match or no match: fallback to Gemini AI with KB context
  try {
    const answer = await PensionGeminiService.answer(query, kbResult);
    return buildAnswerFlex(answer);
  } catch (e) {
    console.error('Gemini fallback error in pension query:', e);
    
    // If Gemini fails but we have some KB result (even if score > 0.5), return it as a fallback!
    if (kbResult) {
      console.log(`Gemini failed. Falling back to KB result with score ${kbResult._score}`);
      return buildPensionFlex(kbResult);
    }
    
    // If Gemini fails and no KB result, return a more helpful error message
    if (e.status === 429 || (e.message && (e.message.includes('quota') || e.message.includes('API key') || e.message.includes('RESOURCE_EXHAUSTED')))) {
      return '⚠️ เกิดข้อผิดพลาดกับ Gemini API (โควต้าหมดหรือ API Key ไม่ถูกต้อง) กรุณาตรวจสอบหรือตั้งค่า GEMINI_API_KEY ในไฟล์ .env ใหม่ค่ะ';
    }
    return GENERAL_RESPONSES.error;
  }
}

async function handleCalculationQuery(query) {
  // Try to parse for retirement age calculation
  const retirementResult = parseRetirementCalculation(query);
  if (retirementResult) {
    return buildCalculationFlex('retirement', retirementResult);
  }
  // Try to parse for pension amount calculation
  const pensionResult = parsePensionCalculation(query);
  if (pensionResult) {
    return buildCalculationFlex('pension', pensionResult);
  }

  // If Regex couldn't extract all fields, use advanced Gemini parameter extraction
  try {
    const params = await PensionGeminiService.extractCalculationParams(query);
    if (params) {
      if (params.intent === 'pension' && params.finalSalary && params.yearsOfService) {
        const res = pensionCalcService.calculatePension(params.finalSalary, params.yearsOfService, { scheme: params.scheme || 'old' });
        if (res) return buildCalculationFlex('pension', res);
      }
      if (params.intent === 'retirement' && params.birthDate) {
        const res = pensionCalcService.calculateRetirementAge(params.birthDate, { retirementAge: params.retirementAge });
        if (res) return buildCalculationFlex('retirement', res);
      }
      if (params.intent === 'service_years' && params.birthDate) {
        const res = pensionCalcService.calculateServiceYears(params.birthDate);
        if (res) return buildAnswerFlex(res.message);
      }
    }
  } catch (extError) {
    console.error('Gemini extraction error:', extError);
  }

  // Friendly Guide: If detected intent but missing required data
  const lower = query.toLowerCase();
  if (lower.includes('เกษียณ') && !/\d+/.test(query)) {
    return 'กรุณาระบุวันเดือนปีเกิดเพื่อคำนวณอายุเกษียณค่ะ เช่น "เกิด 15 พ.ค. 2500"';
  }
  if (lower.includes('บำนาญ') && !/\d+/.test(query)) {
    return 'กรุณาระบุเงินเดือนสุดท้ายและอายุงานเพื่อคำนวณบำนาญค่ะ เช่น "เงินเดือน 30000 ทำงาน 25 ปี"';
  }
  // If we detected calculation intent but couldn't parse, fallback to Gemini AI answer
  try {
    const answer = await PensionGeminiService.answer(query);
    return buildAnswerFlex(answer);
  } catch (e) {
    console.error('Gemini fallback error in calculation:', e);
    if (e.status === 429 || (e.message && (e.message.includes('quota') || e.message.includes('API key') || e.message.includes('RESOURCE_EXHAUSTED')))) {
      return '⚠️ เกิดข้อผิดพลาดกับ Gemini API (โควต้าหมดหรือ API Key ไม่ถูกต้อง) กรุณาตรวจสอบหรือตั้งค่า GEMINI_API_KEY ในไฟล์ .env ใหม่ค่ะ';
    }
    return GENERAL_RESPONSES.error;
  }
}

function parseRetirementCalculation(query) {
  // Try parseDateFromText first (supports Thai natural dates, BE years, etc.)
  let dateStr = parseDateFromText(query);
  if (!dateStr) {
    // Try YYYY-MM-DD pattern fallback
    let dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      dateStr = dateMatch[1];
    } else {
      // Try DD/MM/YYYY pattern fallback
      dateMatch = query.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        dateStr = dateMatch[1];
        // Normalize to YYYY-MM-DD
        const parts = dateStr.split('/');
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  }
  if (!dateStr) return null;

  // Try to parse custom retirement age if specified in query (e.g., "เกษียณ 55" or "เกษียณอายุ 65")
  let retirementAge = null;
  const ageMatch = query.match(/เกษียณ(?:อายุ)?\s*(\d{2})/);
  if (ageMatch) {
    retirementAge = parseInt(ageMatch[1], 10);
  }

  const result = pensionCalcService.calculateRetirementAge(dateStr, { retirementAge });
  if (!result) return null;
  return result; // return object for Flex Message building
}

function parsePensionCalculation(query) {
  let finalSalary = null;
  let yearsOfService = null;
  const scheme = query.toLowerCase().includes('กบข') ? 'gpf' : 'old';

  // "เงินเดือน[คำขยาย] 30000" เช่น "เงินเดือนทหาร 25000"
  const salaryMatch = query.match(/เงินเดือน[ก-๿\s]*?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (salaryMatch) finalSalary = parseFloat(salaryMatch[1].replace(/,/g, ''));

  // "ทำงาน/อายุราชการ N ปี"
  const yearsMatch = query.match(/(?:ทำงาน|ทำงานมา|ระยะเวลาทำงาน|อายุราชการ)\s*(\d+(?:\.\d+)?)\s*ปี/);
  if (yearsMatch) yearsOfService = parseFloat(yearsMatch[1]);

  // fallback: bare "N ปี" ถ้าไม่มี pattern ข้างต้น
  if (yearsOfService === null) {
    const bareYears = query.match(/(\d+(?:\.\d+)?)\s*ปี/);
    if (bareYears) yearsOfService = parseFloat(bareYears[1]);
  }
  if (finalSalary === null || yearsOfService === null) return null;
  const result = pensionCalcService.calculatePension(finalSalary, yearsOfService, { scheme });
  if (!result) return null;
  return result; // return object for Flex Message building
}

async function handleServiceYearsQuery(query) {
  const serviceResult = pensionCalcService.calculateServiceYears(query);
  if (serviceResult) {
    return buildAnswerFlex(serviceResult.message);
  }
  // fallback to Gemini extraction or direct answer
  try {
    const params = await PensionGeminiService.extractCalculationParams(query);
    if (params && params.intent === 'service_years' && params.birthDate) {
      const res = pensionCalcService.calculateServiceYears(params.birthDate);
      if (res) return buildAnswerFlex(res.message);
    }
    const answer = await PensionGeminiService.answer(query);
    return buildAnswerFlex(answer);
  } catch (e) {
    console.error('Gemini fallback error in service years:', e);
    return GENERAL_RESPONSES.error;
  }
}

module.exports = {
  handleTextMessage,
  reloadKB: () => pensionService.loadKB(),
};
