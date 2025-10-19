<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SmartLocal USA AI Assistant

A powerful local-first AI assistant using multiple providers including Claude Sonnet 3.5 for enhanced performance and privacy.

View your app in AI Studio: https://ai.studio/apps/drive/13R4fDxC_pdM0tIOgMSQC9Wz_PWGdsEFB

## 🚀 Quick Start

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment in `.env.local`:
   ```bash
   # Required
   GEMINI_API_KEY=your_gemini_api_key
   VITE_ADMIN_EMAIL=your_admin_email

   # Optional - Claude Configuration (defaults shown)
   VITE_LOCAL_AI_URL=http://localhost:3001
   VITE_DEFAULT_AI_PROVIDER=claude
   VITE_DEFAULT_AI_MODEL=claude-3-sonnet-20240229
   VITE_REQUEST_TIMEOUT=30000
   VITE_MAX_RETRIES=2
   ```

3. Start development:
   ```bash
   # Start both frontend and AI server
   npm run dev:all
   
   # Or start separately:
   npm run dev        # Frontend only
   npm run start:server  # AI server only
   ```
## 🏗️ Project Structure

```
smartlocalusaversion3/
├── src/               # Frontend source code
│   ├── components/    # React components
│   ├── services/      # API services including AI
│   └── __tests__/    # Test files
├── ai-server/         # Local AI server
├── functions/         # Firebase Functions
└── dist/             # Production build
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## 📦 Deployment

The app is automatically deployed to GitHub Pages when pushing to the main branch.
Visit: https://smartlocalai2025-cyber.github.io/smartlocalusaversion3/

Manual deployment:
```bash
npm run build
npm run preview  # Test production build locally
```

## 🔒 Security Features

- Firebase Authentication
- Request encryption in transit
- Timeout and retry logic
- Rate limiting
- Admin-only sections

## 📚 API Examples

```typescript
import { localAI } from './services/ai-service';

// Chat with Claude
const response = await localAI.chat('Your prompt');

// Generate content
const content = await localAI.generateContent('blog', { 
  topic: 'AI trends 2025'
});

// SEO analysis
const seo = await localAI.performSEOAnalysis({
  businessName: 'SmartLocal',
  website: 'https://example.com'
});

// Social media content
const social = await localAI.generateSocialContent({
  businessName: 'SmartLocal',
  topic: 'AI news',
  platform: 'twitter'
});
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a PR