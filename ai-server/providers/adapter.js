// Provider Adapter Interface
// Normalize chat completion with tool calls across OpenAI, Claude, Gemini, etc.

/**
 * Base adapter interface for providers
 * Each provider implements:
 * - sendMessage(messages, tools, options) → { content, toolCalls, finishReason, usage }
 */

class ProviderAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Send a messages array to the provider and return structured response
   * @param {Array} messages - Array of {role, content} or provider-specific format
   * @param {Array} tools - Array of tool definitions (JSON schema)
   * @param {Object} options - Model, temperature, etc.
   * @returns {Promise<{content: string, toolCalls: Array, finishReason: string, usage: Object}>}
   */
  async sendMessage(messages, tools = [], options = {}) {
    throw new Error('sendMessage must be implemented by subclass');
  }

  /**
   * Validate configuration (API key, etc.)
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('isConfigured must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    throw new Error('getName must be implemented by subclass');
  }
}

module.exports = { ProviderAdapter };
