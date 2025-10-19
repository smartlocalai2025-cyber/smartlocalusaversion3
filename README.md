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

The app is deployed to Firebase Hosting.
**Live URL:** https://smartlocalai-b092a.web.app

Manual deployment:
```bash
npm run build
firebase deploy --only hosting
```

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