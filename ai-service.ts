// AI Service Layer for SMARTLOCAL.AI
// Handles communication with local AI server

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
  provider?: 'ollama' | 'openai' | 'gemini';
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

import { auth } from './firebase';

class LocalAIService {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, data: any): Promise<AIResponse> {
    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Attach Firebase ID token for admin-protected endpoints
      try {
        if (auth?.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers = { ...headers, Authorization: `Bearer ${token}` };
        }
      } catch {}

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`AI Service Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Backward compatibility with Firebase Functions format
  async generateContent(action: string, params: any, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/generate', {
      action,
      params,
      options,
    });
  }

  // Direct chat interface
  async chat(prompt: string, conversationId?: string, options: AIServiceOptions = {}): Promise<AIResponse> {
    return this.request('/api/ai/chat', {
      prompt,
      conversationId,
      options,
    });
  }

  // Image generation
  async generateImage(prompt: string, options: any = {}): Promise<AIResponse> {
    return this.request('/api/ai/image', {
      prompt,
      options,
    });
  }

  // 🎯 Advanced SEO Analysis
  async performSEOAnalysis(businessData: {
    businessName: string;
    website?: string;
    location?: string;
    industry?: string;
  }): Promise<AIResponse> {
    return this.request('/api/features/seo-analysis', businessData);
  }

  // 🖼️ Social Media Content Generation
  async generateSocialContent(contentData: {
    businessName: string;
    topic: string;
    platform?: string;
    tone?: string;
    includeImage?: boolean;
  }): Promise<AIResponse> {
    return this.request('/api/features/social-content', contentData);
  }

  // 🔍 Competitor Analysis
  async analyzeCompetitors(competitorData: {
    businessName: string;
    location: string;
    industry?: string;
    competitors?: string[];
  }): Promise<AIResponse> {
    return this.request('/api/features/competitor-analysis', competitorData);
  }

  // 📊 Custom Report Generation
  async generateCustomReport(reportData: {
    businessName: string;
    reportType: string;
    data?: any;
    template?: string;
  }): Promise<AIResponse> {
    return this.request('/api/features/custom-report', reportData);
  }

  // 📈 Content Calendar
  async createContentCalendar(calendarData: {
    businessName: string;
    industry?: string;
    timeframe?: string;
    platforms?: string[];
  }): Promise<AIResponse> {
    return this.request('/api/features/content-calendar', calendarData);
  }

  // 🤖 AI Assistant
  async askAssistant(message: string, context?: string, conversationId?: string): Promise<AIResponse> {
    return this.request('/api/features/assistant', {
      message,
      context,
      conversationId,
    });
  }

  // Get available features
  async getFeatures(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/features`);
    return response.json();
  }

  // Check AI service health
  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ai/health`);
    return response.json();
  }

  // Get available providers
  async getProviders(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ai/providers`);
    return response.json();
  }
}

// Create global instance
const localAI = new LocalAIService();

export { LocalAIService, localAI };
export type { AIResponse, AIServiceOptions };