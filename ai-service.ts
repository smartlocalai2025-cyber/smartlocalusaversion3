// AI Service Layer for SMARTLOCAL.AI
// Clean, unified implementation

import { auth } from './firebase';

export interface AIResponse {
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

export type AIProviderName = 'ollama' | 'openai' | 'gemini' | 'claude';

export interface AIServiceOptions {
  provider?: AIProviderName;
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
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
  public baseUrl: string;
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
    const savedProvider = (typeof localStorage !== 'undefined' && localStorage.getItem('ai.provider')) as AIProviderName | null;
    const provider = (savedProvider || (import.meta.env.VITE_DEFAULT_AI_PROVIDER as AIProviderName) || 'claude') as AIProviderName;
    this.defaultOptions = {
      provider,
      model: (typeof localStorage !== 'undefined' && localStorage.getItem('ai.model')) || (import.meta.env.VITE_DEFAULT_AI_MODEL as string) || 'claude-3-sonnet-20240229',
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
    provider: string;
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

  private async request(endpoint: string, data: any, options: AIServiceOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    await this.checkRateLimit();

    const controller = new AbortController();
    const inVitest = Boolean((globalThis as any)?.vi || (globalThis as any)?.__vitest_worker__);
    const envTimeout = Number((import.meta as any)?.env?.VITE_REQUEST_TIMEOUT);
    const timeout = inVitest ? Math.min(envTimeout || Infinity, 100) : (envTimeout || 30000);

    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Provider': (options.provider || this.defaultOptions.provider) as string,
        'X-Model': (options.model || this.defaultOptions.model) as string,
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

      const fetchPromise = fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          options: { ...this.defaultOptions, ...options }
        }),
        signal: controller.signal
      });
      let timeoutHandle: any;
      const response = await Promise.race([
        fetchPromise,
        new Promise<Response>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            const e: any = new Error(`Request timeout after ${timeout}ms`);
            e.name = 'AbortError';
            reject(e);
          }, timeout);
        })
      ]);

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
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
        provider: (options.provider || this.defaultOptions.provider) as string
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
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        aiError = new AIServiceError(
          'No internet connection',
          'NETWORK',
          true
        );
      } else if (error.message && error.message.includes('Rate limit')) {
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
        provider: (options.provider || this.defaultOptions.provider) as string,
        error: aiError.message
      });

      throw aiError;
    } finally {
      // no-op
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

  // Direct chat interface
  async chat(prompt: string, conversationId?: string, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/chat', { prompt, conversationId }, options);
  }

  // Generate content
  async generateContent(action: string, params: any, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/generate', { action, params }, options);
  }

  // Image generation
  async generateImage(prompt: string, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/image', { prompt }, options);
  }

  // SEO Analysis
  async performSEOAnalysis(businessData: {
    businessName: string;
    website?: string;
    location?: string;
    industry?: string;
  }, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/features/seo-analysis', businessData, options);
  }

  // Social Media Content Generation
  async generateSocialContent(contentData: {
    businessName: string;
    topic: string;
    platform?: string;
    tone?: string;
    includeImage?: boolean;
  }, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/features/social-content', contentData, options);
  }

  // Business Audit: Start a new audit
  async startAudit(payload: {
    businessName?: string;
    website?: string;
    scope?: string[];
    notes?: string;
  } = {}, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/audit/start', payload, options);
  }

  // Reports: Generate a report
  async generateReport(payload: {
    auditId?: string;
    format?: 'markdown' | 'html' | 'pdf';
    includeCharts?: boolean;
  } = {}, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/report/generate', payload, options);
  }

  // Competitor Analysis
  async analyzeCompetitors(payload: {
    businessName: string;
    location: string;
    industry?: string;
  }, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/features/competitor-analysis', payload, options);
  }

  // Content Calendar Generation
  async createContentCalendar(payload: {
    businessName: string;
    industry?: string;
    timeframe?: string;
    platforms?: string[];
  }, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/features/content-calendar', payload, options);
  }

  // Conversational assistant
  async askAssistant(prompt: string, context?: string, conversationId?: string, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/assistant', { prompt, context, conversationId }, options);
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

  getActiveProvider(): string {
    return this.getProvider();
  }

  getModel(): string {
    return this.defaultOptions.model || 'claude-3-sonnet-20240229';
  }

  setProvider(provider: AIProviderName) {
    this.defaultOptions.provider = provider;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('ai.provider', provider); } catch {}
  }

  setModel(model: string) {
    this.defaultOptions.model = model;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('ai.model', model); } catch {}
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