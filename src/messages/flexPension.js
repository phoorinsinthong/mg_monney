/**
 * Build a LINE Flex Message for pension/เบี้ยหวัด answer.
 * This is a simple placeholder – you can replace with richer bubble layout.
 */
function buildPensionFlex(data) {
  return {
    type: 'flex',
    altText: 'ข้อมูลเบี้ยหวัด/บำนาญ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: data.topic || 'เบี้ยหวัด/บำนาญ', weight: 'bold', size: 'lg' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: `คำถาม: ${data.question}`, wrap: true },
          { type: 'text', text: `คำตอบ: ${data.answer}`, wrap: true },
          {
            type: 'text',
            text: `แหล่งอ้างอิง: ${data.source_url}`,
            color: '#888888',
            size: 'xs',
            wrap: true,
          },
        ],
      },
    },
  };
}

module.exports = { buildPensionFlex };
