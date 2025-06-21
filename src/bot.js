```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const GeminiService = require('./gemini');
const { getPromptByKeyword, commands } = require('./prompts');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    this.gemini = new GeminiService();
    this.userPrompts = new Map(); // Prompts personalizados por usuário
    this.setupEventListeners();
  }

  setupEventListeners() {
    // QR Code para autenticação
    this.client.on('qr', (qr) => {
      console.log('📱 Escaneie o QR Code com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Bot pronto
    this.client.on('ready', () => {
      console.log('✅ Bot está pronto e funcionando!');
      console.log('🤖 GeminiBot conectado ao WhatsApp');
    });

    // Processar mensagens
    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Erros
    this.client.on('auth_failure', () => {
      console.error('❌ Falha na autenticação');
    });

    this.client.on('disconnected', (reason) => {
      console.log('📱 Bot desconectado:', reason);
    });
  }

  async handleMessage(message) {
    // Ignora mensagens de status e grupos (opcional)
    if (message.isStatus || message.from.includes('@g.us')) {
      return;
    }

    const userId = message.from;
    const messageBody = message.body.trim();

    try {
      // Comandos especiais
      if (messageBody.startsWith('/')) {
        await this.handleCommand(message, messageBody);
        return;
      }

      // Determinar prompt personalizado
      let customPrompt = this.userPrompts.get(userId) || getPromptByKeyword(messageBody);

      // Gerar resposta
      const response = await this.gemini.generateResponse(userId, messageBody, customPrompt);

      // Simular digitação (opcional)
      await this.client.sendSeen(userId);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Enviar resposta
      await message.reply(response);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await message.reply('❌ Ocorreu um erro. Tente novamente em alguns segundos.');
    }
  }

  async handleCommand(message, command) {
    const userId = message.from;

    switch (command) {
      case '/help':
        await message.reply(this.getHelpMessage());
        break;

      case '/clear':
        const clearMsg = this.gemini.clearHistory(userId);
        this.userPrompts.delete(userId);
        await message.reply(clearMsg);
        break;

      case '/stats':
        const stats = this.gemini.getStats();
        await message.reply(`📊 *Estatísticas do Bot:*\n\n• Conversas ativas: ${stats.activeConversations}\n• Mensagens processadas: ${stats.totalMessages}`);
        break;

      case '/prompt_tecnico':
      case '/prompt_educacional':
      case '/prompt_vendas':
      case '/prompt_criativo':
      case '/prompt_padrao':
        this.userPrompts.set(userId, commands[command]);
        await message.reply(`✅ Prompt alterado para: *${command.replace('/prompt_', '').replace('_', ' ')}*`);
        break;

      default:
        if (command.startsWith('/prompt_custom ')) {
          const customPrompt = command.replace('/prompt_custom ', '');
          this.userPrompts.set(userId, customPrompt);
          await message.reply('✅ Prompt personalizado definido!');
        } else {
          await message.reply('❓ Comando não reconhecido. Use /help para ver comandos disponíveis.');
        }
    }
  }

  getHelpMessage() {
    return `🤖 *GeminiBot - Comandos Disponíveis:*

*Comandos Básicos:*
• /help - Mostra esta ajuda
• /clear - Limpa histórico da conversa
• /stats - Mostra estatísticas do bot

*Prompts Especializados:*
• /prompt_tecnico - Modo suporte técnico
• /prompt_educacional - Modo educacional
• /prompt_vendas - Modo vendas
• /prompt_criativo - Modo criativo
• /prompt_padrao - Volta ao modo padrão

*Prompt Personalizado:*
• /prompt_custom [seu prompt] - Define prompt personalizado

*Exemplo:*
/prompt_custom Você é um chef especializado em culinária brasileira

✨ *Dica:* O bot detecta automaticamente o contexto e ajusta suas respostas!`;
  }

  async start() {
    console.log('🚀 Iniciando WhatsApp Bot com Gemini AI...');
    await this.client.initialize();
  }
}

module.exports = WhatsAppBot;
```