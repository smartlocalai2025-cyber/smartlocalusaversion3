// OpenAI service wrapper (CommonJS) leveraging the existing OpenAI adapter
// Keeps a thin boundary so we can swap APIs (chat/responses) later without changing callers

const { OpenAIAdapter } = require('../providers/openai');

class OpenAIService {
  constructor({ apiKey } = {}) {
    this.adapter = new OpenAIAdapter({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }

  isConfigured() {
    return this.adapter && this.adapter.isConfigured();
  }

  name() {
    return this.adapter.getName();
  }

  async send(messages, tools = [], opts = {}) {
    // opts: { model, temperature }
    return this.adapter.sendMessage(messages, tools, opts);
  }
}

module.exports = { OpenAIService };
