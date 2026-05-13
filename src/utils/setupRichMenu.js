/**
 * Utility script to automatically create and setup a LINE Rich Menu
 * Run this script using: node src/utils/setupRichMenu.js
 */
const fs = require('fs');
const path = require('path');
const line = require('@line/bot-sdk');
const { config } = require('../config');

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.line.channelAccessToken,
});

const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: config.line.channelAccessToken,
});

async function setupRichMenu() {
  try {
    console.log('🚀 Starting LINE Rich Menu setup...');

    // 1. Define Rich Menu Object
    const richMenuObject = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Pension QA Default Rich Menu',
      chatBarText: 'เมนูหลัก (คลิก)',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'message', label: 'คำนวณบำนาญ', text: 'คำนวณบำนาญ' }
        },
        {
          bounds: { x: 833, y: 0, width: 833, height: 843 },
          action: { type: 'message', label: 'คำนวณอายุเกษียณ', text: 'คำนวณอายุเกษียณ' }
        },
        {
          bounds: { x: 1666, y: 0, width: 834, height: 843 },
          action: { type: 'message', label: 'เบี้ยยังชีพผู้สูงอายุ', text: 'เบี้ยยังชีพผู้สูงอายุ' }
        },
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: { type: 'message', label: 'เบี้ยคนพิการ', text: 'เบี้ยคนพิการ' }
        },
        {
          bounds: { x: 833, y: 843, width: 833, height: 843 },
          action: { type: 'message', label: 'บำนาญข้าราชการ', text: 'บำนาญข้าราชการคืออะไร' }
        },
        {
          bounds: { x: 1666, y: 843, width: 834, height: 843 },
          action: { type: 'message', label: 'วิธีขอรับสิทธิ', text: 'วิธีขอรับเบี้ยหวัด' }
        }
      ]
    };

    // 2. Create rich menu
    console.log('📋 Creating rich menu object...');
    const response = await client.createRichMenu({ richMenuRequest: richMenuObject });
    const richMenuId = response.richMenuId;
    console.log(`✅ Rich Menu created with ID: ${richMenuId}`);

    // 3. Upload image
    // Make sure you place a valid image named 'richmenu.png' (2500x1686) inside the src/utils directory or project root.
    const imagePath = path.resolve(__dirname, '../../richmenu.png');
    if (fs.existsSync(imagePath)) {
      console.log('🖼️ Uploading rich menu image...');
      const buffer = fs.readFileSync(imagePath);
      await blobClient.setRichMenuImage(richMenuId, new Blob([buffer]), 'image/png');
      console.log('✅ Image uploaded successfully.');
    } else {
      console.warn(`⚠️ Rich menu image not found at ${imagePath}.`);
      console.warn('💡 กรุณานำไฟล์รูปภาพ Rich Menu (ขนาด 2500x1686 px) มาวางที่ root ของโปรเจกต์ในชื่อ richmenu.png แล้วรันสคริปต์นี้อีกครั้ง');
    }

    // 4. Set default rich menu
    console.log('🔗 Setting as default rich menu for all users...');
    await client.setDefaultRichMenu(richMenuId);
    console.log('🎉 LINE Rich Menu setup completed successfully!');

  } catch (error) {
    if (error.originalError && error.originalError.response) {
      console.error('❌ Failed to setup Rich Menu:', JSON.stringify(error.originalError.response.data, null, 2));
    } else {
      console.error('❌ Failed to setup Rich Menu:', error.message);
    }
  }
}

if (require.main === module) {
  setupRichMenu();
}

module.exports = { setupRichMenu };
