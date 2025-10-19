# SmartLocal USA AI Assistant - Copilot Instructions

## Architecture Overview

**Frontend**: Vite + React + TypeScript (port 3000) with Firebase integration  
**Backend**: Express server (port 8080) fronted by MorrowAI orchestrator class  
**Deployment**: Firebase Hosting with Cloud Run rewrites (`/api/**` → backend service)  
**AI**: Multi-provider system (Claude default) with local/remote fallback capability

## Key Components

### AI Service Layer (`ai-service.ts`)
- **LocalAIService**: Singleton class handling all AI communication
- **Provider switching**: Runtime selection between claude/openai/gemini/ollama
- **Rate limiting**: Built-in 60 req/min with automatic retry logic
- **Authentication**: Firebase ID tokens in `Authorization` header
- **Request patterns**: POST to `/api/ai/*` and `/api/features/*` with standardized payload

### MorrowAI Orchestrator (`ai-server/morrow.js`)
- **Central brain**: Single class handling all AI features via tool-exec pattern
- **Memory system**: Conversation persistence with automatic knowledge base logging
- **Persona-driven**: Configurable tone/emoji system matching user energy
- **Knowledge loading**: Auto-loads `.md/.txt/.json` files from `knowledge/` directory

### Firebase Integration
- **Hosting rewrites**: `/api/**` routes to Cloud Run service in production
- **Security headers**: CSP, HSTS, X-Frame-Options configured in `firebase.json`
- **Authentication**: Google OAuth with admin email allowlist pattern

## Development Patterns

### Environment Configuration
```bash
# Frontend (.env.local) - VITE_ prefix exposes to browser
VITE_LOCAL_AI_URL=http://localhost:3001  # Empty in prod for relative calls
VITE_DEFAULT_AI_PROVIDER=claude
VITE_ADMIN_EMAIL=admin@example.com

# Backend - Never expose these
GEMINI_API_KEY=your_key_here
MORROW_ADMIN_TOKEN=secure_token
```

### AI Request Flow
1. Frontend calls `localAI.chat()` → POST `/api/ai/chat`
2. Headers include `X-Provider`, `X-Model`, `Authorization` (Firebase token)
3. MorrowAI orchestrator processes via `_simulateWork()` wrapper
4. Response includes provider metadata and conversation tracking

### Testing Strategy
- **Vitest** with jsdom environment
- **Mock fetch** for AI service integration tests
- **Timeout handling**: Tests use 100ms timeout vs 30s production
- **Setup file**: `src/__tests__/setup.ts` for global test configuration

## Common Workflows

### Starting Development
```bash
npm run dev:all          # Starts frontend (3000) + AI server (8080)
npm run dev              # Frontend only
npm run start:server     # AI server only
```

### Adding AI Features
1. Add endpoint in `ai-server/server.js` (e.g., `/api/features/new-feature`)
2. Implement method in `MorrowAI` class with `_simulateWork()` wrapper
3. Add frontend method in `LocalAIService` class
4. Update `features` array in MorrowAI constructor

### Firebase Deployment
```bash
npm run build           # Vite build to dist/
firebase deploy --only hosting
```

## Project-Specific Conventions

### Error Handling
- **AIServiceError**: Custom error class with `code` and `retryable` properties
- **Rate limiting**: User-facing messages with wait time calculations
- **Timeout strategy**: 30s default with AbortController cleanup

### State Management
- **localStorage**: Provider/model preferences persist across sessions
- **Memory system**: Conversation context limited to last 12 messages
- **Status callbacks**: Real-time stats updates via observer pattern

### Security Patterns
- **Admin guards**: `ADMIN_ENABLED` flag with token validation
- **CORS**: Explicit origin allowlist in production
- **Token verification**: Firebase ID token validation on sensitive endpoints

### Knowledge System
- **Auto-logging**: API calls logged as `call_*.json` in `knowledge/` directory
- **File watching**: Knowledge base reloads automatically on file changes
- **Search strategy**: Keyword matching across titles and content

## Critical Files to Understand

- `ai-service.ts` - All frontend AI communication
- `ai-server/morrow.js` - Core AI orchestration logic  
- `firebase.json` - Routing and security header configuration
- `vite.config.ts` - Dev proxy setup (`/api` → `localhost:8080`)
- `src/components/Dashboard.tsx` - Main UI patterns and state management