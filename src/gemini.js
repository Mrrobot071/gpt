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
