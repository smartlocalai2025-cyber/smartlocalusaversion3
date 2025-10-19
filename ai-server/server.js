
console.log('Starting Morrow.AI Express server...');
const express = require('express');
const { MorrowAI } = require('./morrow');
const app = express();
// Simple async handler to catch rejected promises in Express 4
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.use(express.json());
const morrow = new MorrowAI();
const ADMIN_TOKEN = process.env.MORROW_ADMIN_TOKEN || 'localdev';

// Add knowledge file (admin only, basic)
app.post('/api/knowledge/add', asyncHandler(async (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const { filename, content } = req.body || {};
  if (!filename || !content) return res.status(400).json({ ok: false, error: 'Missing filename or content' });
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const fullPath = require('path').join(morrow.knowledgeDir, safeName);
  require('fs').writeFileSync(fullPath, content, 'utf8');
  morrow._loadKnowledge();
  res.json({ ok: true, filename: safeName, count: morrow.getStats().knowledgeCount });
}));

// Health + Stats + Features
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
app.post('/api/ai/chat', asyncHandler(async (req, res) => {
  const out = await morrow.chat(req.body || {});
  res.json(out);
}));
app.post('/api/ai/assistant', asyncHandler(async (req, res) => {
  const out = await morrow.assistant(req.body || {});
  res.json(out);
}));
app.post('/api/ai/generate', asyncHandler(async (req, res) => {
  const out = await morrow.generate(req.body || {});
  res.json(out);
}));
app.post('/api/ai/image', asyncHandler(async (req, res) => {
  const out = await morrow.image(req.body || {});
  res.json(out);
}));

// Advanced Features
app.post('/api/features/seo-analysis', asyncHandler(async (req, res) => res.json(await morrow.seoAnalysis(req.body || {}))));
app.post('/api/features/social-content', asyncHandler(async (req, res) => res.json(await morrow.socialContent(req.body || {}))));
app.post('/api/features/competitor-analysis', asyncHandler(async (req, res) => res.json(await morrow.competitorAnalysis(req.body || {}))));
app.post('/api/features/content-calendar', asyncHandler(async (req, res) => res.json(await morrow.contentCalendar(req.body || {}))));

// Audits & Reports
app.post('/api/audit/start', asyncHandler(async (req, res) => res.json(await morrow.startAudit(req.body || {}))));
app.post('/api/report/generate', asyncHandler(async (req, res) => res.json(await morrow.generateReport(req.body || {}))));

// Demo data used by UI
app.get('/api/leads', asyncHandler(async (req, res) => res.json(await morrow.listLeads())));
app.post('/api/ai/sendEmails', asyncHandler(async (req, res) => res.json(await morrow.sendEmails())));
app.post('/api/ai/audit', asyncHandler(async (req, res) => res.json(await morrow.runLeadAudit(req.body || {}))));
app.get('/api/actions', asyncHandler(async (req, res) => res.json(await morrow.actionsFeed())));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || 'Internal Server Error' });
});

// Listen on the port Cloud Run provides
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Morrow.AI server listening on port ${port}`);
});
