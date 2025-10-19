# Brain Mode - Quick Start

## What we built

OpenAI (or any provider) now acts as MorrowAI's "brain" - deciding which tools to run autonomously while MorrowAI provides safe execution with guardrails.

## Architecture

```
User prompt → OpenAI decides → MorrowAI validates & executes tools → OpenAI sees results → OpenAI iterates or gives final answer
```

### Key Components

1. **Provider Adapter** (`ai-server/providers/`)
   - Interface: `adapter.js` - contract for all providers
   - OpenAI implementation: `openai.js` - function calling via OpenAI API

2. **Tool Registry** (`ai-server/tools/index.js`)
   - Safe tools with JSON schemas and handlers
   - Tools available:
     - `search_knowledge`: Query knowledge base
     - `website_intel`: Fetch & analyze websites (SSRF-protected)
     - `leads_list`: Get leads from system
     - `audit_start`: Start business audit
     - `report_generate`: Generate audit report

3. **Brain Loop** (`ai-server/morrow.js` - `brain()` method)
   - Orchestrates the tool-calling loop
   - Guardrails:
     - Max 4 steps (configurable)
     - Max 20s timeout (configurable)
     - Tool allowlist
     - Input validation against JSON schemas

4. **API Endpoint** (`/api/ai/brain`)
   - POST endpoint exposed in `server.js`
   - Frontend method in `ai-service.ts`

## Setup

### 1. Add OpenAI API key

Create or update `.env.local` in the root directory:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

Or for production (Cloud Run/App Hosting), set it in your environment variables.

### 2. Test locally

```bash
# Start the AI server
cd ai-server
OPENAI_API_KEY=sk-proj-your-key-here node server.js
```

In another terminal:

```bash
# Test via curl
curl -X POST http://localhost:8080/api/ai/brain \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Search the knowledge base for information about SEO",
    "provider": "openai",
    "model": "gpt-4o-mini"
  }'
```

### 3. Use from frontend

```typescript
import { localAI } from './ai-service';

const result = await localAI.brain(
  'Analyze https://example.com and tell me about their SEO',
  undefined,      // conversationId
  'openai',       // provider
  'gpt-4o-mini'   // model
);

console.log(result.final_text);    // Final answer
console.log(result.tool_trace);    // Tools called
console.log(result.steps_used);    // Number of steps
```

## Example Prompts

**Simple knowledge search:**
```
"What do we know about local SEO best practices?"
```

**Multi-step workflow:**
```
"Find all leads in the database, then start an audit for the first one"
```

**Website analysis:**
```
"Fetch https://example.com and create an SEO analysis report"
```

**Complex orchestration:**
```
"Search the knowledge base for competitor analysis templates, then analyze https://competitor.com and generate a report"
```

## Safety Features

✓ **Tool allowlist** - Restrict which tools the LLM can call
✓ **Input validation** - All arguments validated against JSON schemas
✓ **SSRF protection** - Website fetching blocked for localhost/private IPs
✓ **Timeouts** - Max execution time prevents runaway loops
✓ **Step limits** - Max tool calls prevents infinite loops
✓ **Error handling** - Failed tools return errors to the LLM gracefully

## Response Format

```json
{
  "final_text": "Here's what I found...",
  "tool_trace": [
    {
      "step": 1,
      "tool": "search_knowledge",
      "input": { "query": "SEO" },
      "output": { "results": [...] },
      "success": true,
      "timestamp": 1729382400000
    }
  ],
  "steps_used": 2,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "conversationId": "brain_1729382400000",
  "duration_ms": 3456,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

## Next Steps

### Add more tools

Edit `ai-server/tools/index.js` and add to the `_buildTools()` method:

```javascript
your_tool_name: {
  name: 'your_tool_name',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '...' }
    },
    required: ['param1']
  },
  handler: async (args, context) => {
    // Your implementation
    return { result: 'data' };
  }
}
```

### Add other providers

Create adapters for Claude, Gemini, or Ollama:

1. Create `ai-server/providers/claude.js` (or gemini/ollama)
2. Implement the `ProviderAdapter` interface
3. Update the provider selection in `morrow.js` `brain()` method

### Tune guardrails

Adjust limits when calling brain:

```typescript
const result = await localAI.brain(
  prompt,
  conversationId,
  'openai',
  'gpt-4o-mini',
  ['search_knowledge', 'website_intel'], // toolsAllow
  { maxSteps: 6, maxTimeMs: 30000 }      // limits
);
```

## Troubleshooting

**"Provider openai not configured: missing API key"**
→ Set `OPENAI_API_KEY` in your environment or `.env.local`

**"Tool execution failed"**
→ Check the `tool_trace` in the response for detailed error messages

**Timeout errors**
→ Increase `limits.maxTimeMs` or optimize slow tools

**"Unknown tool: xyz"**
→ The LLM tried to call a tool that doesn't exist; add it to the registry or adjust the system prompt

## Cost Estimates

Brain mode uses function calling, which costs:
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical brain session with 2-3 tool calls: $0.001 - $0.005
- Knowledge base searches and simple queries: < $0.001

Monitor costs via the `tool_trace` and response usage stats.
