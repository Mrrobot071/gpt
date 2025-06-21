
const WhatsAppBot = require('./src/bot');

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Erro não tratado:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
  process.exit(1);
});

// Inicializar bot
async function main() {
  try {
    const bot = new WhatsAppBot();
    await bot.start();
  } catch (error) {
    console.error('Erro ao inicializar o bot:', error);
    process.exit(1);
  }
}

main();
