# Run Morrow.AI locally (demo)

Prereqs
- Node.js 18+
- Firebase project with Google sign-in enabled (Web API keys for frontend)
- Optional: SendGrid API key if you want real emails; otherwise sandbox mode

Env setup (frontend)
Create .env.local at repo root with your Firebase web config:
- VITE_FIREBASE_API_KEY=
- VITE_FIREBASE_AUTH_DOMAIN=
- VITE_FIREBASE_PROJECT_ID=
- VITE_FIREBASE_STORAGE_BUCKET=
- VITE_FIREBASE_MESSAGING_SENDER_ID=
- VITE_FIREBASE_APP_ID=

Env setup (backend ai-server/.env)
- DEFAULT_AI_PROVIDER=ollama (or openai|gemini)
- OPENAI_API_KEY= (if using openai)
- GEMINI_API_KEY= (if using gemini)
- SENDGRID_API_KEY= (optional)
- SENDGRID_FROM_EMAIL= (optional)
- PUBLIC_BASE_URL=http://localhost:3000

Start servers
1) Backend
- npm --prefix ai-server install
- npm --prefix ai-server start

2) Frontend
- npm install
- npm run dev

Open http://localhost:3000
- Sign in with Google
- Admin-only sections require: tjmorrow909@gmail.com

Demo flow
- Go to Leads (admin only)
- Click "Send Outreach Emails" (will sandbox if SendGrid not configured)
- Click a lead’s "Run SEO Audit"
- Open Agent Feed to watch actions stream in

Troubleshooting
- 401/403 on /api: ensure you’re logged in as the admin email; token is sent automatically
- CORS: handled via Vite proxy to http://localhost:3001
- AI provider errors: set DEFAULT_AI_PROVIDER and API keys, or start Ollama on 11434
