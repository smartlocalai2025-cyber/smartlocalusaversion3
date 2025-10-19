// Lightweight mock AI API server for local testing
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.MOCK_AI_PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Simple in-memory stats
let totalTokens = 0;
let queueLength = 0;
let systemLoad = 12.3;

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Providers endpoint
app.get('/api/ai/providers', (req, res) => {
  res.json({ providers: ['claude', 'ollama', 'gemini', 'openai'] });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({ queueLength, systemLoad, totalTokens, costEstimate: +(totalTokens * 0.000002).toFixed(4) });
});

// Chat
app.post('/api/ai/chat', (req, res) => {
  const { prompt } = req.body || {};
  totalTokens += Math.max(10, Math.floor((prompt || '').length / 4));
  res.json({ text: `Echo: ${prompt}`, provider: req.header('X-Provider') || 'claude' });
});

// Generate content
app.post('/api/ai/generate', (req, res) => {
  const { action, params } = req.body || {};
  res.json({ content: `Generated for action '${action}' with params ${JSON.stringify(params)}` });
});

// Generate image
app.post('/api/ai/image', (req, res) => {
  const { prompt } = req.body || {};
  res.json({ images: [`data:image/svg+xml;base64,${Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><text x='10' y='50'>${(prompt||'img').slice(0,20)}</text></svg>`).toString('base64')}`] });
});

// Assistant
app.post('/api/ai/assistant', (req, res) => {
  const { prompt, context, conversationId } = req.body || {};
  res.json({ response: `Assistant says about '${prompt}' (ctx: ${context||'none'})`, conversationId: conversationId || 'mock-convo-1' });
});

// Feature: SEO analysis
app.post('/api/features/seo-analysis', (req, res) => {
  const { businessName, website, location, industry } = req.body || {};
  res.json({ analysis: `SEO analysis for ${businessName || 'Unknown'} at ${website || 'n/a'} (${location || 'n/a'}) in ${industry || 'general'}.` });
});

// Feature: Social content
app.post('/api/features/social-content', (req, res) => {
  const { businessName, topic, platform } = req.body || {};
  res.json({ content: `Post for ${businessName}: ${topic} on ${platform || 'generic'}, plus 2 images.`, images: ['data:image/png;base64,','data:image/png;base64,'] });
});

// Feature: Competitor analysis
app.post('/api/features/competitor-analysis', (req, res) => {
  const { businessName, location } = req.body || {};
  res.json({ analysis: `Competitors for ${businessName} in ${location}: A, B, C.` });
});

// Feature: Content calendar
app.post('/api/features/content-calendar', (req, res) => {
  const { businessName, timeframe } = req.body || {};
  res.json({ calendar: `Content calendar for ${businessName} over ${timeframe || '30 days'}.` });
});

// Audit start
app.post('/api/audit/start', (req, res) => {
  const id = `audit-${Date.now()}`;
  res.json({ text: `Audit started with id ${id}`, id });
});

// Report generate
app.post('/api/report/generate', (req, res) => {
  const { format } = req.body || {};
  res.json({ report: `# Report\n\nGenerated in ${format || 'markdown'} format.` });
});

app.listen(PORT, () => {
  console.log(`Mock AI API server running on http://localhost:${PORT}`);
});
