# 🚀 Morrow.AI with Local AI Server

## Quick Setup Guide

### 1. Install AI Server Dependencies
```bash
cd ai-server
npm install
```

### 2. Choose Your AI Provider

#### Option A: Ollama (Recommended - Completely Local)
```bash
# Install Ollama from https://ollama.ai
# Then pull a model:
ollama pull llama3.1:8b

# Update .env:
DEFAULT_AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
```

#### Option B: OpenAI (Powerful but costs $)
```bash
# Update .env:
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
```

#### Option C: Gemini (Good balance)
```bash
# Update .env:
DEFAULT_AI_PROVIDER=gemini  
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Start AI Server
```bash
cd ai-server
npm run dev
# Server starts on http://localhost:3001
```

### 4. Start Your Webapp
```bash
# In main directory
npm run dev
# Webapp runs on http://localhost:5173
```

## 🎯 New Exciting Features

### ⚡ Advanced Features Tab
- **🎯 Advanced SEO Analysis**: Multi-step reasoning with competitor insights
- **🖼️ Social Media Content**: AI posts + optional image generation
- **🔍 Competitor Analysis**: Detailed market landscape analysis
- **📈 Content Calendar**: Strategic content planning for 30/60/90 days

### 🤖 AI Assistant Tab
- **Conversational AI**: Real-time business and SEO guidance
- **Memory**: Maintains conversation context
- **Expert Knowledge**: Local SEO, marketing, business growth

## 🔄 AI Provider Fallback System

The system automatically:
1. **Tries local AI** first (Ollama/OpenAI/Gemini)
2. **Falls back** to Firebase Functions if local fails
3. **Switches providers** if one is unavailable

## 🛡️ Benefits of Local AI

- **💰 Cost Control**: No per-token charges with Ollama
- **🔒 Privacy**: All data stays on your machine
- **⚡ Speed**: No internet latency for requests
- **🎛️ Control**: Choose models and settings
- **📶 Offline**: Works without internet (with Ollama)

## 🚀 Advanced Usage

### Multiple AI Providers
```javascript
// Force specific provider
const result = await localAI.generateContent('generateContent', {
  contents: 'Your prompt'
}, {
  provider: 'ollama' // or 'openai', 'gemini'
});
```

### Streaming Responses
```javascript
// Real-time streaming (coming soon)
const stream = await localAI.streamContent('Your prompt');
```

### Image Generation
```javascript
// Generate images with content
const result = await localAI.generateSocialContent({
  businessName: 'Joe\'s Pizza',
  topic: 'Weekend special',
  includeImage: true
});
```

## 🔧 Troubleshooting

### AI Server Not Starting?
```bash
# Check if port is in use
netstat -ano | findstr :3001

# Try different port
PORT=3002 npm run dev
```

### Ollama Not Working?
```bash
# Check if Ollama is running
ollama list

# Start Ollama service
ollama serve
```

### Connection Refused?
- Ensure AI server is running on port 3001
- Check CORS settings for your webapp port
- Verify firewall isn't blocking connections

## 📊 Performance Tips

1. **Ollama Models**: 
   - `llama3.1:8b` - Best balance of speed/quality
   - `llama3.1:70b` - Highest quality (requires 40GB+ RAM)
   - `mistral:7b` - Fastest responses

2. **Server Configuration**:
   - Increase `MAX_CONCURRENT_REQUESTS` for more parallel processing
   - Adjust `REQUEST_TIMEOUT` for longer content generation
   - Enable `ENABLE_STREAMING` for real-time responses

3. **Hardware**:
   - GPU acceleration with CUDA/Metal for faster inference
   - More RAM for larger models
   - SSD for faster model loading

Your local AI server is now ready to power exciting new features in your Morrow.AI webapp! 🎉