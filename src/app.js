const express = require('express');
const line = require('@line/bot-sdk');
const { config } = require('./config');
const { handleEvent } = require('./services/lineService');

function createApp() {
  const app = express();

  // LINE SDK verifies the x-line-signature header against the raw request body.
  // Keep this middleware directly on /webhook and do not add express.json() before it.
  const lineMiddleware = line.middleware({
    channelSecret: config.line.channelSecret,
  });

  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💰 Pension QA LINE Bot - AI ตอบคำถามเบี้ยหวัดบำนาญ</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1DB446;
            --primary-glow: rgba(29, 180, 70, 0.4);
            --accent: #FF6B35;
            --bg: #0b0f19;
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --text: #f3f4f6;
            --text-muted: #9ca3af;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Outfit', 'Sarabun', sans-serif;
            background: radial-gradient(circle at 50% 0%, #152938 0%, var(--bg) 80%);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
            padding: 2rem 1rem;
        }
        .container {
            max-width: 800px;
            width: 100%;
            text-align: center;
            z-index: 10;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(29, 180, 70, 0.1);
            border: 1px solid var(--primary);
            padding: 6px 16px;
            border-radius: 99px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #4ade80;
            margin-bottom: 24px;
            box-shadow: 0 0 15px var(--primary-glow);
            animation: pulse-glow 2s infinite alternate;
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            background: #4ade80;
            border-radius: 50%;
            animation: blink 1.5s infinite;
        }
        h1 {
            font-size: 2.8rem;
            font-weight: 800;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #ffffff 30%, #a3b3cc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }
        .subtitle {
            font-size: 1.15rem;
            color: var(--text-muted);
            margin-bottom: 40px;
            line-height: 1.6;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
            text-align: left;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(12px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .card-icon {
            font-size: 2rem;
            margin-bottom: 16px;
        }
        .card h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #ffffff;
        }
        .card p {
            font-size: 0.9rem;
            color: var(--text-muted);
            line-height: 1.5;
        }
        footer {
            margin-top: 40px;
            font-size: 0.85rem;
            color: #4b5563;
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 10px rgba(29, 180, 70, 0.2); }
            100% { box-shadow: 0 0 20px rgba(29, 180, 70, 0.5); }
        }
        @keyframes blink {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }
        @media (max-width: 600px) {
            h1 { font-size: 2.2rem; }
            .subtitle { font-size: 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status-badge">
            <span class="pulse-dot"></span>
            LINE Bot is Online & Ready
        </div>
        <h1>💰 Pension QA LINE Bot</h1>
        <p class="subtitle">ระบบตอบคำถามและคำนวณเบี้ยหวัด บำนาญ และสวัสดิการภาครัฐไทย<br>ทำงานด้วย AI (Gemini) เชื่อมต่อแบบมีประสิทธิภาพและปลอดภัย</p>
        
        <div class="grid">
            <div class="card">
                <div class="card-icon">🤖</div>
                <h3>AI Fallback</h3>
                <p>ตอบคำถามด้วย Gemini AI เมื่อไม่มีข้อมูลในฐานความรู้ จัดรูปแบบสวยงามอ่านง่ายบน LINE</p>
            </div>
            <div class="card">
                <div class="card-icon">🧮</div>
                <h3>Pension Calculator</h3>
                <p>คำนวณเงินบำนาญอัตโนมัติ รองรับทั้งระบบปกติและระบบ กบข. พร้อมแสดงผลแบบ Flex Message</p>
            </div>
            <div class="card">
                <div class="card-icon">📅</div>
                <h3>Retirement Age</h3>
                <p>คำนวณวันเกษียณและจำนวนปีที่เหลือจากวันเกิด สามารถระบุอายุก่อนเกษียณแบบกำหนดเองได้</p>
            </div>
        </div>

        <footer>
            Pension QA LINE Bot v1.0.0 &bull; Running on Render Cloud
        </footer>
    </div>
</body>
</html>
    `);
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/admin/reload-kb', (req, res) => {
    try {
      // Secure endpoint with a token (can use ADMIN_RELOAD_TOKEN or fall back to LINE_CHANNEL_SECRET)
      const token = req.headers['x-admin-token'] || req.query.token;
      const expectedToken = process.env.ADMIN_RELOAD_TOKEN || config.line.channelSecret;

      if (!token || token !== expectedToken) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid or missing token' });
      }

      const { reloadKB } = require('./handlers/messageHandler');
      if (reloadKB) {
        reloadKB();
        return res.json({ status: 'ok', message: 'Knowledge base reloaded successfully' });
      } else {
        return res.status(500).json({ status: 'error', message: 'reloadKB handler not available' });
      }
    } catch (error) {
      console.error('❌ Failed to reload KB:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  });

  app.post('/webhook', lineMiddleware, async (req, res) => {
    try {
      const events = req.body.events || [];

      if (events.length === 0) {
        return res.status(200).json({ status: 'no events' });
      }

      const results = await Promise.allSettled(events.map((event) => handleEvent(event)));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Event ${index} failed:`, result.reason);
        }
      });

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  });

  app.use((err, req, res, next) => {
    if (err instanceof line.SignatureValidationFailed) {
      console.error('❌ LINE Signature Validation Failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (err instanceof line.JSONParseError) {
      console.error('❌ JSON Parse Error');
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.error('❌ Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
