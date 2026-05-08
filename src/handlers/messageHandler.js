// Message handler – handles pension/เบี้ยหวัด queries and calculations (Thai)

const PensionService = require('../services/pensionService');
const PensionGeminiService = require('../services/pensionGeminiService');
const PensionCalcService = require('../services/pensionCalcService');
const { buildPensionFlex, buildCalculationFlex } = require('../messages/flexPension');

const pensionService = new PensionService();
const pensionCalcService = new PensionCalcService();

// Simple response utilities
const GENERAL_RESPONSES = {
  greeting: 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยเกี่ยวกับเบี้ยหวัดหรือบำนาญได้บ้างครับ/คะ?',
  help: 'ส่งคำถามเกี่ยวกับเบี้ยหวัดหรือบำนาญมาได้เลย เช่น "สิทธิบำนาญคืออะไร" หรือ "เบี้ยหวัดต้องทำอย่างไร"',
  error: 'ขออภัยค่ะ เกิดข้อผิดพลาดบางอย่าง ลองใหม่อีกครั้งนะคะ',
  noData: 'ไม่พบข้อมูลที่ต้องการครับ/ค่ะ',
};

function isGreeting(msg) {
  const greetings = ['สวัสดี', 'hello', 'hi', 'ฮัลโล'];
  return greetings.some(g => msg.toLowerCase().includes(g));
}

function isHelpRequest(msg) {
  const helpWords = ['ช่วย', 'วิธี', 'อย่างไร', 'info'];
  return helpWords.some(w => msg.toLowerCase().includes(w));
}

// Detect if query is a calculation request
function isCalculationQuery(msg) {
  const lower = msg.toLowerCase();
  const calcKeywords = ['คำนวณ', 'คำนวน', 'เกษียณ', 'อายุราชการ', 'บำนาญ', 'เงินบำนาญ'];
  return calcKeywords.some(k => lower.includes(k));
}

async function handleTextMessage(userId, userMessage) {
  // Greeting / help
  if (isGreeting(userMessage)) return GENERAL_RESPONSES.greeting;
  if (isHelpRequest(userMessage)) return GENERAL_RESPONSES.help;

  // Check if it's a calculation query
  if (isCalculationQuery(userMessage)) {
    return handleCalculationQuery(userMessage);
  }

  // Pension / เบี้ยหวัด query detection
  if (userMessage.toLowerCase().includes('เบี้ยหวัด') || userMessage.toLowerCase().includes('บำนาญ')) {
    return handlePensionQuery(userMessage);
  }

  // Fallback – ask to phrase as pension query
  return GENERAL_RESPONSES.help;
}

async function handlePensionQuery(query) {
  // Try knowledge base first
  const kbResult = pensionService.search(query);
  if (kbResult) {
    return buildPensionFlex(kbResult); // Flex Message object
  }
  // Fallback to Gemini AI
  try {
    const answer = await PensionGeminiService.answer(query);
    return answer;
  } catch (e) {
    console.error('Gemini fallback error:', e);
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
  // If we detected calculation intent but couldn't parse, fallback to Gemini AI
  try {
    const answer = await PensionGeminiService.answer(query);
    return answer;
  } catch (e) {
    console.error('Gemini fallback error in calculation:', e);
    return GENERAL_RESPONSES.error;
  }
}

function parseRetirementCalculation(query) {
  // Try YYYY-MM-DD pattern
  let dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
  let dateStr = null;
  if (dateMatch) {
    dateStr = dateMatch[1];
  } else {
    // Try DD/MM/YYYY pattern
    dateMatch = query.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      dateStr = dateMatch[1];
      // Normalize to YYYY-MM-DD
      const parts = dateStr.split('/');
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  if (!dateStr) return null;

  const result = pensionCalcService.calculateRetirementAge(dateStr);
  if (!result) return null;
  return result; // return object for Flex Message building
}

function parsePensionCalculation(query) {
  // Extract two numbers: final salary and years of service
  // Look for patterns like "เงินเดือน 30000" หรือ "ทำงาน 30 ปี"
  const salaryMatch = query.match(/เงินเดือน\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
  const yearsMatch = query.match(/(\d+(?:\.\d+)?)\s*ปี/);
  let finalSalary = null;
  let yearsOfService = null;
  if (salaryMatch) {
    finalSalary = parseFloat(salaryMatch[1].replace(/,/g, ''));
  }
  if (yearsMatch) {
    yearsOfService = parseFloat(yearsMatch[1]);
  }
  // Also look for alternative patterns like "ทำงาน 30 ปี" or "ทำงานมา 30 ปี"
  if (!yearsOfService) {
    const yearsMatch2 = query.match(/(?:ทำงาน|ทำงานมา|ระยะเวลาทำงาน)\s*(\d+(?:\.\d+)?)\s*ปี/);
    if (yearsMatch2) {
      yearsOfService = parseFloat(yearsMatch2[1]);
    }
  }
  if (finalSalary === null || yearsOfService === null) return null;
  const result = pensionCalcService.calculatePension(finalSalary, yearsOfService);
  if (!result) return null;
  return result; // return object for Flex Message building
}

module.exports = {
  handleTextMessage,
};
