# Host your SMARTLOCAL AI server at home

This guide shows how to run the backend (ai-server) on your home machine and point the web app at it—no Google Cloud needed.

## Overview
- Backend: Node.js Express server on your home PC (default port 8080)
- Exposure: Choose one
  1) Port forward on your router + Dynamic DNS (DuckDNS/No-IP)
  2) Cloudflare Tunnel (no port-forwarding, recommended)
  3) Tailscale + Funnel (works behind CGNAT)
- Frontend: Point the web UI to your server via `VITE_LOCAL_AI_URL`

## 1) Prepare your home server (Windows)
Prereqs:
- Windows 10/11, PowerShell
- Node.js 18+

Steps:
1. Clone the repo
2. Set environment for dev mode (no Firebase required):

   - Create `ai-server/.env` with:
     - `AUTH_MODE=local`
     - `MORROW_ADMIN_TOKEN=localdev` (choose your own)
     - `JWT_SECRET=change-me`
     - `ADMIN_EMAILS=you@example.com`

   - Optional AI keys (if using OpenAI/Gemini):
     - `OPENAI_API_KEY=...`
     - `GEMINI_API_KEY=...`

3. Install and start the backend:
   - PowerShell (from repo root):
     - `npm --prefix ai-server install`
     - `npm --prefix ai-server start`

Your backend should listen on `http://localhost:8080`.

## 2) Expose it to the internet
Pick one approach:

### Option A: Router port forward (simplest)
- Forward TCP port 8080 on your router to your PC's local IP (e.g., 192.168.1.50)
- Set up Dynamic DNS (DuckDNS/No-IP) to get a stable hostname (e.g., `mysite.duckdns.org`)
- Optional TLS: Use Caddy or Nginx reverse proxy to enable HTTPS (see below)

### Option B: Cloudflare Tunnel (no port forward) – recommended
- Create a free Cloudflare account and add your domain (or use a subdomain)
- Install `cloudflared` on your PC
- Run a tunnel that points your domain to `http://localhost:8080`
- Cloudflare will provide HTTPS and a stable public URL without router changes

### Option C: Tailscale + Funnel (works behind CGNAT)
- Install Tailscale, enable Funnel for your device/service
- Get a stable public URL (HTTPS provided by Tailscale)

## 3) Optional: Reverse proxy with HTTPS (Caddy)
If you use port forwarding (Option A), put Caddy in front of the app to get HTTPS automatically.

Example Caddyfile:
```
mydomain.example.com {
  encode gzip
  reverse_proxy 127.0.0.1:8080
}
```
- Save as `Caddyfile`
- Run `caddy run --config Caddyfile`

## 4) Point the frontend at your home server
You have two ways to use the UI:

### A) Local dev UI (Vite)
- In `.env.local` at repo root, set:
  - `VITE_LOCAL_AI_URL=http://mydomain.example.com` (or your tunnel URL)
  - `VITE_AUTH_PROVIDER=local` (to avoid Firebase during dev)

- Start the dev UI:
  - `npm install`
  - `npm run dev`
- The browser should call your home server on all `/api/*` requests.

### B) Static site hosted anywhere (GitHub Pages, etc.)
- Build the UI: `npm run build`
- Host the `dist/` directory via any static host
- Set `VITE_LOCAL_AI_URL` at build time to your public URL
- Ensure CORS: the backend already enables CORS for development. For production, restrict origins if needed.

## 5) Using admin endpoints in local mode
- In local mode (`AUTH_MODE=local`), the backend accepts `X-Admin-Token: <MORROW_ADMIN_TOKEN>`
- The frontend can add this automatically if you set `VITE_LOCAL_ADMIN_TOKEN` in `.env.local` or store `LOCAL_ADMIN_TOKEN` in `localStorage`

## 6) Firewall and reliability notes
- Allow inbound connections on port 8080 (or your proxy port) in Windows Defender Firewall
- Consider running the Node server with a process manager (PM2) to auto-restart on crashes
- For power outages/reboots, set your PC and server to auto-start (Task Scheduler + PM2)

## 7) Troubleshooting
- Can’t reach the server externally:
  - If port forwarding, verify your WAN IP, DDNS config, and router rules
  - If Cloudflare Tunnel, check `cloudflared` status/logs
- 401/403 on API:
  - In local mode, include `X-Admin-Token` header
  - In Firebase mode, you must sign in and send a Firebase ID token
- Mixed content errors:
  - If your site is HTTPS, the API must also be HTTPS (use Caddy, Cloudflare Tunnel, or Tailscale)

That’s it! If you want, I can generate a ready-to-run Caddyfile or a Cloudflare Tunnel config tailored to your domain. 