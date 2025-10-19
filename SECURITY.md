# Environment Variables Security Guide

## Overview

This app uses Vite for building. Vite exposes **only** environment variables prefixed with `VITE_` to the frontend bundle. All other variables remain server-side only.

## ✅ Safe for Frontend (Public)

These variables are **intentionally public** and included in your built JavaScript:

### Firebase Configuration
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```
**Why safe?** Firebase Auth restricts by domain/origin. These keys identify your project but cannot be abused from unauthorized domains.

### Google Maps API Key
```bash
VITE_GOOGLE_MAPS_API_KEY=
```
**Why safe?** Restrict this key in Google Cloud Console to your domain(s). Even if exposed, it only works on allowed domains.

### AI Service Config
```bash
VITE_LOCAL_AI_URL=https://your-backend.com
VITE_DEFAULT_AI_PROVIDER=claude
VITE_DEFAULT_AI_MODEL=claude-3-sonnet-20240229
VITE_REQUEST_TIMEOUT=30000
VITE_MAX_RETRIES=2
VITE_ADMIN_EMAIL=admin@example.com
```
**Why safe?** These are non-sensitive configuration values. Backend verifies auth tokens.

## 🚫 NEVER Expose (Server-Only)

These must **NEVER** have `VITE_` prefix and must stay server-side:

### AI Provider Keys
```bash
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_claude_api_key_here
```
**Why dangerous?** Direct API access = unlimited usage charges. Keep these in backend environment only.

### Email Service Keys
```bash
SENDGRID_API_KEY=your_sendgrid_key_here
```
**Why dangerous?** Could send spam or phishing emails from your account.

### Database Credentials
```bash
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
```
**Why dangerous?** Full database access including sensitive user data.

## Verification Checklist

Before deploying, verify:

1. **Check built files for secrets:**
   ```bash
   npm run build
   grep -r "sk-" dist/  # Check for OpenAI keys
   grep -r "AIza" dist/  # OK - Firebase keys are safe
   ```

2. **Inspect network tab:**
   - Open your deployed app
   - Check Developer Tools → Network
   - Verify API requests use your backend URL
   - Verify no API keys in request headers (except Firebase ID tokens)

3. **Review source code:**
   ```bash
   # Bad - exposes secret
   const apiKey = "sk-1234567890abcdef";
   
   # Good - loads from server
   const response = await fetch('/api/ai/chat', {
     headers: { Authorization: `Bearer ${firebaseToken}` }
   });
   ```

4. **Check .gitignore:**
   ```
   .env.local
   .env.production
   .env*.local
   ```

## Best Practices

1. **Rotate keys regularly**: Change API keys every 90 days
2. **Use Firebase App Check**: Add extra security layer for backend API calls
3. **Monitor usage**: Set up alerts for unusual API usage spikes
4. **Restrict by domain**: Configure API key restrictions in provider dashboards
5. **Audit regularly**: Review Firebase Auth logs for suspicious activity

## Example: Secure API Call

```typescript
// ✅ SECURE: Token generated client-side, verified server-side
async function callAI(prompt: string) {
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });
  
  return response.json();
}

// ❌ INSECURE: Never do this
const OPENAI_KEY = "sk-..."; // Exposed in bundle!
```

## Backend Security (Node.js Example)

```javascript
// Server-side: Verify Firebase token and call AI
const admin = require('firebase-admin');

app.post('/api/ai/chat', async (req, res) => {
  try {
    // 1. Verify Firebase ID token
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 2. Use server-side API key (from environment)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY  // Safe - server-side only
    });
    
    // 3. Call AI service
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: req.body.prompt }]
    });
    
    res.json(completion);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

## Questions?

- **"Can someone steal my Firebase API key?"** → Yes, but it's useless without your domain.
- **"Should I rotate Firebase keys?"** → No, they're designed to be public. Restrict by domain instead.
- **"What if my OpenAI key leaks?"** → Rotate immediately, check billing for abuse.
- **"How do I test locally?"** → Use `.env.local` file (never commit it).

## Further Reading

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
