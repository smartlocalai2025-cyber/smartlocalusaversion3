// Agent routes: OpenAI-first engine wrappers
const express = require('express');
const routerFactory = (morrow) => {
  const router = express.Router();
  const { AgentService } = require('../services/agent');
  const agent = new AgentService(morrow);

  // Generic agent ask (LLM + tools)
  router.post('/ask', async (req, res, next) => {
    try {
      const { prompt, model, toolsAllow } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'prompt is required' });
      const out = await agent.runPrompt(prompt, { model, toolsAllow });
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  // Scan places (placeholder unless integrated)
  router.post('/scan-places', async (req, res) => {
    return res.status(501).json({ ok: false, error: 'search_places not configured in this environment' });
  });

  // Run audits for a list of businesses
  router.post('/run-audits', async (req, res, next) => {
    try {
      const { businesses } = req.body || {};
      if (!Array.isArray(businesses) || !businesses.length) {
        return res.status(400).json({ error: 'businesses must be a non-empty array' });
      }
      const results = await Promise.all(
        businesses.slice(0, 10).map(b => morrow.startAudit({ businessName: b.name || b, website: b.website, scope: b.scope || [] }))
      );
      res.json({ ok: true, count: results.length, results });
    } catch (e) {
      next(e);
    }
  });

  // Outreach step 1 (demo email send)
  router.post('/outreach/step1', async (req, res, next) => {
    try {
      const result = await morrow.sendEmails();
      res.json({ ok: true, result, note: 'Demo send; integrate provider to actually send.' });
    } catch (e) {
      next(e);
    }
  });

  // Cron endpoints (stubs)
  router.get('/cron/scan-places', (req, res) => res.json({ ok: true, scheduled: true, task: 'scan-places' }));
  router.get('/cron/run-audits', (req, res) => res.json({ ok: true, scheduled: true, task: 'run-audits' }));
  router.get('/cron/outreach-step1', (req, res) => res.json({ ok: true, scheduled: true, task: 'outreach-step1' }));
  router.get('/cron/cleanup', (req, res) => res.json({ ok: true, scheduled: true, task: 'cleanup' }));

  return router;
};

module.exports = routerFactory;
