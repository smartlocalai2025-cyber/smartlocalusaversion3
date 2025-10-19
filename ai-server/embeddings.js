// Embeddings utilities for RAG over knowledge/
// Builds and queries a local vector store (embeddings.json)

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const DEFAULT_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const KB_DIR = process.env.MORROW_KNOWLEDGE_DIR || path.join(__dirname, 'knowledge');
const STORE_PATH = path.join(KB_DIR, 'embeddings.json');

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function listKnowledgeFiles(dir = KB_DIR) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter(f => ['.md', '.txt', '.json'].includes(path.extname(f).toLowerCase()))
    .map(f => path.join(dir, f));
  return files;
}

function readTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');
  if (ext === '.json') {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
  return raw;
}

function chunkText(text, opts = {}) {
  const size = opts.size || 800;
  const overlap = opts.overlap || 100;
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + size);
    chunks.push(chunk);
    i += size - overlap;
  }
  return chunks;
}

async function embedTexts(texts, model = DEFAULT_MODEL) {
  const client = getClient();
  if (!client) throw new Error('OPENAI_API_KEY not set');
  // OpenAI embeddings accept batch input
  const resp = await client.embeddings.create({ model, input: texts });
  return resp.data.map(d => d.embedding);
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return { model: DEFAULT_MODEL, items: [] };
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return { model: DEFAULT_MODEL, items: [] }; }
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

async function buildEmbeddingStore(options = {}) {
  const files = listKnowledgeFiles();
  const items = [];
  for (const filePath of files) {
    const content = readTextFile(filePath);
    const chunks = chunkText(content, options);
    const embeddings = await embedTexts(chunks, options.model || DEFAULT_MODEL);
    embeddings.forEach((vec, idx) => {
      items.push({
        file: path.basename(filePath),
        chunkIndex: idx,
        text: chunks[idx],
        vector: vec
      });
    });
  }
  const store = { model: options.model || DEFAULT_MODEL, items, updatedAt: new Date().toISOString() };
  saveStore(store);
  return store;
}

async function queryStore(query, k = 5, model = DEFAULT_MODEL) {
  const store = loadStore();
  if (!store.items.length) return { results: [], count: 0 };
  const client = getClient();
  if (!client) throw new Error('OPENAI_API_KEY not set');
  const q = await embedTexts([query], model);
  const qvec = q[0];
  const scored = store.items.map((it) => ({ it, score: cosineSim(qvec, it.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => ({
      file: s.it.file,
      chunkIndex: s.it.chunkIndex,
      score: Number(s.score.toFixed(4)),
      snippet: s.it.text.slice(0, 500)
    }));
  return { results: scored, count: scored.length };
}

module.exports = {
  DEFAULT_MODEL,
  KB_DIR,
  STORE_PATH,
  buildEmbeddingStore,
  queryStore,
  loadStore,
  saveStore,
  listKnowledgeFiles,
  chunkText,
};
