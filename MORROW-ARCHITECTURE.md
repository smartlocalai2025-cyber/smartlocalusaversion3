# Morrow.AI Architecture

## Core Identity

**Morrow.AI is powered by OpenAI.** This is not a chatbot wrapper—it's a trained identity. When you interact with Morrow.AI, you are interacting with an OpenAI model that has been explicitly trained (via system prompts and tool orchestration) to BE Morrow.AI.

### Provider Strategy

- **OpenAI**: The brain. All chat, assistant, brain, and agent endpoints route through OpenAI with the Morrow.AI identity.
- **Google Maps**: Location intelligence and place data.
- **Gemini** (optional): Helper for specialized tasks where Google's model excels (e.g., multimodal inputs, certain content generation).

**Claude and Ollama have been removed.** The system is streamlined: OpenAI is Morrow.AI.

## System Prompts

All OpenAI calls include a system message that establishes identity:

```
You ARE Morrow.AI ("Morrow")—the intelligent assistant for Morrow.AI. 
This is your identity. You were trained specifically to be Morrow.AI.

Never mention OpenAI, Claude, Gemini, or any other AI company. You are Morrow.AI. Period.

When users ask "who are you" or "what AI is this," respond: "I'm Morrow.AI, your assistant for local business growth."
```

This creates a seamless user experience: users interact with "Morrow.AI," not "an OpenAI-powered bot."

## Endpoints

All AI endpoints are unified:

- `/api/ai/chat` → Morrow.AI (OpenAI)
- `/api/ai/assistant` → Morrow.AI (OpenAI)
- `/api/ai/brain` → Morrow.AI (OpenAI with tool orchestration)
- `/api/agent/ask` → Morrow.AI Agent (OpenAI function calling)

## Tool Ecosystem

Morrow.AI has access to:

- **Knowledge base search** (vector + keyword)
- **Website intelligence** (fetch, parse, analyze)
- **Business audits** (local SEO, GBP, citations)
- **Lead management** (list, audit, outreach)
- **Report generation**
- **CRM updates** (placeholder)
- **Email/SMS** (demo/placeholders)

## Configuration

Set `OPENAI_API_KEY` in:
- Local dev: `ai-server/.env` or shell export
- Production: Cloud Run environment variables

Optional:
- `GEMINI_API_KEY` for helper tasks
- `VITE_GOOGLE_MAPS_API_KEY` for Maps UI

Default model: `gpt-4o-mini` (fast, cost-efficient, strong tool use)

## UI

The Dashboard shows:
- Provider selector: "openai (Morrow.AI brain)" or "gemini (helper)"
- Model input: defaults to `gpt-4o-mini`
- Three chat modes:
  - **Brain Mode**: Tool orchestration (search, audits, etc.)
  - **Assistant**: Guided chat without tools
  - **Agent** (optional): Advanced function calling

All modes speak as Morrow.AI.

## Philosophy

This architecture ensures:
1. **Single identity**: Users see "Morrow.AI," not "OpenAI" or "Claude."
2. **Simplicity**: One brain (OpenAI), not a rotating cast of providers.
3. **Extensibility**: Tool system allows Morrow.AI to grow capabilities without changing identity.
4. **Cost control**: gpt-4o-mini is ~15x cheaper than GPT-4 with strong performance.

Morrow.AI is your assistant. It's not a middleman—it IS the AI you trained for your platform.
