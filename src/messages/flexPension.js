/**
 * Build a LINE Flex Message for pension/เบี้ยหวัด answer.
 * Enhanced version with better visual hierarchy.
 */
function buildPensionFlex(data) {
  // Determine color based on topic
  let headerColor = '#1DB446'; // default LINE green
  let topicText = data.topic || 'เบี้ยหวัด/บำนาญ';
  if (topicText.includes('ผู้สูงอายุ')) {
    headerColor = '#FF6B35'; // orange for elderly
  } else if (topicText.includes('คนพิการ')) {
    headerColor = '#4A90E2'; // blue for disability
  } else if (topicText.includes('บำนาญ')) {
    headerColor = '#7ED321'; // green for pension
  }

  return {
    type: 'flex',
    altText: `ข้อมูล${topicText}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerColor,
        contents: [
          {
            type: 'text',
            text: topicText,
            color: '#ffffff',
            weight: 'bold',
            size: 'xl',
            align: 'center'
          }
        ],
        paddingAll: '12px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          // Question section
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '❓ คำถาม',
                color: '#666666',
                size: 'sm',
                weight: 'bold',
                flex: 0
              },
              {
                type: 'text',
                text: data.question,
                color: '#333333',
                size: 'sm',
                wrap: true,
                flex: 4
              }
            ]
          },
          // Answer section
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '💡 คำตอบ',
                color: '#666666',
                size: 'sm',
                weight: 'bold',
                flex: 0
              },
              {
                type: 'text',
                text: data.answer,
                color: '#222222',
                size: 'sm',
                wrap: true,
                flex: 4
              }
            ]
          },
          // Source section (if available)
          ...(data.source_url ? [{
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '🔗 แหล่งอ้างอิง',
                color: '#666666',
                size: 'sm',
                weight: 'bold',
                flex: 0
              },
              {
                type: 'text',
                text: data.source_url,
                color: '#1DB446',
                size: 'xs',
                wrap: true,
                flex: 4,
                decoration: 'underline'
              }
            ]
          }] : []),
          // Footer note
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: 'ข้อมูลอัปเดตล่าสุด: ' + data.last_updated,
                color: '#999999',
                size: 'xs',
                align: 'center'
              }
            ]
          }
        ]
      }
    }
  };
}

module.exports = { buildPensionFlex };
