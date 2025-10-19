// Minimal Express AI server for Cloud Run/Firebase
const express = require('express');
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Example AI endpoint (replace with real logic)
app.post('/api/ai/chat', (req, res) => {
  const { prompt } = req.body;
  res.json({ text: `Echo: ${prompt}` });
});

// Listen on the port Cloud Run provides
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`AI server listening on port ${port}`);
});
