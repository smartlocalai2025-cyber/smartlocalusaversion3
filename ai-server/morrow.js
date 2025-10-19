// Morrow.AI Orchestrator
// Central brain that fronts all AI features for the app.
// Implements a simple tool-exec pattern and provides consistent responses.

const os = require('os');
const fs = require('fs');
const path = require('path');
const { IntentParser } = require('./intent-parser');
const { ResponseFormatter } = require('./response-formatter');

class MorrowAI {
  constructor() {
    this.name = 'Morrow.AI';
    this.model = process.env.MORROW_MODEL || 'controller-v1';
    this.queue = [];
    this.memory = new Map(); // conversationId -> [{ role, content, ts }]
    this.stats = {
      totalRequests: 0,
      avgLatency: 0,
      totalTokens: 0,
      costEstimate: 0,
    };
    this.features = [
      'ai.chat',
      'ai.assistant',
      'features.seo-analysis',
      'features.social-content',
      'features.competitor-analysis',
      'features.content-calendar',
      'audit.start',
      'report.generate',
      'leads.list',
      'emails.sendOutreach',
      'actions.feed',
    ];

    // Initialize intent parser and response formatter
    this.intentParser = new IntentParser();
    this.responseFormatter = new ResponseFormatter({ useEmojis: true });

    // In-memory knowledge base loaded from disk
    this.knowledgeDir = process.env.MORROW_KNOWLEDGE_DIR || path.join(__dirname, 'knowledge');
    this.knowledge = [];

    // High-level system knowledge for contextual answers
    this.knowledge = {
      app: 'SMARTLOCAL.AI',
      branding: 'Morrow.AI',
      frontend: 'Vite + React + TypeScript',
      backend: 'Node.js Express on Cloud Run via Firebase Hosting rewrites',
      security: {
        csp: true, hsts: true, xfo: 'DENY', referrerPolicy: 'no-referrer'
      },
      maps: {
        preciseLocationOnFirstLoad: true,
        userPromptOnMapMove: true,
        programmaticMoveGuard: true,
        placesDetailsForWebsite: true,
      },
      endpoints: {
        health: '/api/health',
        stats: '/api/stats',
        features: '/api/features',
        ai: ['/api/ai/chat','/api/ai/generate','/api/ai/image','/api/ai/assistant'],
        advanced: ['/api/features/seo-analysis','/api/features/social-content','/api/features/competitor-analysis','/api/features/content-calendar'],
        audit: ['/api/audit/start','/api/report/generate'],
        leads: ['/api/leads','/api/ai/sendEmails','/api/ai/audit'],
        actions: ['/api/actions']
      }
    };

    // Provider registry (stubs) and selection logic
    this.providers = {
      claude: { name: 'claude', reliability: 0.99 },
      openai: { name: 'openai', reliability: 0.98 },
      gemini: { name: 'gemini', reliability: 0.97 },
      ollama: { name: 'ollama', reliability: 0.95 },
    };
    this.preferredOrder = ['claude','openai','gemini','ollama'];
    this.activeProvider = this._chooseProvider();

    // Load knowledge from disk
    this._loadKnowledge();

    // Persona configuration
    this.persona = {
      name: 'Morrow',
      vibe: 'high-energy, encouraging, straight-talking, not robotic',
      style: {
        emojis: true,
        maxEmojis: 2,
        bulletPrefix: '•',
        signoff: 'What do you want to tackle next?'
      },
      principles: [
        'Be human: use short paragraphs and clear language',
        'Mirror the user\'s energy and tone without overdoing it',
        'If unclear, be cool about it; offer 2-3 concrete next steps',
        "Prefer action over theory—always suggest what we can do now",
        'Keep it respectful, positive, and confident'
      ]
    };
  }

  _updateStats(durationMs, tokens = 0, cost = 0) {
    const n = this.stats.totalRequests;
    this.stats.avgLatency = Math.round(((this.stats.avgLatency * n) + durationMs) / (n + 1));
    this.stats.totalRequests += 1;
    this.stats.totalTokens += tokens;
    this.stats.costEstimate = Number((this.stats.costEstimate + cost).toFixed(6));
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      systemLoad: os.loadavg()[0],
      totalTokens: this.stats.totalTokens,
      costEstimate: this.stats.costEstimate,
      avgLatency: this.stats.avgLatency,
      totalRequests: this.stats.totalRequests,
      provider: this.name,
      model: this.model,
      activeProvider: this.activeProvider,
      knowledgeCount: Array.isArray(this._kb) ? this._kb.length : 0,
    };
  }

  getFeatures() {
    return { name: this.name, model: this.model, features: this.features };
  }

  async _simulateWork(fn, logKnowledge = null) {
    const start = Date.now();
    this.queue.push(start);
    try {
      const result = await fn();
      if (logKnowledge) {
        this._logKnowledgeCall(logKnowledge);
      }
      return result;
    } finally {
      const duration = Date.now() - start;
      this._updateStats(duration);
      this.queue.shift();
    }
  }

  _inferTone(text = '') {
    const t = (text || '').trim();
    const loud = (t.match(/!/g) || []).length;
    const urgent = /\b(asap|urgent|now|immediately)\b/i.test(t) || loud >= 3;
    const casual = /\b(bro|dude|lol|hey|yo)\b/i.test(t);
    const formal = /\b(dear|regards|sincerely)\b/i.test(t);
    if (urgent) return 'urgent';
    if (casual) return 'casual';
    if (formal) return 'formal';
    if (loud > 0) return 'high-energy';
    return 'neutral';
  }

  _maybeEmoji(tone) {
    if (!this.persona?.style?.emojis) return '';
    const map = {
      'urgent': '⚡',
      'high-energy': '🔥',
      'casual': '🙂',
      'formal': '📌',
      'neutral': '✨'
    };
    return map[tone] || '✨';
  }

  _isAmbiguous(text = '') {
    const t = (text || '').trim();
    if (t.length < 3) return true;
    const hasQuestion = t.includes('?');
    const hasVerb = /\b(do|make|create|analyze|help|need|want|should|can|build|fix)\b/i.test(t);
    return !hasQuestion && !hasVerb;
  }

  _pushMessage(conversationId, role, content) {
    if (!conversationId) return;
    const arr = this.memory.get(conversationId) || [];
    arr.push({ role, content, ts: Date.now() });
    // keep only last 12
    this.memory.set(conversationId, arr.slice(-12));
  }

  _getContextSnippet(conversationId) {
    const arr = this.memory.get(conversationId) || [];
    if (!arr.length) return '';
    // take last 2 user messages for quick context
    const last = arr.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' | ');
    return last ? `Recent context: ${last}` : '';
  }

  _companionReply({ prompt, fullPrompt, snippets, tone, ambiguous, suggestions }) {
    const emoji = this._maybeEmoji(tone);
    const lead = tone === 'urgent' ? 'On it' : tone === 'high-energy' ? 'Let\'s go' : tone === 'casual' ? 'Gotcha' : 'Got it';
    const bullet = this.persona?.style?.bulletPrefix || '-';
    const knowledgeLines = (snippets || []).slice(0,3).map(s => `${bullet} From: ${s.title}`);
    const knowledgeBlock = knowledgeLines.length ? `\n\nKnowledge I can use:\n${knowledgeLines.join('\n')}` : '';
    const clarifier = ambiguous ? `I might be a bit off—mind clarifying what you want?` : '';
    const sug = suggestions && suggestions.length ? `\n\nNext steps:\n${suggestions.slice(0,3).map(s=>`${bullet} ${s}`).join('\n')}` : '';
    const tail = this.persona?.style?.signoff ? `\n\n${this.persona.style.signoff}` : '';
    return `${emoji} ${lead}. You said: "${fullPrompt || prompt}". ${clarifier}${knowledgeBlock}${sug}${tail}`.trim();
  }

  async chat({ prompt, conversationId }) {
    return this._simulateWork(async () => {
      const convId = conversationId || `conv_${Date.now()}`;
      const tone = this._inferTone(prompt);
      const snippets = this._searchKnowledge(prompt, 3, 500);
      const ambiguous = this._isAmbiguous(prompt);
      const suggestions = [
        'Run a quick audit to benchmark your local presence',
        'Draft an outreach email for new leads',
        'Generate 3 SEO-optimized post ideas'
      ];
      const response = this._companionReply({ prompt, fullPrompt: prompt, snippets, tone, ambiguous, suggestions });
      this._pushMessage(convId, 'user', prompt);
      this._pushMessage(convId, 'assistant', response);
      return {
        response,
        conversationId: convId,
        provider: this.name,
        tone,
        timestamp: new Date().toISOString(),
      };
    }, { type: 'chat', prompt, conversationId });
  }

  async assistant({ prompt, context, conversationId }) {
    return this._simulateWork(async () => {
      const convId = conversationId || `conv_${Date.now()}`;
      const fullPrompt = `${context ? `[Context:${context}] `: ''}${prompt}`;
      const tone = this._inferTone(fullPrompt);
      
      // Parse intent from natural language
      const parsed = this.intentParser.parse(prompt, context || {});
      
      // If we have missing fields, ask for clarification
      if (parsed.missingFields && parsed.missingFields.length > 0) {
        const clarification = this.intentParser.getClarificationQuestion(parsed);
        const response = this.responseFormatter.format({
          response: clarification,
          noSuggestions: true
        }, { tone, includeNextSteps: false });
        
        this._pushMessage(convId, 'user', fullPrompt);
        this._pushMessage(convId, 'assistant', response);
        
        return {
          response,
          conversationId: convId,
          provider: this.name,
          tone,
          intent: parsed.intent,
          needsClarification: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Execute the action if we have all required fields
      let result = null;
      if (parsed.action && parsed.confidence > 0.5 && this[parsed.action]) {
        try {
          result = await this[parsed.action](parsed.parameters);
        } catch (e) {
          console.warn('Action execution failed:', e);
        }
      }

      // Format the response with human-style
      const snippets = this._searchKnowledge(fullPrompt, 3, 500);
      const responseData = result || {
        response: this._companionReply({ 
          prompt, 
          fullPrompt, 
          snippets, 
          tone, 
          ambiguous: parsed.confidence < 0.7,
          suggestions: []
        })
      };
      
      // Add action details to response
      responseData.action = parsed.action;
      responseData.intent = parsed.intent;
      
      const formattedResponse = this.responseFormatter.format(responseData, { 
        tone, 
        includeNextSteps: true 
      });
      
      this._pushMessage(convId, 'user', fullPrompt);
      this._pushMessage(convId, 'assistant', formattedResponse);
      
      return {
        response: formattedResponse,
        conversationId: convId,
        provider: this.name,
        tone,
        intent: parsed.intent,
        action: parsed.action,
        confidence: parsed.confidence,
        timestamp: new Date().toISOString(),
      };
    }, { type: 'assistant', prompt, context, conversationId });
  }

  async generate({ action, params }) {
    return this._simulateWork(async () => {
      return { text: `Generated (${action}) for ${params?.businessName || params?.topic || 'request'}` };
    }, { type: 'generate', action, params });
  }

  async image({ prompt }) {
    return this._simulateWork(async () => ({ images: [`https://placehold.co/1024x576?text=${encodeURIComponent(prompt || 'Morrow.AI')}`] }), { type: 'image', prompt });
  }

  async seoAnalysis({ businessName, website, location, industry }) {
    return this._simulateWork(async () => ({
      analysis: `SEO Analysis for ${businessName}${website?` (${website})`:''}${location?` in ${location}`:''}${industry?` [${industry}]`:''}\n\n- GBP: Ensure categories, photos, reviews\n- On-Page: Titles, H1, NAP, internal links\n- Citations: Yelp, BBB, Apple Maps\n- Reviews: Implement request cadence\n- Competitors: Identify 2-3 and gaps\n- Actions: Top 5 quick wins`,
      provider: this.name,
      timestamp: new Date().toISOString(),
    }), { type: 'seoAnalysis', businessName, website, location, industry });
  }

  async socialContent({ businessName, topic, platform, tone, includeImage }) {
    const text = `Post for ${businessName} on ${platform || 'social'} (tone: ${tone || 'friendly'}): ${topic}. #${(businessName||'local').toLowerCase().replace(/\s+/g,'')}`;
    const images = includeImage ? [`https://placehold.co/800x600?text=${encodeURIComponent(topic)}`] : [];
    return this._simulateWork(async () => ({ content: text, images, provider: this.name }), { type: 'socialContent', businessName, topic, platform, tone, includeImage });
  }

  async competitorAnalysis({ businessName, location, industry }) {
    const text = `Competitor analysis for ${businessName} in ${location}.\n- Likely competitors: 2-3 peers in ${industry || 'category'}\n- Strengths/Weaknesses\n- Opportunities & differentiators`;
    return this._simulateWork(async () => ({ analysis: text, provider: this.name }), { type: 'competitorAnalysis', businessName, location, industry });
  }

  async contentCalendar({ businessName, industry, timeframe = '30', platforms = [] }) {
    const days = Number(timeframe) || 30;
    const text = `Content calendar for ${businessName} (${industry || 'general'}) over ${days} days on ${platforms.join(', ') || 'default platforms'}.`;
    return this._simulateWork(async () => ({ calendar: text, provider: this.name }), { type: 'contentCalendar', businessName, industry, timeframe, platforms });
  }

  async startAudit({ businessName, website, scope = [] }) {
    return this._simulateWork(async () => ({
      report: `Started audit for ${businessName}${website?` (${website})`:''}. Scope: ${scope.join(', ') || 'standard local SEO'}.`,
      provider: this.name,
    }), { type: 'startAudit', businessName, website, scope });
  }

  async generateReport({ auditId, format = 'markdown' }) {
    const content = `# Audit Report\n\nID: ${auditId || 'N/A'}\n\nGenerated by ${this.name}.`;
    return this._simulateWork(async () => ({ report: content, provider: this.name, format }), { type: 'generateReport', auditId, format });
  }

  async explainCapabilities() {
    const bulletChar = this.persona?.style?.bulletPrefix || '•';
    const capabilities = `I can help you with:

${bulletChar} **SEO Analysis** - Check your Google rankings and local presence
${bulletChar} **Social Content** - Create posts for Facebook, Instagram, LinkedIn
${bulletChar} **Business Audits** - Full review of your online presence
${bulletChar} **Competitor Analysis** - See how you stack up in your market
${bulletChar} **Content Calendar** - Plan your content for the month
${bulletChar} **Reports** - Generate detailed findings and recommendations

Just tell me what you need in plain English!`;
    
    return { response: capabilities, provider: this.name };
  }

  // Log unique API calls to knowledge store
  _logKnowledgeCall(call) {
    if (!call || !this.knowledgeDir) return;
    try {
      const hash = this._hashCall(call);
      const fname = `call_${hash}.json`;
      const full = path.join(this.knowledgeDir, fname);
      if (fs.existsSync(full)) return; // already logged
      fs.writeFileSync(full, JSON.stringify({ ...call, timestamp: new Date().toISOString() }, null, 2), 'utf8');
      this._loadKnowledge();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to log knowledge call:', e?.message || e);
    }
  }

  _hashCall(call) {
    // Simple hash: JSON.stringify, then base64 of first 12 chars
    const str = JSON.stringify(call);
    return Buffer.from(str).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
  }

  // Demo data endpoints used by the UI
  async listLeads() {
    return this._simulateWork(async () => ({ leads: [
      { id: 'lead1', name: 'Downtown Pizza', location: 'Riverside, CA', website: 'https://downtownpizza.example' },
      { id: 'lead2', name: 'Sunset Plumbing', location: 'San Diego, CA', website: 'https://sunsetplumbing.example' },
    ]}));
  }

  async sendEmails() {
    return this._simulateWork(async () => ({ results: ['lead1: sent', 'lead2: sent'] }));
  }

  async runLeadAudit({ leadId }) {
    return this._simulateWork(async () => ({ status: 'ok', leadId, summary: `Audit summary for ${leadId}` }));
  }

  async actionsFeed() {
    const now = Date.now();
    return this._simulateWork(async () => ({ actions: [
      { id: `evt_${now-20000}`, type: 'email', timestamp: now-20000, lead: { name: 'Downtown Pizza' }, subject: 'Outreach sent', status: 'queued' },
      { id: `evt_${now-5000}`, type: 'audit', timestamp: now-5000, lead: { name: 'Sunset Plumbing' }, summary: 'Audit generated' },
    ] }));
  }

  // Provider selection and knowledge helpers
  _chooseProvider() {
    // Basic strategy: pick highest reliability from preferredOrder.
    for (const key of this.preferredOrder) {
      if (this.providers[key]) return key;
    }
    return 'claude';
  }

  _loadKnowledge() {
    this._kb = [];
    try {
      if (!fs.existsSync(this.knowledgeDir)) return;
      const files = fs.readdirSync(this.knowledgeDir);
      for (const file of files) {
        const full = path.join(this.knowledgeDir, file);
        const stat = fs.statSync(full);
        if (!stat.isFile()) continue;
        const ext = path.extname(file).toLowerCase();
        if (!['.md','.txt','.json'].includes(ext)) continue;
        const content = fs.readFileSync(full, 'utf8');
        let body = content;
        if (ext === '.json') {
          try { const obj = JSON.parse(content); body = JSON.stringify(obj, null, 2); } catch {}
        }
        this._kb.push({ title: file, content: body.slice(0, 10000) }); // cap per file
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Knowledge load failed:', e?.message || e);
    }
  }

  _searchKnowledge(query, limit = 3, maxCharsPer = 800) {
    if (!query || !this._kb || !this._kb.length) return [];
    const q = String(query).toLowerCase();
    const scored = this._kb.map(k => ({
      k,
      score: (k.content.toLowerCase().includes(q) ? 2 : 0) + (k.title.toLowerCase().includes(q) ? 1 : 0)
    })).filter(x => x.score > 0).sort((a,b)=>b.score-a.score);
    return scored.slice(0, limit).map(x => ({
      title: x.k.title,
      snippet: x.k.content.slice(0, maxCharsPer)
    }));
  }
}

module.exports = { MorrowAI };
