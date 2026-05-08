# Pension QA LINE Bot - System Documentation

## Project Overview
LINE Bot for answering questions about Thai pension/benefits (เบี้ยหวัด, บำนาญ) using Gemini AI + Knowledge Base.

**Purpose:** Help users query pension eligibility, amounts, application procedures, and perform calculations via LINE messaging.

## System Architecture

```
User (LINE) → LINE Platform → Webhook (Express) → Message Handler → [KB Search | Gemini AI | Calculator] → Response (Flex Message / Text)
```

### Core Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Entry Point | `src/index.js` | Express server, webhook setup |
| LINE Service | `src/services/lineService.js` | LINE SDK integration, reply messages |
| Message Handler | `src/handlers/messageHandler.js` | Route messages to appropriate service |
| Pension KB Service | `src/services/pensionService.js` | Knowledge base search (fuzzy matching) |
| Pension Gemini Service | `src/services/pensionGeminiService.js` | Gemini AI Q&A with caching |
| Pension Calc Service | `src/services/pensionCalcService.js` | Retirement age & pension amount calculations |
| Flex Messages | `src/messages/flexPension.js` | LINE Flex Message formatting |
| Config | `src/config.js` | Environment variables, validation |
| Knowledge Base | `k/knowledge_base.json` | JSON array of Q&A items |

## Recent Improvements (2026-05-08)

### 1. Enhanced Knowledge Base Search
**File:** `src/services/pensionService.js`
- **Added:** Fuse.js for fuzzy string matching
- **Preprocessing:** Query normalization (trim, lowercase, remove prefixes like "สอบถาม", "อยากรู้")
- **Search:** Searches across `question`, `topic`, `answer` fields with threshold 0.4
- **Score:** Returns match score (`_score`) for confidence-based routing

### 2. Improved Gemini AI Integration
**File:** `src/services/pensionGeminiService.js`
- **Better Prompt:** Clearer role definition, concise answer guidelines
- **Caching:** In-memory cache with 1-hour TTL to reduce API calls
- **Cache Key:** Normalized query string

### 3. Context-Aware Fallback
**File:** `src/handlers/messageHandler.js`
- **High-confidence KB match** (score ≤ 0.4): Return directly via Flex Message
- **Low-confidence KB match** (score > 0.4): Pass KB result as context to Gemini
- **No match:** Fall back to Gemini AI directly

### 4. Expanded Detection
**File:** `src/handlers/messageHandler.js`
- Added calculation keywords: "อายุเท่าไหร่จะเกษียณ", "จะได้บำนาญเท่าไหร่", "คำนวณบำนาญ"
- Improved intent detection for pension calculation queries

## Knowledge Base Structure
**File:** `k/knowledge_base.json`
```json
[
  {
    "id": "pension001",
    "topic": "เบี้ยหวัดผู้สูงอายุ",
    "question": "ใครบ้างมีสิทธิได้รับเบี้ยยังชีพผู้สูงอายุ?",
    "answer": "...",
    "source_url": "https://...",
    "last_updated": "2026-05-08"
  }
]
```
**Topics covered:** เบี้ยหวัดผู้สูงอายุ, เบี้ยคนพิการ, บำนาญชราภาพ, บำนาญข้าราชการ, เอกสารสำคัญ, ประเภทเบี้ยหวัด 3.1-3.5

## Query Flow

### 1. Greeting/Help Detection
- Check for greetings ("สวัสดี", "hello") → Return greeting message
- Check for help keywords ("ช่วย", "วิธี") → Return help message

### 2. Calculation Query Detection
Keywords: คำนวณ, คำนวน, เกษียณ, อายุราชการ, บำนาญ, เงินบำนาญ, etc.
- **Retirement age:** Extract birth date (YYYY-MM-DD or DD/MM/YYYY), call `pensionCalcService.calculateRetirementAge()`
- **Pension amount:** Extract salary & years of service, call `pensionCalcService.calculatePension()`
- **If parsing fails:** Fall back to Gemini AI

### 3. Pension/เบี้ยหวัด Query
- **Step 1:** Search knowledge base (fuzzy match)
  - Score ≤ 0.4 → Return Flex Message with KB answer
  - Score > 0.4 → Pass as context to Gemini
- **Step 2:** If no KB match → Gemini AI with enhanced prompt
- **Step 3:** Cache Gemini response for repeated queries

## Configuration
**File:** `src/config.js` (reads from `.env`)
```
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash (default)
PORT=3000
```

## Message Response Types
1. **Flex Message (Pension Q&A):** `buildPensionFlex()` - structured Q&A with source URL
2. **Flex Message (Calculation):** `buildCalculationFlex()` - retirement age or pension amount
3. **Flex Message (AI Answer):** `buildAnswerFlex()` - Gemini AI response
4. **Plain Text:** Greetings, help, error messages

## Dependencies
- `@google/generative-ai`: Gemini AI SDK
- `@line/bot-sdk`: LINE Messaging API SDK
- `express`: Web server
- `dotenv`: Environment variables
- `fuse.js`: Fuzzy string matching (NEW)

## Installation & Run
```bash
npm install  # Install dependencies including fuse.js
npm start    # Production
npm run dev  # Development with --watch
```

## Testing Checklist
- [ ] KB fuzzy search with paraphrased questions
- [ ] Gemini AI fallback with improved prompt
- [ ] Calculation detection with various phrasings
- [ ] Cache works (repeat same question)
- [ ] Syntax check: `node -e "require('./src/index.js')"`
- [ ] Check `.env` has all required variables

## Notes for Future AI Agents
- The system uses Thai language throughout
- Knowledge base is in `k/knowledge_base.json` (not `src/`)
- Fuse.js threshold tuned to 0.4 for Thai text matching
- Gemini cache TTL is 1 hour (3600000 ms)
- Flex Messages are used for structured responses
- Calculation queries try pattern matching before Gemini fallback
- If you modify `knowledge_base.json`, restart the server (KB loaded at startup)
