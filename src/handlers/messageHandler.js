// Message handler – only handles pension/เบี้ยหวัด queries (Thai)

const PensionService = require('../services/pensionService');
const PensionGeminiService = require('../services/pensionGeminiService');
const { buildPensionFlex } = require('../messages/flexPension');

const pensionService = new PensionService();

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

async function handleTextMessage(userId, userMessage) {
  // Greeting / help
  if (isGreeting(userMessage)) return GENERAL_RESPONSES.greeting;
  if (isHelpRequest(userMessage)) return GENERAL_RESPONSES.help;

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

module.exports = {
  handleTextMessage,
};
