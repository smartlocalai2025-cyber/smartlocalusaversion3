<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SMARTLOCAL.AI — Webapp + Morrow.AI Companion

SMARTLOCAL.AI is the platform. Morrow.AI is the built-in companion that powers audits, insights, and chat.

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
  # Optional: allow multiple admin emails (comma-separated)
  VITE_ADMIN_EMAILS=smartlocalai2025@gmail.com,your_admin_email

  # Frontend defaults
  VITE_LOCAL_AI_URL=http://localhost:3001
  VITE_DEFAULT_AI_PROVIDER=openai
  VITE_DEFAULT_AI_MODEL=gpt-4o-mini
   VITE_REQUEST_TIMEOUT=30000
   VITE_MAX_RETRIES=2

  # Brain Mode (OpenAI-driven tool orchestration)
  OPENAI_API_KEY=your_openai_api_key
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
└── dist/              # Production build
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## 🧰 Local Firebase Emulators

Run the Auth and Firestore emulators to catch most failures locally (rules, indexes, auth flows):

```bash
npm run emulators         # Starts Auth (9099) and Firestore (8088) with import/export
npm run dev:all:emu       # Emulators + Vite dev server (3000) + AI server (8080)
```

Notes
- The frontend auto-connects to the emulators in dev mode (see `firebase.ts`).
- Firestore emulator runs on 8088 to avoid clashing with the AI server on 8080.
- Use the Emulator UI at http://localhost:4000 to inspect data and rule denials.


## 📦 Deployment

The app is deployed to Firebase Hosting.
**Live URL:** https://smartlocalai-b092a.web.app

Manual deployment:
```bash
npm run build
firebase deploy --only hosting
```

### Self-host at home (no Google Cloud)

You can run the backend on your own machine and point the UI at it. See HOME-SERVER.md for a step-by-step guide. Quick gist:
- Start backend: set `AUTH_MODE=local` in `ai-server/.env`, then `npm --prefix ai-server start`
- Expose it: either port-forward 8080 or use Cloudflare Tunnel/Tailscale
- Point UI: set `VITE_LOCAL_AI_URL` to your public URL (and `VITE_AUTH_PROVIDER=local` during dev)
Read more in [HOME-SERVER.md](HOME-SERVER.md).

### Enable GitHub Pages (one-time)

If the deployment action fails with a 404, make sure GitHub Pages is enabled for this repository:

- Go to Repository Settings → Pages
- Build and deployment → Source: GitHub Actions
- Save

Our workflow uploads the `dist` folder as the Pages artifact and then deploys it using `actions/deploy-pages`. The site is built for the base path `/smartlocalusaversion3/` as configured in `vite.config.ts`.

## 🔒 Security & Privacy

### Authentication & Authorization
- **Firebase Authentication**: Secure Google Sign-In with industry-standard OAuth 2.0
- **ID Token Verification**: All API requests verified server-side
- **Admin Controls**: Sensitive features restricted by email allowlist
- **Session Management**: Automatic token refresh and secure logout

### Data Protection
- **HTTPS Enforced**: All traffic encrypted with TLS 1.3
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more configured
- **No API Keys in Frontend**: Sensitive keys stay server-side only
- **Secure Storage**: LocalStorage only for non-sensitive settings (UI preferences)
- **Firebase Security Rules**: Database access restricted by auth state

### Infrastructure Security
- **Rate Limiting**: Built-in request throttling (60/min default)
- **Timeout Protection**: Requests auto-abort after 30s
- **Error Handling**: No sensitive info leaked in error messages
- **CORS Configured**: Backend only accepts requests from authorized domains
- **Regular Updates**: Dependencies monitored and updated

### Privacy Guarantees
- **No Third-Party Trackers**: No analytics or ad networks
- **Minimal Data Collection**: Only what's needed for functionality
- **Firebase Analytics**: Optional, can be disabled
- **Local-First AI**: Your backend, your data
- **No Data Sharing**: User data never sold or shared

### Compliance Ready
- GDPR-friendly (user data deletion on request)
- SOC 2 compliant infrastructure (Firebase/Google Cloud)
- Audit logs available via Firebase Console

**See [SECURITY.md](SECURITY.md) for detailed security practices and [DEPLOYMENT.md](DEPLOYMENT.md) for secure deployment instructions.**

## 📚 API Examples

```typescript
import { localAI } from './services/ai-service';

// Chat with Morrow.AI (OpenAI under-the-hood)
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

// Brain mode: Let OpenAI orchestrate tool calls
const brainResponse = await localAI.brain(
  'Analyze the website https://example.com and create an audit',
  undefined, // conversationId
  'openai',  // provider
  'gpt-4o-mini' // model
);
console.log(brainResponse.final_text); // AI's final answer
console.log(brainResponse.tool_trace); // Tools used
```

## 🧠 Brain Mode

Brain mode lets a real LLM (OpenAI, Claude, etc.) act as the orchestrator that decides which tools to run. MorrowAI exposes safe tools and executes them with guardrails.

### How it works
1. You send a prompt to `/api/ai/brain`
2. The LLM decides which tools to call (search_knowledge, website_intel, leads_list, audit_start, report_generate)
3. MorrowAI validates inputs, executes tools safely, and feeds results back
4. The LLM iterates (up to `maxSteps`) until it produces a final answer
5. You get: `final_text`, `tool_trace`, `steps_used`, `provider`, `model`

### Available tools
- `search_knowledge`: Search the knowledge base
- `website_intel`: Fetch and analyze website content (public sites only)
- `leads_list`: Get current leads/prospects
- `audit_start`: Start a business audit
- `report_generate`: Generate an audit report

### Safety guardrails
- **maxSteps**: Default 4 (configurable via `limits.maxSteps`)
- **maxTime**: Default 20s (configurable via `limits.maxTimeMs`)
- **Tool allowlist**: Optionally restrict which tools the LLM can call via `toolsAllow` parameter
- **Input validation**: All tool arguments validated against JSON schemas
- **SSRF protection**: Website fetching blocked for localhost/private IPs
- **Auth**: Sensitive endpoints require Firebase auth + admin token

### Configuration
Set `OPENAI_API_KEY` in your `.env` or `.env.local` (backend only—never expose in frontend).

### Example usage (frontend)
```typescript
const result = await localAI.brain(
  'Find leads in the database and start an audit for the first one',
  undefined,
  'openai',
  'gpt-4o-mini'
);
```

### Example usage (API)
```bash
curl -X POST http://localhost:8080/api/ai/brain \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Search the knowledge base for SEO best practices",
    "provider": "openai",
    "model": "gpt-4o-mini"
  }'
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a PR