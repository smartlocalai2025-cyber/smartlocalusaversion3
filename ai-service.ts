// AI Service Layer for SMARTLOCAL.AI
// Handles communication with local AI server

import { auth } from './firebase';

interface AIResponse {
  text?: string;
  images?: string[];
  analysis?: string;
  content?: string;
  report?: string;
  calendar?: string;
  response?: string;
  provider?: string;
  timestamp?: string;
  conversationId?: string;
}

type AIProvider = 'ollama' | 'openai' | 'gemini' | 'claude';

interface AIServiceOptions {
  provider?: AIProvider;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

class AIServiceError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'TIMEOUT' | 'NETWORK' | 'AUTH' | 'SERVER' | 'UNKNOWN',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

interface RateLimiter {
  requests: number;
  resetTime: number;
  limit: number;
  interval: number;
}

interface AIServiceStats {
  requestCount: number;
  averageLatency: number;
  lastError?: string;
  lastRequestTime?: number;
  tokenCount?: number;
  completionTokens?: number;
  promptTokens?: number;
  costEstimate?: number;
  queueLength?: number;
  serverLoad?: number;
}

type StatusCallback = (stats: AIServiceStats) => void;

class LocalAIService {
  private baseUrl: string;
  private defaultOptions: AIServiceOptions;
  private rateLimiter: RateLimiter;
  private stats: AIServiceStats = {
    requestCount: 0,
    averageLatency: 0
  };
  private statusSubscribers: Set<StatusCallback> = new Set();
  private retryDelayMs = 1000;
  private maxRetries = 3;
  
  constructor() {
    this.baseUrl = (import.meta.env.VITE_LOCAL_AI_URL as string) || 'http://localhost:3001';
    
    const provider = ((import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'claude') as AIProvider);
    if (!['claude', 'ollama', 'openai', 'gemini'].includes(provider)) {
      console.warn(`Invalid provider "${provider}" specified, falling back to claude`);
    }
    
    this.defaultOptions = {
      provider: provider as AIProvider,
      model: (import.meta.env.VITE_DEFAULT_AI_MODEL as string) || 'claude-3-sonnet-20240229',
    };
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now(),
      limit: Number(import.meta.env.VITE_RATE_LIMIT) || 60,
      interval: 60000 // 1 minute
    };
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.rateLimiter.resetTime >= this.rateLimiter.interval) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now;
    }
    
    if (this.rateLimiter.requests >= this.rateLimiter.limit) {
      const waitTime = this.rateLimiter.interval - (now - this.rateLimiter.resetTime);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.rateLimiter.requests++;
  }

  private async reconnect(): Promise<boolean> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      if (await this.checkHealth()) {
        return true;
      }
      await new Promise(r => setTimeout(r, this.retryDelayMs * Math.pow(2, attempts)));
      attempts++;
    }
    return false;
  }

  private async logUsage(endpoint: string, options: {
    success: boolean;
    duration: number;
    provider: AIProvider;
    error?: string;
  }): Promise<void> {
    try {
      const event = {
        timestamp: new Date().toISOString(),
        userId: auth?.currentUser?.uid,
        ...options
      };
      console.debug('AI Usage:', event);
      // TODO: Send to your analytics system
    } catch (error) {
      console.warn('Failed to log usage:', error);
    }
  }

  private async request(endpoint: string, data: any): Promise<AIResponse> {
    const startTime = Date.now();
    await this.checkRateLimit();
    
    const controller = new AbortController();
    const timeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Provider': this.defaultOptions.provider,
        'X-Model': this.defaultOptions.model,
        'X-Request-ID': crypto.randomUUID()
      };
      
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.warn('Failed to get auth token:', error);
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          options: this.defaultOptions
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Update stats
      this.updateStats({
        requestCount: this.stats.requestCount + 1,
        averageLatency: Math.round(
          (this.stats.averageLatency * this.stats.requestCount + duration) / 
          (this.stats.requestCount + 1)
        ),
        lastRequestTime: Date.now(),
        lastError: undefined
      });
      
      await this.logUsage(endpoint, {
        success: true,
        duration,
        provider: this.defaultOptions.provider as AIProvider
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      let aiError: AIServiceError;
      if (error.name === 'AbortError') {
        aiError = new AIServiceError(
          `Request timeout after ${timeout}ms`,
          'TIMEOUT',
          true
        );
      } else if (!navigator.onLine) {
        aiError = new AIServiceError(
          'No internet connection',
          'NETWORK',
          true
        );
      } else if (error.message.includes('Rate limit')) {
        aiError = new AIServiceError(
          error.message,
          'RATE_LIMIT',
          true
        );
      } else {
        aiError = new AIServiceError(
          error.message || 'Unknown error occurred',
          'UNKNOWN',
          false
        );
      }
      
      // Update stats with error
      this.updateStats({
        lastError: aiError.message,
        lastRequestTime: Date.now()
      });

      await this.logUsage(endpoint, {
        success: false,
        duration,
        provider: this.defaultOptions.provider as AIProvider,
        error: aiError.message
      });
      
      throw aiError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Direct chat interface with Claude
  async chat(prompt: string, conversationId?: string): Promise<AIResponse> {
    return this.request('/api/ai/chat', {
      prompt,
      conversationId,
    });
  }

  // Generate content with Claude
  async generateContent(action: string, params: any): Promise<AIResponse> {
    return this.request('/api/ai/generate', {
      action,
      params,
    });
  }

  // Image generation (if supported by model)
  async generateImage(prompt: string): Promise<AIResponse> {
    return this.request('/api/ai/image', {
      prompt,
    });
  }

  // SEO Analysis with Claude
  async performSEOAnalysis(businessData: {
    businessName: string;
    website?: string;
    location?: string;
    industry?: string;
  }): Promise<AIResponse> {
    return this.request('/api/features/seo-analysis', businessData);
  }

  // Social Media Content Generation
  async generateSocialContent(contentData: {
    businessName: string;
    topic: string;
    platform?: string;
    tone?: string;
    includeImage?: boolean;
  }): Promise<AIResponse> {
    return this.request('/api/features/social-content', contentData);
  }

  // Get available features
  async getFeatures(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/features`);
    if (!response.ok) {
      throw new Error(`Failed to get features: HTTP ${response.status}`);
    }
    return response.json();
  }

  // Get available providers
  async getProviders(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ai/providers`);
    if (!response.ok) {
      throw new Error(`Failed to get providers: HTTP ${response.status}`);
    }
    return response.json();
  }

  async getServerStats(): Promise<Partial<AIServiceStats>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get stats: HTTP ${response.status}`);
      }
      const stats = await response.json();
      return {
        queueLength: stats.queueLength,
        serverLoad: stats.systemLoad,
        tokenCount: stats.totalTokens,
        costEstimate: stats.costEstimate
      };
    } catch (error) {
      console.warn('Failed to fetch server stats:', error);
      return {};
    }
  }

  getProvider(): string {
    return this.defaultOptions.provider || 'claude';
  }

  getModel(): string {
    return this.defaultOptions.model || 'claude-3-sonnet-20240229';
  }

  subscribeToStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    callback(this.stats); // Initial callback with current stats
    
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  private updateStats(update: Partial<AIServiceStats>) {
    this.stats = { ...this.stats, ...update };
    this.statusSubscribers.forEach(callback => callback(this.stats));
  }
}

// Create global instance
const localAI = new LocalAIService();

export { LocalAIService, localAI };
export type { AIResponse, AIServiceOptions };