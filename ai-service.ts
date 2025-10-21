// AI Service Layer for Morrow.AI
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
  const envUrl = (import.meta.env.VITE_LOCAL_AI_URL as string) || '';
  // Prefer explicit env URL when provided. In dev, omit baseUrl so calls hit Vite proxy /api -> 3001.
  // In production (Firebase Hosting), rewrites route /api/** to Cloud Run service. Keep baseUrl empty for relative calls.
  this.baseUrl = envUrl || '';
    // OpenAI is the sole brain (Morrow.AI); optional providers: gemini (helper)
    const savedProvider = (typeof localStorage !== 'undefined' && localStorage.getItem('ai.provider')) as AIProviderName | null;
    const provider = (savedProvider || (import.meta.env.VITE_DEFAULT_AI_PROVIDER as AIProviderName) || 'openai') as AIProviderName;
    this.defaultOptions = {
      provider,
      model: (typeof localStorage !== 'undefined' && localStorage.getItem('ai.model')) || (import.meta.env.VITE_DEFAULT_AI_MODEL as string) || 'gpt-4o-mini',
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
        'X-Orchestrator': 'Morrow.AI',
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
    websiteContent?: any;
    placesData?: any;
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
    location?: string;
    industry?: string;
    profileId?: string;
    consultantUid?: string;
    // backward-compat legacy
    scope?: string[];
    notes?: string;
    websiteContent?: any;
    placesData?: any;
  } = {}, options: AIServiceOptions = {}): Promise<AIResponse & { audit?: any }> {
    return this.request('/api/audit/start', payload, options) as any;
  }

  // Audits API (server-managed)
  async getAudit(auditId: string): Promise<{ audit: any }>{
    const res = await fetch(`${this.baseUrl}/api/audits/${encodeURIComponent(auditId)}`);
    if (!res.ok) throw new Error(`Failed to get audit: HTTP ${res.status}`);
    return res.json();
  }

  async getLatestAudit(businessName: string): Promise<{ audit: any }>{
    const res = await fetch(`${this.baseUrl}/api/audits/latest/${encodeURIComponent(businessName)}`);
    if (!res.ok) throw new Error(`Failed to get latest audit: HTTP ${res.status}`);
    return res.json();
  }

  async getAuditsByBusiness(businessName: string, limit = 50): Promise<{ audits: any[]; count: number }>{
    const res = await fetch(`${this.baseUrl}/api/audits/business/${encodeURIComponent(businessName)}?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to list audits: HTTP ${res.status}`);
    return res.json();
  }

  async getAuditHistory(businessName: string, count = 5): Promise<{ audits: any[]; count: number }>{
    const res = await fetch(`${this.baseUrl}/api/audits/history/${encodeURIComponent(businessName)}?count=${count}`);
    if (!res.ok) throw new Error(`Failed to get audit history: HTTP ${res.status}`);
    return res.json();
  }

  async updateAudit(auditId: string, updates: any): Promise<{ audit: any }>{
    const res = await fetch(`${this.baseUrl}/api/audits/${encodeURIComponent(auditId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed to update audit: HTTP ${res.status}`);
    return res.json();
  }

  // Customer portal API
  async createCustomerProfile(payload: {
    businessProfileId: string;
    contact: { email?: string; phone?: string };
    selectedTools: string[];
    channel?: 'email' | 'sms';
  }): Promise<{ profile: any }>{
    const res = await fetch(`${this.baseUrl}/api/customer/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to create customer profile: HTTP ${res.status}`);
    return res.json();
  }

  async getCustomerProfile(id: string): Promise<{ profile: any }>{
    const res = await fetch(`${this.baseUrl}/api/customer/profile/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch customer profile: HTTP ${res.status}`);
    return res.json();
  }

  async updateCustomerProgress(id: string, progress: any): Promise<{ profile: any }>{
    const res = await fetch(`${this.baseUrl}/api/customer/profile/${encodeURIComponent(id)}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress })
    });
    if (!res.ok) throw new Error(`Failed to update customer progress: HTTP ${res.status}`);
    return res.json();
  }

  async deleteAudit(auditId: string): Promise<{ success: boolean }>{
    const res = await fetch(`${this.baseUrl}/api/audits/${encodeURIComponent(auditId)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete audit: HTTP ${res.status}`);
    return res.json();
  }

  // Website intelligence: fetch and parse site content
  async fetchWebsiteIntel(url: string): Promise<any> {
    // Try alias path first to avoid ad-blocks; fall back to original path
    const tryPaths = ['/api/fetch/site', '/api/intel/website'];
    let lastErr: any = null;
    for (const p of tryPaths) {
      try {
        const resp = await fetch(`${this.baseUrl}${p}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (!resp.ok) {
          let msg = `HTTP ${resp.status}`;
          try { const j = await resp.json(); msg = j.error || msg; } catch {}
          throw new Error(msg);
        }
        return await resp.json();
      } catch (e) {
        lastErr = e;
        // continue to next path
      }
    }
    throw new Error(`Website intel failed: ${lastErr?.message || 'Unknown error'}`);
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

  /**
   * Brain mode: Let a real LLM decide which tools to run
   * The model orchestrates tool calls; MorrowAI executes safely and feeds results back
   * @param prompt - User prompt
   * @param conversationId - Optional conversation ID for memory
   * @param provider - Provider to use (openai, claude, gemini, ollama) - default: openai
   * @param model - Model name (e.g., gpt-4o-mini)
   * @param toolsAllow - Optional array of allowed tool names
   * @param limits - Optional limits { maxSteps, maxTimeMs }
   * @returns Promise with final_text, tool_trace, steps_used, etc.
   */
  async brain(
    prompt: string,
    conversationId?: string,
    provider: AIProviderName = 'openai',
    model?: string,
    toolsAllow?: string[],
    limits?: { maxSteps?: number; maxTimeMs?: number }
  ): Promise<{
    final_text: string;
    tool_trace: Array<any>;
    steps_used: number;
    provider: string;
    model: string;
    conversationId: string;
    duration_ms: number;
    timestamp: string;
  }> {
    const response = await this.request('/api/ai/brain', {
      prompt,
      conversationId,
      provider,
      model,
      toolsAllow,
      limits
    });
    return response as any;
  }

  // Brain streaming via SSE
  brainStream(
    prompt: string,
    conversationId?: string,
    model?: string,
    onDelta?: (delta: string) => void
  ): { close: () => void } {
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    if (conversationId) params.set('conversationId', conversationId);
    if (model) params.set('model', model);
    const url = `${this.baseUrl}/api/ai/brain/stream?${params.toString()}`;
    const es = new EventSource(url);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.delta && onDelta) onDelta(data.delta);
        if (data?.error) console.warn('brainStream error:', data.error);
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
    };
    return { close: () => { try { es.close(); } catch {} } };
  }

  // Agent (OpenAI-first) ask
  async agentAsk(prompt: string, toolsAllow?: string[], options: AIServiceOptions = {}): Promise<{
    final_text: string;
    tool_trace: Array<any>;
    model: string;
    provider: string;
  }> {
    return this.request('/api/agent/ask', { prompt, toolsAllow }, options) as unknown as any;
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
    return this.defaultOptions.provider || 'openai';
  }

  getActiveProvider(): string {
    return this.getProvider();
  }

  getModel(): string {
    return this.defaultOptions.model || 'gpt-4o-mini';
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