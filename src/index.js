/**
 * Pension QA LINE Bot
 * Entry point for starting server
 */
const { createApp } = require('./app');
const { config, validateConfig } = require('./config');

validateConfig();

function startServer() {
  try {
    const app = createApp();
    app.listen(config.port, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║   💰 Pension QA LINE Bot Started!       ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   🌐 Port: ${config.port}                          ║`);
      console.log('║   📡 Webhook: /webhook                   ║');
      console.log(`║   🤖 AI: Gemini ${config.gemini.model}        ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
