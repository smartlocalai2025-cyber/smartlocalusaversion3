console.log('Starting Morrow.AI Express server...');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const fsPromises = require('fs').promises;
const net = require('net');
const { MorrowAI } = require('./morrow');
const app = express();
// Simple async handler to catch rejected promises in Express 4
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.use(express.json());
// Allow cross-origin requests in case frontend is on a different origin (dev/proxy or separate host)
app.use(cors());
const morrow = new MorrowAI();
const ADMIN_TOKEN = process.env.MORROW_ADMIN_TOKEN || 'localdev';
const IS_PROD = process.env.NODE_ENV === 'production';
const ADMIN_ENABLED = !(IS_PROD && ADMIN_TOKEN === 'localdev');

// Add knowledge file (admin only, basic)
app.post('/api/knowledge/add', asyncHandler(async (req, res) => {
  if (!ADMIN_ENABLED) return res.status(403).json({ ok: false, error: 'Admin actions disabled: set MORROW_ADMIN_TOKEN' });
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const { filename, content } = req.body || {};
  if (!filename || !content) return res.status(400).json({ ok: false, error: 'Missing filename or content' });
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const fullPath = require('path').join(morrow.knowledgeDir, safeName);
  await fsPromises.writeFile(fullPath, content, 'utf8');
  morrow._loadKnowledge();
  res.json({ ok: true, filename: safeName, count: morrow.getStats().knowledgeCount });
}));

// Health + Stats + Features
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', provider: 'Morrow.AI', root: true });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', provider: morrow.name, model: morrow.model });
});
app.get('/api/stats', (req, res) => res.json(morrow.getStats()));
app.get('/api/features', (req, res) => res.json(morrow.getFeatures()));
// Providers (stubbed from orchestrator)
app.get('/api/ai/providers', asyncHandler(async (req, res) => {
  const providers = Object.keys(morrow.providers || {}).map(k => ({ id: k, ...morrow.providers[k] }));
  res.json({ providers });
}));

// Knowledge endpoints
app.get('/api/knowledge', (req, res) => {
  res.json({ count: morrow.getStats().knowledgeCount });
});
app.post('/api/knowledge/refresh', asyncHandler(async (req, res) => {
  morrow._loadKnowledge();
  res.json({ ok: true, count: morrow.getStats().knowledgeCount });
}));

// AI Core
// Chat: route through brain (OpenAI logic) for conversational responses
app.post('/api/ai/chat', asyncHandler(async (req, res) => {
  const { prompt, conversationId, provider, model, toolsAllow, limits } = req.body || {};
  const out = await morrow.brain({
    prompt,
    conversationId,
    provider: provider || 'openai',
    model,
    toolsAllow,
    limits
  });
  // Keep backward-compatible shape with a `response` field
  res.json({ ...out, response: out.final_text });
}));

// Assistant: also use brain, optionally prepending context
app.post('/api/ai/assistant', asyncHandler(async (req, res) => {
  const { prompt, context, conversationId, provider, model, toolsAllow, limits } = req.body || {};
  const fullPrompt = context ? `[Context:${context}] ${prompt}` : prompt;
  const out = await morrow.brain({
    prompt: fullPrompt,
    conversationId,
    provider: provider || 'openai',
    model,
    toolsAllow,
    limits
  });
  res.json({ ...out, response: out.final_text });
}));
app.post('/api/ai/generate', asyncHandler(async (req, res) => {
  const out = await morrow.generate(req.body || {});
  res.json(out);
}));
app.post('/api/ai/image', asyncHandler(async (req, res) => {
  const out = await morrow.image(req.body || {});
  res.json(out);
}));

// Brain mode: LLM-driven tool orchestration
app.post('/api/ai/brain', asyncHandler(async (req, res) => {
  const out = await morrow.brain(req.body || {});
  res.json(out);
}));

// Brain streaming via SSE: incremental tokens from OpenAI
app.get('/api/ai/brain/stream', asyncHandler(async (req, res) => {
  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const prompt = req.query.prompt || '';
  const conversationId = req.query.conversationId || undefined;
  const model = req.query.model || undefined;
  const provider = 'openai';

  // Prepare OpenAI client
  try {
    const { OpenAIAdapter } = require('./providers/openai');
    const adapter = new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY });
    if (!adapter.isConfigured()) throw new Error('OpenAI not configured');

    // Build messages using the same system identity as brain()
    const messages = [
      { role: 'system', content: `You ARE Morrow.AI ("Morrow"). Be enthusiastic, clear, and action-oriented.` },
      { role: 'user', content: String(prompt || '') }
    ];

    // Stream via OpenAI SDK
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      stream: true
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true, text: full })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e?.message || 'stream error' })}\n\n`);
    res.end();
  }
}));

// Agent routes (OpenAI-first engine)
try {
  const agentRouter = require('./routes/agent')(morrow);
  app.use('/api/agent', agentRouter);
} catch (e) {
  console.warn('Agent routes not loaded:', e?.message || e);
}

// Audit management routes
try {
  const auditRouter = require('./routes/audits');
  app.use('/api/audits', auditRouter);
} catch (e) {
  console.warn('Audit routes not loaded:', e?.message || e);
}

// Advanced Features
app.post('/api/features/seo-analysis', asyncHandler(async (req, res) => res.json(await morrow.seoAnalysis(req.body || {}))));
app.post('/api/features/social-content', asyncHandler(async (req, res) => res.json(await morrow.socialContent(req.body || {}))));
app.post('/api/features/competitor-analysis', asyncHandler(async (req, res) => res.json(await morrow.competitorAnalysis(req.body || {}))));
app.post('/api/features/content-calendar', asyncHandler(async (req, res) => res.json(await morrow.contentCalendar(req.body || {}))));

// Audits & Reports
app.post('/api/audit/start', asyncHandler(async (req, res) => res.json(await morrow.startAudit(req.body || {}))));
app.post('/api/report/generate', asyncHandler(async (req, res) => res.json(await morrow.generateReport(req.body || {}))));

// Website Intelligence handler (extracted)
const handleWebsiteIntel = async (req, res) => {
  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Valid url is required (http/https)' });
  }
  // Basic SSRF protections: block localhost/private networks/metadata IPs
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
    const isIp = net.isIP(host) !== 0;
    let isPrivate = false;
    if (isIp) {
      if (host.includes(':')) {
        // IPv6 simple checks
        isPrivate = host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd');
      } else {
        const parts = host.split('.').map(n => parseInt(n, 10));
        const [a,b] = parts;
        isPrivate = (
          a === 10 ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          a === 127 ||
          (a === 169 && b === 254) ||
          a === 0
        );
      }
    }
    if (isLocalHost || isPrivate) {
      return res.status(400).json({ error: 'Blocked host. Only public websites are allowed.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    if (typeof fetch !== 'function') {
      throw new Error('fetch is not available in this runtime; require Node.js 18+');
    }
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'MorrowAI/1.0 (+https://smartlocal.ai)', 'Accept': 'text/html,application/xhtml+xml' } });
    clearTimeout(timeout);
    if (!resp.ok) {
      return res.status(502).json({ error: `Upstream HTTP ${resp.status}` });
    }
    const ct = (resp.headers.get && resp.headers.get('content-type')) || '';
    if (ct && !ct.includes('text/html')) {
      return res.status(415).json({ error: `Unsupported content-type: ${ct}` });
    }
    const html = await resp.text();
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const h1 = $('h1').map((i, el) => $(el).text().trim()).get().slice(0, 5);
    const h2 = $('h2').map((i, el) => $(el).text().trim()).get().slice(0, 8);
    // Grab visible text from common sections (limit size)
    const textBlocks = [];
    $('p, li').each((i, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t && t.length > 40 && t.length < 500) textBlocks.push(t);
    });
    const contentSample = textBlocks.slice(0, 50);
    res.json({
      ok: true,
      url,
      title: ogTitle || title,
      description,
      h1,
      h2,
      contentSample
    });
  } catch (e) {
    clearTimeout(timeout);
    return res.status(500).json({ error: e?.message || 'Failed to fetch website' });
  }
};

// Website Intelligence: original path
app.post('/api/intel/website', asyncHandler(handleWebsiteIntel));
// Website Intelligence: alias path to avoid ad-block false positives on "intel"
app.post('/api/fetch/site', asyncHandler(handleWebsiteIntel));

// Demo data used by UI
app.get('/api/leads', asyncHandler(async (req, res) => res.json(await morrow.listLeads())));
app.post('/api/ai/sendEmails', asyncHandler(async (req, res) => res.json(await morrow.sendEmails())));
app.post('/api/ai/audit', asyncHandler(async (req, res) => res.json(await morrow.runLeadAudit(req.body || {}))));
app.get('/api/actions', asyncHandler(async (req, res) => res.json(await morrow.actionsFeed())));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err);
  } else {
    console.error('Unhandled error:', err?.message || err);
  }
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || 'Internal Server Error' });
});

// Listen on the port Cloud Run provides
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Morrow.AI server listening on port ${port}`);
});
