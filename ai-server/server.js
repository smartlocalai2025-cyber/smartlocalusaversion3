
console.log('Starting Morrow.AI Express server...');
const express = require('express');
const { MorrowAI } = require('./morrow');
const app = express();
app.use(express.json());
const morrow = new MorrowAI();
const ADMIN_TOKEN = process.env.MORROW_ADMIN_TOKEN || 'localdev';

// Add knowledge file (admin only, basic)
app.post('/api/knowledge/add', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const { filename, content } = req.body || {};
  if (!filename || !content) return res.status(400).json({ ok: false, error: 'Missing filename or content' });
  try {
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fullPath = require('path').join(morrow.knowledgeDir, safeName);
    require('fs').writeFileSync(fullPath, content, 'utf8');
    morrow._loadKnowledge();
    res.json({ ok: true, filename: safeName, count: morrow.getStats().knowledgeCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Health + Stats + Features
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', provider: morrow.name, model: morrow.model });
});
app.get('/api/stats', (req, res) => res.json(morrow.getStats()));
app.get('/api/features', (req, res) => res.json(morrow.getFeatures()));
// Providers (stubbed from orchestrator)
app.get('/api/ai/providers', (req, res) => {
  try {
    const providers = Object.keys(morrow.providers || {}).map(k => ({ id: k, ...morrow.providers[k] }));
    res.json({ providers });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Knowledge endpoints
app.get('/api/knowledge', (req, res) => {
  res.json({ count: morrow.getStats().knowledgeCount });
});
app.post('/api/knowledge/refresh', (req, res) => {
  try {
    morrow._loadKnowledge();
    res.json({ ok: true, count: morrow.getStats().knowledgeCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// AI Core
app.post('/api/ai/chat', async (req, res) => {
  const out = await morrow.chat(req.body || {});
  res.json(out);
});
app.post('/api/ai/assistant', async (req, res) => {
  const out = await morrow.assistant(req.body || {});
  res.json(out);
});
app.post('/api/ai/generate', async (req, res) => {
  const out = await morrow.generate(req.body || {});
  res.json(out);
});
app.post('/api/ai/image', async (req, res) => {
  const out = await morrow.image(req.body || {});
  res.json(out);
});

// Advanced Features
app.post('/api/features/seo-analysis', async (req, res) => res.json(await morrow.seoAnalysis(req.body || {})));
app.post('/api/features/social-content', async (req, res) => res.json(await morrow.socialContent(req.body || {})));
app.post('/api/features/competitor-analysis', async (req, res) => res.json(await morrow.competitorAnalysis(req.body || {})));
app.post('/api/features/content-calendar', async (req, res) => res.json(await morrow.contentCalendar(req.body || {})));

// Audits & Reports
app.post('/api/audit/start', async (req, res) => res.json(await morrow.startAudit(req.body || {})));
app.post('/api/report/generate', async (req, res) => res.json(await morrow.generateReport(req.body || {})));

// Demo data used by UI
app.get('/api/leads', async (req, res) => res.json(await morrow.listLeads()));
app.post('/api/ai/sendEmails', async (req, res) => res.json(await morrow.sendEmails()));
app.post('/api/ai/audit', async (req, res) => res.json(await morrow.runLeadAudit(req.body || {})));
app.get('/api/actions', async (req, res) => res.json(await morrow.actionsFeed()));

// Listen on the port Cloud Run provides
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Morrow.AI server listening on port ${port}`);
});
