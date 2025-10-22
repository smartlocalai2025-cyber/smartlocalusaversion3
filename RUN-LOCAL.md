# Run Morrow.AI locally (demo)

Prereqs
- Node.js 18+
- Optional (Firebase-free mode available): You can skip Firebase by running in local auth mode
- Optional: SendGrid API key if you want real emails; otherwise sandbox mode

Env setup (frontend)
Option A) Firebase auth (default)
- Create .env.local at repo root with your Firebase web config:
	- VITE_FIREBASE_API_KEY=
	- VITE_FIREBASE_AUTH_DOMAIN=
	- VITE_FIREBASE_PROJECT_ID=
	- VITE_FIREBASE_STORAGE_BUCKET=
	- VITE_FIREBASE_MESSAGING_SENDER_ID=
	- VITE_FIREBASE_APP_ID=

Option B) Firebase-free local auth
- In .env.local, set:
	- VITE_AUTH_PROVIDER=local
	(no other Firebase keys are required for local-only use)

Env setup (backend ai-server/.env)
- DEFAULT_AI_PROVIDER=ollama (or openai|gemini)
- OPENAI_API_KEY= (if using openai)
- GEMINI_API_KEY= (if using gemini)
- SENDGRID_API_KEY= (optional)
- SENDGRID_FROM_EMAIL= (optional)
- PUBLIC_BASE_URL=http://localhost:3000

To disable Firebase requirement on the server, set:
- AUTH_MODE=local
- MORROW_ADMIN_TOKEN=localdev  # any string you choose
- JWT_SECRET=change-me         # for optional local JWTs
- ADMIN_EMAILS=you@domain.com

Start servers
1) Backend
- npm --prefix ai-server install
- npm --prefix ai-server start

2) Frontend
- npm install
- npm run dev

Open http://localhost:3000
If using Firebase auth:
- Sign in with Google
- Admin-only sections require an email listed in ADMIN_EMAILS

If using Firebase-free local auth:
- You can call admin endpoints by sending header: X-Admin-Token: <MORROW_ADMIN_TOKEN>
- For the current UI, most screens work without auth; admin-only flows use the header above during development

Demo flow
- Go to Leads (admin only)
- Click "Send Outreach Emails" (will sandbox if SendGrid not configured)
- Click a lead’s "Run SEO Audit"
- Open Agent Feed to watch actions stream in

Troubleshooting
- 401/403 on /api:
	- Firebase mode: ensure you’re logged in with an ADMIN_EMAILS address
	- Local mode: include X-Admin-Token header that matches MORROW_ADMIN_TOKEN
- CORS: handled via Vite proxy to http://localhost:3001
- AI provider errors: set DEFAULT_AI_PROVIDER and API keys, or start Ollama on 11434
