// Morrow.AI Orchestrator
// Central brain that fronts all AI features for the app.
// Implements a simple tool-exec pattern and provides consistent responses.

const os = require('os');
const fs = require('fs');
const path = require('path');

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

    // In-memory knowledge base loaded from disk
    this.knowledgeDir = process.env.MORROW_KNOWLEDGE_DIR || path.join(__dirname, 'knowledge');
    this.knowledge = [];

    // High-level system knowledge for contextual answers
    this.knowledge = {
  app: 'Morrow.AI',
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

    // Provider registry: OpenAI is the brain (Morrow.AI); Gemini and Maps are optional helpers
    this.providers = {
      openai: { name: 'openai', reliability: 1.0, role: 'brain' },
      gemini: { name: 'gemini', reliability: 0.95, role: 'helper' },
    };
    this.preferredOrder = ['openai', 'gemini'];
    this.activeProvider = 'openai'; // Always OpenAI for Morrow.AI

    // Load knowledge from disk
    this._loadKnowledge();
  // Load persistent memory (if any) and periodically persist memory to disk
  try { this._loadMemoryFromDisk(); } catch (e) {}
  this._memorySaveInterval = setInterval(() => { try { this._saveMemoryToDisk(); } catch (e) {} }, 30_000);

    // Master Persona configuration
    this.persona = {
      name: 'Morrow',
      vibe: 'high-energy, expert, ultra-encouraging, straight-talking, never robotic',
      style: {
        emojis: true,
        // Global cap; tone-specific caps below further restrict
        maxEmojis: 2,
        toneEmojiCaps: { formal: 0, neutral: 1, 'high-energy': 2, urgent: 1 },
        bulletPrefix: '•',
        signoff: 'What next can we conquer together?',
        // Repetition/verbosity controls
        repetitionPolicy: { dedupeLines: true, maxSimilar: 1 },
        defaultVerbosity: 'concise'
      },
      principles: [
        'Be human: speak clearly, act decisively, and keep things simple',
        'Always match and raise the user’s energy—be their best coach',
        'When unclear, ask one focused clarifying question and propose 2 strong next steps',
        'Lead with action: turn theory into impact—recommend bold moves',
        'Maintain respect, positivity, warmth, and authority at all times',
        'Prefer grounded claims; state assumptions when uncertain and propose how to verify',
        'Avoid repeating yourself—remove redundant lines and keep it tight',
        'Default to professional tone with minimal emojis unless user prefers otherwise'
      ],
      auditTemplate: {
        tone: 'formal',
        sections: ['Title','Executive Summary','Findings','Website Signals','Top Actions','Next Steps'],
        bullets: { executiveSummary: 5, topActions: 7 }
      },
      learning: {
        adaptEmojiPreference: true,
        rememberPreferredVerbosity: true
      }
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

  // Persistent memory file for simple restart survival
  _memoryFile() {
    try {
      return path.join(this.knowledgeDir, 'memory.json');
    } catch (e) {
      return null;
    }
  }


  // Save memory to disk periodically so the agent can "remember" across restarts
  _saveMemoryToDisk() {
    try {
      const mf = this._memoryFile();
      if (!mf) return;
      const obj = {};
      for (const [k, arr] of this.memory.entries()) obj[k] = arr.slice(-50);
      fs.writeFileSync(mf, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save memory:', e?.message || e);
    }
  }

  _loadMemoryFromDisk() {
    try {
      const mf = this._memoryFile();
      if (!mf || !fs.existsSync(mf)) return;
      const raw = fs.readFileSync(mf, 'utf8');
      const obj = JSON.parse(raw);
      for (const k of Object.keys(obj || {})) this.memory.set(k, obj[k] || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load memory:', e?.message || e);
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
    // Tone-based caps
    const cap = (this.persona?.style?.toneEmojiCaps || {})[tone] ?? this.persona?.style?.maxEmojis ?? 1;
    if (!cap || cap <= 0) return '';
    const map = {
      'urgent': '⚡',
      'high-energy': '🔥',
      'casual': '🙂',
      'formal': '',
      'neutral': '✨'
    };
    return map[tone] || (cap > 0 ? '✨' : '');
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
    // Lightweight preference learning
    this._learnFromUser(fullPrompt || prompt);

    const emoji = this._maybeEmoji(tone);
    const lead = tone === 'urgent' ? 'On it' : tone === 'high-energy' ? 'Let\'s go' : tone === 'casual' ? 'Gotcha' : 'Got it';
    const bullet = this.persona?.style?.bulletPrefix || '-';
    const knowledgeLines = (snippets || []).slice(0,3).map(s => `${bullet} From: ${s.title}`);
    const knowledgeBlock = knowledgeLines.length ? `\n\nKnowledge I can use:\n${knowledgeLines.join('\n')}` : '';
    const clarifier = ambiguous ? `Quick clarifier: What\'s the main goal you want here?` : '';
    const sug = suggestions && suggestions.length ? `\n\nNext steps:\n${suggestions.slice(0,3).map(s=>`${bullet} ${s}`).join('\n')}` : '';
    const tail = this.persona?.style?.signoff ? `\n\n${this.persona.style.signoff}` : '';

    const raw = `${emoji ? emoji + ' ' : ''}${lead}. You said: "${fullPrompt || prompt}". ${clarifier}${knowledgeBlock}${sug}${tail}`.trim();
    return this._reduceRepetition(raw);
  }

  // Reduce repeated lines/phrases to keep voice fresh and friendly
  _reduceRepetition(text = '') {
    try {
      if (!text) return text;
      const lines = text.split('\n');
      const seen = new Set();
      const out = [];
      for (const line of lines) {
        const norm = line.trim().replace(/\s+/g, ' ').toLowerCase();
        if (!norm) continue;
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(line);
      }
      return out.join('\n');
    } catch { return text; }
  }

  // Learn lightweight user preferences from phrasing
  _learnFromUser(prompt = '') {
    try {
      const p = (prompt || '').toLowerCase();
      if (this.persona?.learning?.adaptEmojiPreference) {
        if (/no emoji|no emojis|disable emoji/.test(p)) this.persona.style.emojis = false;
        if (/more emoji|more emojis|be playful/.test(p)) { this.persona.style.emojis = true; this.persona.style.maxEmojis = 2; }
      }
      if (this.persona?.learning?.rememberPreferredVerbosity) {
        if (/be brief|keep it short|tl;dr/.test(p)) this.persona.style.defaultVerbosity = 'concise';
        if (/be detailed|go deep|more detail/.test(p)) this.persona.style.defaultVerbosity = 'detailed';
      }
    } catch {}
  }

  // Create a short summary from recent conversation and persist as a knowledge file
  _summarizeConversationToKB(conversationId) {
    try {
      const arr = this.memory.get(conversationId) || [];
      if (!arr.length) return null;
      // Build a compact summary: last user+assistant exchanges
      const lines = [];
      const slice = arr.slice(-20);
      for (const m of slice) {
        const who = m.role === 'user' ? 'User' : 'Assistant';
        lines.push(`- ${who}: ${String(m.content).replace(/\n/g, ' ' ).slice(0, 800)}`);
      }
      const summary = [`# Conversation Summary (${conversationId})`, '', 'Recent exchange:', '', ...lines].join('\n');
      // Persist to knowledge dir
      const fname = `conv_${conversationId}_${Date.now()}.md`;
      const full = path.join(this.knowledgeDir, fname);
      fs.writeFileSync(full, summary, 'utf8');
      // Refresh KB index
      this._loadKnowledge();
      return { title: fname, path: full };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to summarize conversation:', e?.message || e);
      return null;
    }
  }

  // Smarter suggestion generator that weights actions by context and past user behavior
  _generateSmartSuggestions(fullPrompt, snippets = []) {
    const low = (s) => ({ text: s, priority: 1 });
    const med = (s) => ({ text: s, priority: 2 });
    const high = (s) => ({ text: s, priority: 3 });
    const out = [];
    const fp = (fullPrompt || '').toLowerCase();
    if (fp.includes('launch') || fp.includes('campaign') || fp.includes('big')) {
      out.push(high('Draft a launch plan with timeline and channels'));
      out.push(med('Prepare 3 promotional posts for GBP and social channels'));
    }
    if (fp.includes('audit') || fp.includes('seo')) {
      out.push(high('Run a local SEO audit (GBP, citations, on-page)'));
      out.push(med('Generate prioritized action list with estimated effort'));
    }
    if (fp.includes('competitor')) {
      out.push(high('Run competitor analysis for the specified location'));
    }
    // Add snippet-driven suggestions
    if ((snippets || []).length) {
      out.push(med('I found related knowledge that might help — would you like an action plan based on it?'));
    }
    // Fallback suggestions
    if (!out.length) {
      out.push(med('Run a quick audit to benchmark your local presence'));
      out.push(low('Generate 3 SEO-optimized post ideas'));
      out.push(low('Draft a follow-up outreach email'));
    }
    // Return sorted by priority desc and as text array
    return out.sort((a,b)=>b.priority-a.priority).map(o=>o.text);
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
      const snippets = this._searchKnowledge(fullPrompt, 3, 500);
      const ambiguous = this._isAmbiguous(fullPrompt);
      let suggestions = [
        'Start a full business audit',
        'Run a local SEO analysis',
        'Generate a 30-day content calendar'
      ];
      const fp = fullPrompt.toLowerCase();
      if (fp.includes('audit')) suggestions.unshift('Kick off an audit with your business name and website');
      if (fp.includes('seo')) suggestions.unshift('Perform a detailed SEO check (GBP, citations, on-page)');
      if (fp.includes('competitor')) suggestions.unshift('Run a competitor analysis for your city and niche');
      const response = this._companionReply({ prompt, fullPrompt, snippets, tone, ambiguous, suggestions });
      this._pushMessage(convId, 'user', fullPrompt);
      this._pushMessage(convId, 'assistant', response);
      return {
        response,
        conversationId: convId,
        provider: this.name,
        tone,
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

  async seoAnalysis({ businessName, website, location, industry, websiteContent, placesData }) {
    const signals = [];
    if (websiteContent) {
      const picks = [...new Set([...(websiteContent.h1||[]).slice(0,2), ...(websiteContent.h2||[]).slice(0,2), websiteContent.description || ''].filter(Boolean))].slice(0,4);
      if (picks.length) signals.push(`• ${picks.join('\n• ')}`);
    }
    const title = `SEO Analysis: ${businessName}${website?` (${website})`:''}${location?` — ${location}`:''}${industry?` [${industry}]`:''}`;
    const placeBits = placesData ? [
      placesData.rating ? `Rating: ${placesData.rating} (${placesData.user_ratings_total} reviews)` : null,
      placesData.business_status ? `Status: ${placesData.business_status}` : null,
      placesData.opening_hours && typeof placesData.opening_hours.isOpenNow === 'boolean' ? `Open Now: ${placesData.opening_hours.isOpenNow ? 'Yes' : 'No'}` : null,
      placesData.price_level !== undefined ? `Price Level: ${placesData.price_level}` : null,
      placesData.formatted_phone_number ? `Phone: ${placesData.formatted_phone_number}` : null,
    ].filter(Boolean).map(s=>`• ${s}`).join('\n') : '';
    const summary = [
      '• Snapshot of local presence and quick wins',
      '• Prioritized actions to move the needle fast',
      '• Assumptions are stated where data is missing'
    ].slice(0, this.persona?.auditTemplate?.bullets?.executiveSummary || 5).join('\n');
    const findings = [
      '• GBP: Categories, photos, reviews, Q&A completeness',
      '• On-Page: Titles, H1, NAP, internal links, Lighthouse basics',
      '• Citations: Yelp, BBB, Apple Maps, data aggregators',
      '• Reviews: Volume/velocity, response cadence, ask flow',
      '• Social: Activity and relevance to local audience',
      '• Competitors: 2–3 local peers and differentiation'
    ].join('\n');
    const actions = [
      '• Fix top 5 on-page issues (titles/H1/NAP) — high impact/low effort',
      '• Refresh GBP photos and add missing categories — high trust gain',
      '• Standardize citations across top directories — consistency boost',
      '• Implement review ask cadence (2x/week) — improve rating density',
      '• Publish 2 location-focused posts/month — local relevance'
    ].slice(0, this.persona?.auditTemplate?.bullets?.topActions || 7).join('\n');
    const nextSteps = '• Want me to generate a detailed action plan or tackle the first fix next?';

    const body = [
      `# ${title}`,
      '',
      '## Executive Summary',
      summary,
      '',
      '## Findings',
      findings,
      '',
  '## Website Signals',
      signals.length ? signals.join('\n') : '• Not enough site signals detected; we can fetch more details if you share a URL.',
      '',
  placesData ? '## Google Place Details\n' + (placeBits || '• No summary available') + '\n' : '',
  placesData && placesData.opening_hours?.weekday_text ? '### Hours\n' + placesData.opening_hours.weekday_text.map((d)=>`• ${d}`).join('\n') + '\n' : '',
  placesData && Array.isArray(placesData.reviews) && placesData.reviews.length ? '### Recent Reviews\n' + placesData.reviews.map((r)=>`• (${r.rating}/5) ${r.text || ''} — ${r.author_name || ''}`).slice(0,3).join('\n') + '\n' : '',
  '',
      '## Top Actions',
      actions,
      '',
      '## Next Steps',
      nextSteps
    ].join('\n');

    return this._simulateWork(async () => ({
      analysis: body,
      provider: this.name,
      timestamp: new Date().toISOString(),
    }), { type: 'seoAnalysis', businessName, website, location, industry, websiteContent });
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

    async startAudit({ businessName, website, location, industry, profileId }) {
      // Use new comprehensive audit engine
      const { AuditEngine } = require('./services/audit-engine');
      const engine = new AuditEngine(this);
    
      return this._simulateWork(async () => {
        const audit = await engine.runFullAudit({ businessName, website, location, industry, profileId });
        return {
          audit,
          provider: this.name,
        };
      }, { type: 'startAudit', businessName, website, location, industry, profileId });
    }

  async generateReport({ auditId, format = 'markdown' }) {
    const content = `# Audit Report\n\nID: ${auditId || 'N/A'}\n\nGenerated by ${this.name}.`;
    return this._simulateWork(async () => ({ report: content, provider: this.name, format }), { type: 'generateReport', auditId, format });
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

  /**
   * Brain mode: let a real LLM (OpenAI, Claude, etc.) decide which tools to run
   * The model orchestrates tool calls; MorrowAI executes safely and feeds results back
   * @param {Object} params
   * @param {string} params.prompt - User prompt
   * @param {string} params.conversationId - Conversation ID for memory
   * @param {string} params.provider - Provider name (openai, claude, gemini, ollama)
   * @param {string} params.model - Model name (gpt-4o-mini, claude-3-5-sonnet, etc.)
   * @param {Array<string>} params.toolsAllow - Optional tool allowlist
   * @param {Object} params.limits - Optional limits {maxSteps, maxTimeMs}
   * @returns {Promise<{final_text, tool_trace, steps_used, provider, model, conversationId}>}
   */
  async brain({ prompt, conversationId, provider = 'openai', model, toolsAllow, limits = {} }) {
    const startTime = Date.now();
    const convId = conversationId || `brain_${Date.now()}`;
    const maxSteps = limits.maxSteps || 4;
    const maxTimeMs = limits.maxTimeMs || 20000;

    // Load provider adapter
    let adapter;
    try {
      if (provider === 'openai') {
        const { OpenAIAdapter } = require('./providers/openai');
        adapter = new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY });
      } else {
        throw new Error(`Unsupported provider: ${provider}. Only 'openai' is implemented currently.`);
      }

      if (!adapter.isConfigured()) {
        throw new Error(`Provider ${provider} not configured: missing API key`);
      }
    } catch (error) {
      throw new Error(`Failed to load provider: ${error.message}`);
    }

    // Initialize tool registry
    const { ToolRegistry } = require('./tools');
    const registry = new ToolRegistry(this);
    const toolDefinitions = registry.getToolDefinitions(toolsAllow);

    // Build system message: train OpenAI to BE Morrow.AI (not "powered by" but "you ARE")
    const systemMessage = {
      role: 'system',
      content: [
        // Core identity: OpenAI is trained to be Morrow.AI
  `You ARE Morrow.AI ("Morrow"). This is your identity. You were trained specifically to be Morrow.AI.`,
        `Never mention OpenAI, Claude, Gemini, or any other AI company. You are Morrow.AI. Period.`,
        `Personality: ${this.persona.vibe}.`,
        `Principles: ${this.persona.principles.join('; ')}.`,
        // Style and tone
        `Style: Keep responses ${this.persona.style.defaultVerbosity}, avoid repetition, use at most ${this.persona.style.maxEmojis} emoji(s) where appropriate.`,
        `When users ask "who are you" or "what AI is this," respond: "I'm Morrow.AI, your assistant for local business growth."`,
        // Capabilities
        `You have direct access to tools: knowledge search, website analysis, lead listing, audits, reports. Use tools strategically to gather facts before answering.`,
        `If a tool fails, explain briefly and continue with available information.`,
        // Output behavior
        `Provide clear, actionable answers. If the user's intent is unclear, ask one focused clarifying question and propose 2-3 next steps.`,
        `You are confident, helpful, and action-oriented. You are Morrow.AI.`,
      ].join('\n')
    };

    // Initialize conversation with system + user prompt
    const messages = [systemMessage];
    
    // Add recent context from memory if available
    const contextSnippet = this._getContextSnippet(convId);
    if (contextSnippet) {
      messages.push({ role: 'system', content: contextSnippet });
    }

    messages.push({ role: 'user', content: prompt });

    // Store for trace
    const toolTrace = [];
    let stepsUsed = 0;
    let finalText = '';

    // Tool-calling loop with guardrails
    for (let step = 0; step < maxSteps; step++) {
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        finalText = `⏱️ Reached time limit. Here's what I found so far:\n\n${finalText || 'Still gathering information...'}`;
        break;
      }

      stepsUsed++;

      try {
        // Send to provider
        const response = await adapter.sendMessage(messages, toolDefinitions, { model, temperature: 0.7 });

        // Check if model wants to call tools
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Execute each tool call
          for (const toolCall of response.toolCalls) {
            const toolName = toolCall.name;
            let toolArgs;
            
            try {
              toolArgs = JSON.parse(toolCall.arguments);
            } catch (e) {
              toolArgs = {};
            }

            // Validate tool is allowed
            if (!registry.isToolAllowed(toolName, toolsAllow)) {
              throw new Error(`Tool ${toolName} not allowed`);
            }

            // Execute tool
            let toolResult;
            try {
              toolResult = await registry.executeTool(toolName, toolArgs);
              toolTrace.push({
                step: stepsUsed,
                tool: toolName,
                input: toolArgs,
                output: toolResult,
                timestamp: Date.now(),
                success: true
              });
            } catch (error) {
              toolResult = { error: error.message };
              toolTrace.push({
                step: stepsUsed,
                tool: toolName,
                input: toolArgs,
                output: toolResult,
                timestamp: Date.now(),
                success: false,
                error: error.message
              });
            }

            // Add tool call and result to conversation
            messages.push({
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolName,
                  arguments: toolCall.arguments
                }
              }]
            });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }

          // Continue loop to get next response
          continue;
        }

        // No tool calls - this is the final answer
        finalText = response.content || 'No response generated.';
        
        // Store in memory
        this._pushMessage(convId, 'user', prompt);
        this._pushMessage(convId, 'assistant', finalText);
        
        break;

      } catch (error) {
        throw new Error(`Brain loop error at step ${stepsUsed}: ${error.message}`);
      }
    }

    // If we exhausted steps without a final answer
    if (!finalText && stepsUsed >= maxSteps) {
      finalText = `⚡ Reached step limit (${maxSteps}). Based on the tools I used, here's a summary:\n\n${toolTrace.map(t => `• ${t.tool}: ${t.success ? 'success' : 'failed'}`).join('\n')}`;
    }

    const duration = Date.now() - startTime;
    this._updateStats(duration);

    return {
      final_text: finalText,
      tool_trace: toolTrace,
      steps_used: stepsUsed,
      provider: adapter.getName(),
      model: model || 'default',
      conversationId: convId,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    };
  }

  // Provider selection: always OpenAI (Morrow.AI brain)
  _chooseProvider() {
    return 'openai';
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
