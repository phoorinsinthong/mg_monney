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

function buildCalculationFlex(type, data) {
  // type: 'retirement' or 'pension'
  let headerText, headerColor, bodyContents;

  if (type === 'retirement') {
    headerText = 'คำนวณอายุเกษียณ';
    headerColor = '#FF6B35'; // orange
    bodyContents = [
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: 'อายุปัจจุบัน', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${data.currentAge} ปี`, size: 'xl', weight: 'bold', color: '#333333' }
        ]
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: 'อายุเกษียณ', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${data.retirementAge} ปี`, size: 'xl', weight: 'bold', color: '#333333' }
        ]
      },
      ...(data.yearsToRetirement > 0 ? [
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          contents: [
            { type: 'text', text: 'จะเกษียณในอีก', size: 'sm', color: '#666666', weight: 'bold' },
            { type: 'text', text: `${data.yearsToRetirement} ปี`, size: 'xl', weight: 'bold', color: '#1DB446' }
          ]
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          contents: [
            { type: 'text', text: 'วันที่เกษียณ', size: 'sm', color: '#666666', weight: 'bold' },
            { type: 'text', text: data.retirementDate, size: 'sm', color: '#333333', wrap: true }
          ]
        }
      ] : [
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          contents: [
            { type: 'text', text: 'สถานะ', size: 'sm', color: '#666666', weight: 'bold' },
            { type: 'text', text: `เกินอายุเกษียณแล้ว (${data.currentAge} ปี)`, size: 'sm', color: '#FF6B35', wrap: true }
          ]
        }
      ])
    ];
  } else if (type === 'pension') {
    headerText = 'คำนวณเงินบำนาญ';
    headerColor = '#7ED321'; // green
    const schemeText = data.schemeLabel || 'ระบบเดิม (เพดาน 60%)';
    const salaryLabel = data.scheme === 'gpf' ? 'เงินเดือนเฉลี่ย 60 เดือน' : 'เงินเดือนสุดท้าย';
    const salaryValue = data.scheme === 'gpf' ? `${data.baseSalary.toLocaleString()} บาท${data.isEstimatedAvg ? ' (โดยประมาณ)' : ''}` : `${data.finalSalary.toLocaleString()} บาท`;

    bodyContents = [
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: 'ระบบการคำนวณ', size: 'sm', color: '#1DB446', weight: 'bold' },
          { type: 'text', text: schemeText, size: 'md', weight: 'bold', color: '#333333' }
        ]
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: salaryLabel, size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: salaryValue, size: 'xl', weight: 'bold', color: '#333333' }
        ]
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: 'ปีที่ทำงาน', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${data.yearsOfService} ปี`, size: 'xl', weight: 'bold', color: '#333333' }
        ]
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: 'อัตราเงินบำนาญ', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${Number(data.pensionRate).toFixed(1)}% (สูงสุด ${Number(data.maxRate).toFixed(0)}%)`, size: 'md', weight: 'bold', color: '#333333' }
        ]
      },
      {
        type: 'separator',
        margin: 'md'
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: '💰 บำนาญรายเดือน', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${data.pensionAmount.toLocaleString()} บาท`, size: 'xxl', weight: 'bold', color: '#1DB446' }
        ]
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: '💵 บำเหน็จ (เงินก้อนครั้งเดียว)', size: 'sm', color: '#666666', weight: 'bold' },
          { type: 'text', text: `${data.gratuityAmount.toLocaleString()} บาท`, size: 'xl', weight: 'bold', color: '#4A90E2' }
        ]
      }
    ];
  } else {
    // fallback
    return {
      type: 'text',
      text: data.message || 'ไม่สามารถคำนวณได้'
    };
  }

  return {
    type: 'flex',
    altText: headerText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerColor,
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: headerText,
            color: '#ffffff',
            weight: 'bold',
            size: 'xl',
            align: 'center'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: bodyContents
      }
    }
  };
}

function buildAnswerFlex(answerText) {
  return {
    type: 'flex',
    altText: 'คำตอบจาก AI',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1DB446', // LINE green
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: '💡 คำตอบจาก AI',
            color: '#ffffff',
            weight: 'bold',
            size: 'lg',
            align: 'center'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: answerText,
            wrap: true,
            size: 'sm',
            color: '#333333'
          }
        ]
      }
    }
  };
}

module.exports = { buildPensionFlex, buildCalculationFlex, buildAnswerFlex };
