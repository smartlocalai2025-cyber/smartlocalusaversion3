// OpenAI Provider Adapter
// Implements function calling via OpenAI's Chat Completion API

const { ProviderAdapter } = require('./adapter');
const OpenAI = require('openai');

class OpenAIAdapter extends ProviderAdapter {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
  }

  isConfigured() {
    return !!this.client;
  }

  getName() {
    return 'openai';
  }

  /**
   * Send messages with optional tool definitions
   * @param {Array} messages - [{role: 'system'|'user'|'assistant'|'tool', content, name?, tool_call_id?}]
   * @param {Array} tools - [{name, description, parameters: {type: 'object', properties, required}}]
   * @param {Object} options - {model, temperature, max_tokens}
   * @returns {Promise<{content: string, toolCalls: Array, finishReason: string, usage: Object}>}
   */
  async sendMessage(messages, tools = [], options = {}) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI adapter not configured: missing API key');
    }

    const model = options.model || 'gpt-4o-mini';
    const temperature = options.temperature ?? 0.7;
    const max_tokens = options.max_tokens || 2000;

    // Convert tools to OpenAI function calling format
    const functions = tools.length > 0 ? tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'object', properties: {}, required: [] }
      }
    })) : undefined;

    const payload = {
      model,
      messages,
      temperature,
      max_tokens,
    };

    if (functions && functions.length > 0) {
      payload.tools = functions;
      payload.tool_choice = 'auto';
    }

    try {
      const response = await this.client.chat.completions.create(payload);
      const choice = response.choices[0];
      const message = choice.message;

      // Extract tool calls if present
      const toolCalls = message.tool_calls ? message.tool_calls.map(tc => ({
        id: tc.id,
        type: tc.type,
        name: tc.function.name,
        arguments: tc.function.arguments // JSON string
      })) : [];

      return {
        content: message.content || '',
        toolCalls,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        }
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

module.exports = { OpenAIAdapter };
