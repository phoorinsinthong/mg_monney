/**
 * LINE Service
 * รับ event จาก LINE แล้วส่งต่อให้ message handler
 */
const line = require('@line/bot-sdk');
const { config } = require('../config');
const { handleTextMessage } = require('../handlers/messageHandler');

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.line.channelAccessToken,
});

async function handleEvent(event) {
  if (event.type !== 'message') return null;

  if (event.message.type !== 'text') {
    // Non‑text messages are not supported – reply with a short notice
    return replyPayload(event.replyToken, 'ขออภัยค่ะ Bot รองรับเฉพาะข้อความเท่านั้น');
  }

  const userId = event.source?.userId || null;
  const userMessage = event.message.text.trim();
  const payload = await handleTextMessage(userId, userMessage);

  return replyPayload(event.replyToken, payload);
}

async function replyPayload(replyToken, payload) {
  try {
    const message = typeof payload === 'string' ? { type: 'text', text: payload } : payload;
    
    // Add default Quick Reply buttons to guide the user
    if (!message.quickReply) {
      message.quickReply = {
        items: [
          {
            type: 'action',
            action: { type: 'message', label: 'คำนวณอายุเกษียณ 🧮', text: 'คำนวณอายุเกษียณ' },
          },
          {
            type: 'action',
            action: { type: 'message', label: 'คำนวณบำนาญ 💰', text: 'คำนวณบำนาญ' },
          },
          {
            type: 'action',
            action: { type: 'message', label: 'เบี้ยผู้สูงอายุ 👵', text: 'เบี้ยยังชีพผู้สูงอายุ' },
          },
          {
            type: 'action',
            action: { type: 'message', label: 'เบี้ยคนพิการ ♿', text: 'เบี้ยคนพิการ' },
          },
          {
            type: 'action',
            action: { type: 'message', label: 'บำนาญข้าราชการ 📋', text: 'บำนาญข้าราชการคืออะไร' },
          },
          {
            type: 'action',
            action: { type: 'message', label: 'วิธีขอรับสิทธิ 📝', text: 'วิธีขอรับเบี้ยหวัด' },
          },
        ],
      };
    }

    return await lineClient.replyMessage({
      replyToken,
      messages: [message],
    });
  } catch (error) {
    if (error.originalError && error.originalError.response) {
      console.error('❌ LINE reply error:', JSON.stringify(error.originalError.response.data, null, 2));
    } else {
      console.error('❌ LINE reply error:', error.message);
    }
    return null;
  }
}

module.exports = {
  handleEvent,
  replyPayload,
};
