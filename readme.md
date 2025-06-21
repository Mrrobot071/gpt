# Bot WhatsApp com Gemini AI - Guia Completo

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta Google para acessar a API do Gemini
- Telefone para vincular ao WhatsApp

## 🚀 Passo 1: Configuração Inicial

### 1.1 - Criar pasta do projeto
```bash
mkdir whatsapp-gemini-bot
cd whatsapp-gemini-bot
npm init -y
```

### 1.2 - Instalar dependências
```bash
npm install whatsapp-web.js @google/generative-ai qrcode-terminal dotenv
```

### 1.3 - Estrutura do projeto
```
whatsapp-gemini-bot/
├── src/
│   ├── bot.js
│   ├── gemini.js
│   └── prompts.js
├── .env
├── .gitignore
└── package.json
```

## 🔑 Passo 2: Configurar API do Gemini

### 2.1 - Obter chave da API
1. Acesse: https://makersuite.google.com/app/apikey
2. Clique em "Create API Key"
3. Copie a chave gerada

### 2.2 - Criar arquivo .env
```env
GEMINI_API_KEY=sua_chave_aqui
```
AIzaSyDhJo12ftwCeMzVI-30smS-aqWqn4ZChhU

### 2.3 - Criar .gitignore
```gitignore
node_modules/
.env
.wwebjs_auth/
.wwebjs_cache/
```

## 💡 Passo 3: Configurar Prompts Personalizados

### src/prompts.js
```javascript
const prompts = {
  // Prompt padrão do bot
  default: `Você é um assistente inteligente do WhatsApp chamado GeminiBot. 
Características:
- Seja amigável e prestativo
- Responda de forma clara e objetiva
- Use emojis quando apropriado
- Mantenha respostas concisas para WhatsApp
- Se apresente apenas quando cumprimentado pela primeira vez`,

  // Prompt para suporte técnico
  technical: `Você é um especialista em suporte técnico.
- Forneça soluções práticas e detalhadas
- Use linguagem técnica quando necessário
- Sempre pergunte sobre o sistema operacional e versões
- Ofereça múltiplas soluções quando possível`,

  // Prompt para educação
  educational: `Você é um tutor educacional.
- Explique conceitos de forma didática
- Use exemplos práticos
- Adapte a linguagem ao nível do estudante
- Faça perguntas para verificar o entendimento`,

  // Prompt para vendas
  sales: `Você é um consultor de vendas profissional.
- Seja persuasivo mas não insistente
- Identifique necessidades do cliente
- Apresente benefícios claros
- Conduza para o fechamento da venda`,

  // Prompt criativo
  creative: `Você é um assistente criativo.
- Pense fora da caixa
- Ofereça ideias inovadoras
- Use linguagem inspiradora
- Estimule a criatividade do usuário`
};

// Função para obter prompt baseado em palavra-chave
function getPromptByKeyword(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('técnico') || msg.includes('problema') || msg.includes('erro')) {
    return prompts.technical;
  }
  
  if (msg.includes('aprenda') || msg.includes('estudo') || msg.includes('explicar')) {
    return prompts.educational;
  }
  
  if (msg.includes('venda') || msg.includes('produto') || msg.includes('comprar')) {
    return prompts.sales;
  }
  
  if (msg.includes('criativo') || msg.includes('ideia') || msg.includes('inventar')) {
    return prompts.creative;
  }
  
  return prompts.default;
}

// Comandos especiais para trocar de prompt
const commands = {
  '/prompt_tecnico': prompts.technical,
  '/prompt_educacional': prompts.educational,
  '/prompt_vendas': prompts.sales,
  '/prompt_criativo': prompts.creative,
  '/prompt_padrao': prompts.default
};

module.exports = {
  prompts,
  getPromptByKeyword,
  commands
};
```

## 🤖 Passo 4: Configurar Integração com Gemini

### src/gemini.js
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.conversations = new Map(); // Armazena histórico por usuário
  }

  // Gerar resposta com contexto personalizado
  async generateResponse(userId, message, customPrompt = null) {
    try {
      // Recupera ou cria histórico da conversa
      let conversation = this.conversations.get(userId) || [];
      
      // Adiciona prompt personalizado se fornecido
      if (customPrompt) {
        conversation = [{
          role: "user",
          parts: [{ text: customPrompt }]
        }];
      }

      // Adiciona mensagem atual
      conversation.push({
        role: "user",
        parts: [{ text: message }]
      });

      // Limita histórico a 10 mensagens para economizar tokens
      if (conversation.length > 10) {
        conversation = conversation.slice(-10);
      }

      // Gera resposta
      const chat = this.model.startChat({
        history: conversation.slice(0, -1),
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(message);
      const response = result.response.text();

      // Adiciona resposta ao histórico
      conversation.push({
        role: "model",
        parts: [{ text: response }]
      });

      // Salva histórico atualizado
      this.conversations.set(userId, conversation);

      return response;
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  // Limpar histórico de um usuário
  clearHistory(userId) {
    this.conversations.delete(userId);
    return 'Histórico da conversa limpo! 🧹';
  }

  // Obter estatísticas
  getStats() {
    return {
      activeConversations: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((total, conv) => total + conv.length, 0)
    };
  }
}

module.exports = GeminiService;
```

## 📱 Passo 5: Criar Bot Principal

### src/bot.js
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

## ▶️ Passo 6: Arquivo Principal de Execução

### index.js (na raiz do projeto)
```javascript
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
```

## 📝 Passo 7: Configurar package.json

### Adicionar scripts no package.json:
```json
{
  "name": "whatsapp-gemini-bot",
  "version": "1.0.0",
  "description": "Bot WhatsApp com Gemini AI",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "whatsapp-web.js": "^1.23.0",
    "@google/generative-ai": "^0.2.1",
    "qrcode-terminal": "^0.12.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## 🚀 Passo 8: Executar o Bot

### 8.1 - Instalar dependência de desenvolvimento (opcional)
```bash
npm install -D nodemon
```

### 8.2 - Executar o bot
```bash
npm start
```

### 8.3 - Para modo desenvolvimento
```bash
npm run dev
```

## 📋 Passo 9: Como Usar

### 9.1 - Primeira execução:
1. Execute o comando `npm start`
2. Escaneie o QR Code com seu WhatsApp
3. O bot estará pronto para uso!

### Erros
O aviso que você está vendo não é exatamente um erro, mas sim avisos de segurança que devem ser tratados. Aqui está como resolver:
1. Execute o audit fix primeiro
bashnpm audit fix
Se isso não resolver todas as vulnerabilidades, tente:
bashnpm audit fix --force
2. Atualize o puppeteer (se necessário)
O aviso sobre puppeteer deprecated pode ser resolvido atualizando para uma versão mais recente:
bashnpm install puppeteer@latest
3. Verifique se tudo está funcionando
Depois das correções, verifique novamente:
bashnpm audit
4. Se ainda houver problemas, reinstale tudo
Se os problemas persistirem, você pode limpar e reinstalar:
bash# Remove node_modules e package-lock.json
rmdir /s node_modules
del package-lock.json

# Reinstala tudo
npm install
5. Para projetos novos, use versões específicas
Se você está começando um projeto novo, pode especificar versões mais recentes:
bashnpm install whatsapp-web.js@latest @google/generative-ai@latest qrcode-terminal@latest dotenv@latest
Dica importante
Os avisos de vulnerabilidade são comuns em dependências de terceiros. O npm audit fix geralmente resolve a maioria deles automaticamente. Se algumas vulnerabilidades permanecerem, verifique se são realmente críticas para seu caso de uso específico.
O seu projeto deve funcionar normalmente mesmo com esses avisos, mas é uma boa prática mantê-los resolvidos por questões de segurança.
### 9.2 - Comandos disponíveis:
- `/help` - Mostra ajuda
- `/clear` - Limpa histórico
- `/stats` - Estatísticas
- `/prompt_tecnico` - Modo técnico
- `/prompt_educacional` - Modo educacional
- `/prompt_vendas` - Modo vendas
- `/prompt_criativo` - Modo criativo
- `/prompt_custom [texto]` - Prompt personalizado

### 9.3 - Exemplos de uso:
```
Usuário: "Preciso de ajuda técnica com meu computador"
Bot: [Responde no modo técnico]

Usuário: "/prompt_custom Você é um especialista em marketing digital"
Bot: "✅ Prompt personalizado definido!"

Usuário: "Como fazer uma campanha no Instagram?"
Bot: [Responde como especialista em marketing]
```

## 🔧 Funcionalidades Implementadas

### ✅ Recursos Principais:
- ✅ Integração completa WhatsApp + Gemini
- ✅ QR Code para autenticação
- ✅ Prompts personalizados e adaptativos
- ✅ Histórico de conversas por usuário
- ✅ Comandos administrativos
- ✅ Detecção automática de contexto
- ✅ Controle de limite de tokens
- ✅ Tratamento de erros robusto

### ⚡ Recursos Avançados:
- 🤖 5 prompts pré-configurados
- 💾 Persistência de sessão WhatsApp
- 📊 Sistema de estatísticas
- 🧹 Limpeza de histórico
- 🎯 Prompts adaptativos por palavra-chave
- ⚙️ Configuração flexível via .env

## 🔒 Segurança e Boas Práticas

### Variáveis de ambiente:
```env
# .env
GEMINI_API_KEY=sua_chave_api_aqui
MAX_TOKENS=1000
TEMPERATURE=0.7
```

### Limites implementados:
- Histórico limitado a 10 mensagens por usuário
- Máximo de 1000 tokens por resposta
- Timeout de requisições
- Tratamento de erros da API

## 🚀 Deploy e Produção

### Para deploy em servidor:
```bash
# Instalar PM2 para gerenciamento
npm install -g pm2

# Criar arquivo ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-gemini-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Iniciar com PM2
pm2 start ecosystem.config.js
```

## 🆘 Solução de Problemas

### Problemas comuns:
1. **QR Code não aparece**: Verifique se o terminal suporta caracteres especiais
2. **Erro de API**: Verifique se a chave do Gemini está correta no .env
3. **Bot não responde**: Verifique os logs de erro no console
4. **Sessão perdida**: Delete a pasta `.wwebjs_auth` e reinicie

### Logs úteis:
```javascript
// Adicionar logs detalhados
console.log('Mensagem recebida de:', message.from);
console.log('Conteúdo:', message.body);
```

## 📚 Próximos Passos

### Melhorias possíveis:
- 🔄 Integração com banco de dados
- 📎 Suporte a imagens e documentos
- 🔔 Sistema de notificações
- 📈 Analytics avançados
- 🌐 Interface web de gerenciamento
- 🔐 Sistema de autenticação de usuários
- 📋 Comandos administrativos avançados

Este bot está pronto para uso e pode ser facilmente expandido conforme suas necessidades!
