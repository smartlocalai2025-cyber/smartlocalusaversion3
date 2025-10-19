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

interface AIServiceOptions {
  provider?: 'ollama' | 'openai' | 'gemini' | 'claude';
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

class LocalAIService {
  private baseUrl: string;
  private defaultOptions: AIServiceOptions;
  
  constructor() {
    this.baseUrl = (import.meta.env.VITE_LOCAL_AI_URL as string) || 'http://localhost:3001';
    this.defaultOptions = {
      provider: (import.meta.env.VITE_DEFAULT_AI_PROVIDER as string) || 'claude',
      model: (import.meta.env.VITE_DEFAULT_AI_MODEL as string) || 'claude-3-sonnet-20240229',
    };
  }

  private async request(endpoint: string, data: any): Promise<AIResponse> {
    const controller = new AbortController();
    const timeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Provider': this.defaultOptions.provider,
        'X-Model': this.defaultOptions.model
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

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
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
}

// Create global instance
const localAI = new LocalAIService();

export { LocalAIService, localAI };
export type { AIResponse, AIServiceOptions };