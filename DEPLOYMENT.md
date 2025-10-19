## Secure Deployment Guide

**Live URL:** https://smartlocalai-b092a.web.app
**Project ID:** smartlocalai-b092a

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Authenticated: `firebase login`
3. Project selected: `firebase use smartlocalai-b092a`

## Environment Variables

### Safe to Expose (Built into Frontend)
These are prefixed with `VITE_` and included in the build:

```bash
# Firebase config (public by design)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI service config
VITE_LOCAL_AI_URL=https://your-backend.com
VITE_DEFAULT_AI_PROVIDER=claude
VITE_DEFAULT_AI_MODEL=claude-3-sonnet-20240229
VITE_REQUEST_TIMEOUT=30000
VITE_MAX_RETRIES=2
VITE_ADMIN_EMAIL=your_admin@example.com

# Google Maps (public by design, restricted by domain)
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### NEVER Expose (Server-Side Only)
These must ONLY be in backend/functions `.env`:

```bash
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
SENDGRID_API_KEY=your_sendgrid_key
```

## Deployment Steps

### 1. Build for Production

```bash
# Install dependencies
npm install

# Build the app (uses .env.local or .env.production)
npm run build

# Verify build output in dist/
ls -lh dist/
```

### 2. Deploy to Firebase Hosting

```bash
# Deploy hosting only
firebase deploy --only hosting

# Or deploy everything (hosting + functions + firestore)
firebase deploy
```

### 3. Connect Your Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `smartlocal.ai` or `www.smartlocal.ai`)
4. Firebase will provide DNS records to add:

**For IONOS DNS:**
- Delete existing `A` record for `www` (35.219.200.12)
- Add Firebase's `A` records (provided by Firebase)
- Add Firebase's `TXT` record for verification

**Example Firebase DNS records:**
```
Type  Host   Value
A     www    151.101.1.195
A     www    151.101.65.195
TXT   www    [verification-code-from-firebase]
```

5. Wait for DNS propagation (15 min - 24 hours)
6. Firebase will auto-provision SSL certificate

## Security Checklist

✅ **HTTPS Only**: Firebase Hosting enforces HTTPS automatically  
✅ **Security Headers**: CSP, HSTS, X-Frame-Options configured in `firebase.json`  
✅ **API Keys Protected**: Backend keys never in frontend code  
✅ **Firebase Auth**: All sensitive endpoints require ID token  
✅ **Admin Guard**: Admin features restricted by email allowlist  
✅ **CORS**: Backend must allow your domain  
✅ **Rate Limiting**: AI service has built-in rate limits  

## Backend Configuration

Your backend at `http://localhost:3001` needs to be deployed separately and configured with:

1. **CORS Headers**: Allow your Firebase Hosting domain
2. **Environment Variables**: Load sensitive keys from secure storage
3. **Token Verification**: Verify Firebase ID tokens on protected endpoints
4. **HTTPS**: Use Cloud Run, App Engine, or similar with SSL

Update `VITE_LOCAL_AI_URL` in your `.env.production` to your deployed backend URL.

## Post-Deployment Testing

```bash
# Preview locally before deploying
npm run build
npm run preview

# Check security headers after deployment
curl -I https://your-domain.com

# Test Firebase Auth flow
# Test AI service connectivity
# Verify admin-only features are protected
```

## Rollback

```bash
# View hosting releases
firebase hosting:channel:list

# Revert to previous version
firebase hosting:rollback
```

## Monitoring

- Firebase Console → Hosting → Usage
- Firebase Console → Authentication → Users
- Firebase Console → Firestore → Usage
- Check browser console for CSP violations

## Cost Optimization

- Firebase Hosting: Free for <10GB/month
- Firebase Auth: Free for <50k users
- Firestore: Free for <1GB, <50k reads/day
- Backend AI calls: Monitor token usage

## Support

For issues, check:
- Firebase status: https://status.firebase.google.com
- Logs: Firebase Console → Functions → Logs
- DNS: `nslookup your-domain.com`
