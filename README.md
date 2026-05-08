# 💰 Pension QA LINE Bot

LINE Bot ตอบคำถามเรื่องเบี้ยหวัดและบำนาญ ด้วย Gemini AI + Knowledge Base

พิมพ์คำถามภาษาไทยธรรมดา เช่น "สิทธิบำนาญคืออะไร" หรือ "เบี้ยหวัดผู้สูงอายุได้เท่าไหร่" บอทจะตอบให้อัตโนมัติ!

## ✨ Features

- 🤖 **AI ตอบคำถาม** — ใช้ Google Gemini AI วิเคราะห์คำถามและตอบเป็นภาษาไทย
- 🗄️ **Knowledge Base ท้องถิ่น** — ข้อมูลพื้นฐานเกี่ยวกับเบี้ยหวัด/บำนาญ เก็บในไฟล์ JSON
- 💬 **ตอบกลับแบบสวยงาม** — ใช้ LINE Flex Message แสดงผลพร้อมแหล่งอ้างอิง
- 🔄 **Fallback อัจฉริยะ** — ถ้าไม่มีข้อมูลใน KB จะใช้ Gemini AI ตอบแทน
- 👥 **Multi-user** — แยกตาม LINE user ID อัตโนมัติ

## 📋 ตัวอย่างการใช้งาน

| พิมพ์ | ผลลัพธ์ |
|------|--------|
| สิทธิบำนาญคืออะไร | ตอบคำถามจาก KB หรือ Gemini AI |
| เบี้ยหวัดผู้สูงอายุได้เท่าไหร่ | แสดงข้อมูลจาก KB เป็น Flex Message |
| เงื่อนไขการรับเบี้ยคนพิการ | ตอบจาก KB หรือถาม Gemini |

## 🚀 การติดตั้ง

### 1. Clone และติดตั้ง dependencies

```bash
git clone https://github.com/your-repo/pension-qa-bot.git
cd pension-qa-bot
npm install
```

### 2. สร้าง LINE Bot

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider → สร้าง Messaging API Channel
3. คัดลอก **Channel Secret** และ **Channel Access Token**

### 3. สร้าง Google Gemini API Key

1. ไปที่ [Google AI Studio](https://aistudio.google.com/apikey)
2. สร้าง API Key

### 4. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
PORT=3000
```

### 5. เตรียม Knowledge Base (ไม่บังคับ)

ไฟล์ `k/knowledge_base.json` มีข้อมูลตัวอย่างแล้ว สามารถแก้ไขเพิ่มเติมได้ตามต้องการ

### 6. รัน

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

### 7. ตั้งค่า Webhook URL ใน LINE

1. ไปที่ LINE Developers Console → Channel settings
2. ตั้ง Webhook URL: `https://your-domain.com/webhook`
3. เปิด "Use webhook"

## 📁 โครงสร้างโปรเจกต์

```
pension-qa-bot/
├── src/
│   ├── index.js               # Start server
│   ├── app.js                 # Express routes + LINE middleware
│   ├── config.js              # Environment config
│   ├── handlers/
│   │   └── messageHandler.js  # Logic รับข้อความและตอบคำถาม
│   ├── services/
│   │   ├── lineService.js     # LINE event handler
│   │   ├── pensionService.js  # จัดการ Knowledge Base
│   │   └── pensionGeminiService.js # Gemini AI fallback
│   ├── messages/
│   │   └── flexPension.js    # LINE Flex Message สำหรับคำตอบ
│   └── constants/
│       ├── categories.js      # (ไม่ใช้แล้ว)
│       └── prompts.js         # (ไม่ใช้แล้ว)
├── k/
│   ├── knowledge_base.json    # ข้อมูลเบี้ยหวัด/บำนาญ (KB)
│   └── ...                   # ไฟล์อื่นๆ ที่เกี่ยวข้อง
├── .env.example
├── package.json
└── README.md
```

## 🌐 Deploy

### Deploy บน Render (แนะนำ — ฟรี)

1. ไปที่ [render.com](https://render.com)
2. สร้าง Web Service → เชื่อม GitHub repo
3. ตั้งค่า:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. เพิ่ม Environment Variables ทั้งหมด
5. ใช้ URL ที่ Render ให้ เป็น LINE Webhook URL

### Deploy บน Railway

1. ไปที่ [railway.app](https://railway.app)
2. เชื่อม GitHub repo → ตั้ง env vars → Deploy
