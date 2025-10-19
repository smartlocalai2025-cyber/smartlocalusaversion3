#!/usr/bin/env node
// Build embeddings for knowledge/ content

// Load env from root .env.local if available
try {
  const path = require('path');
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  dotenv.config({ path: envPath });
} catch {}

const { buildEmbeddingStore, KB_DIR, STORE_PATH } = require('../embeddings');

(async () => {
  try {
    console.log('📚 Building embeddings from:', KB_DIR);
    const store = await buildEmbeddingStore({ size: 800, overlap: 100 });
    console.log('✅ Embeddings saved to:', STORE_PATH);
    console.log('Chunks:', store.items.length, 'Model:', store.model);
  } catch (e) {
    console.error('❌ Failed to build embeddings:', e.message);
    process.exit(1);
  }
})();
