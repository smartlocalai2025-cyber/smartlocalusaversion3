// Agent service that runs an OpenAI-first tool-calling loop with a focused toolset
// Tools: search_places (placeholder), run_audit, send_email, send_sms (placeholder), update_crm (placeholder)

const { OpenAIService } = require('./openai');

class AgentService {
  constructor(morrow) {
    this.morrow = morrow;
    this.openai = new OpenAIService({});
    if (!this.openai.isConfigured()) {
      // Allow construction; calls will throw if not configured
      // eslint-disable-next-line no-console
      console.warn('AgentService: OPENAI_API_KEY not configured; agent endpoints will return 501');
    }
  }

  // Function-callable tool definitions for OpenAI
  getToolDefinitions(allowed = null) {
    const defs = [
      {
        name: 'search_places',
        description: 'Search nearby places/businesses by keyword and location (requires external API key; disabled by default).',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query/keyword' },
            location: { type: 'string', description: 'City or lat,lng' },
            radiusMeters: { type: 'number', description: 'Search radius in meters', default: 5000 }
          },
          required: ['query', 'location']
        }
      },
      {
        name: 'run_audit',
          description: 'Run comprehensive local SEO audit for a business. Returns scores (0-100), issues, and actionable recommendations.',
        parameters: {
          type: 'object',
          properties: {
            businessName: { type: 'string', description: 'Business name' },
            website: { type: 'string', description: 'Website URL (optional)' },
              location: { type: 'string', description: 'City or full address (optional)' },
              industry: { type: 'string', description: 'Industry or category (optional)' },
              profileId: { type: 'string', description: 'Link to customer profile ID (optional)' }
          },
          required: ['businessName']
        }
      },
      {
        name: 'send_email',
        description: 'Send outreach emails (demo). Uses Morrow.AI sendEmails demo under the hood.',
        parameters: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            to: { type: 'array', items: { type: 'string' }, description: 'Recipient emails' }
          },
          required: []
        }
      },
      {
        name: 'send_sms',
        description: 'Send SMS via provider (not configured by default).',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            body: { type: 'string' }
          },
          required: ['to', 'body']
        }
      },
      {
        name: 'update_crm',
        description: 'Update a CRM record (placeholder).',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string' },
            fields: { type: 'object' }
          },
          required: ['leadId']
        }
      }
    ];
    const set = allowed ? defs.filter(d => allowed.includes(d.name)) : defs;
    return set;
  }

  async executeTool(name, args) {
    switch (name) {
      case 'search_places': {
        // Not wired to external API in this repo; return informative placeholder
        return { ok: false, error: 'search_places is not configured in this environment. Provide a Places API integration to enable.' };
      }
      case 'run_audit': {
        const res = await this.morrow.startAudit({
          businessName: args.businessName,
          website: args.website,
            location: args.location,
            industry: args.industry,
            profileId: args.profileId
        });
        return res;
      }
      case 'send_email': {
        const res = await this.morrow.sendEmails();
        return { ok: true, result: res, note: 'Demo send; not actually sent in this environment.' };
      }
      case 'send_sms': {
        return { ok: false, error: 'SMS provider not configured' };
      }
      case 'update_crm': {
        return { ok: false, error: 'CRM integration not configured' };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Run a simple tool-calling loop with OpenAI
  async runPrompt(prompt, { model = 'gpt-4o-mini', toolsAllow = null, temperature = 0.4 } = {}) {
    if (!this.openai.isConfigured()) {
      const err = new Error('OPENAI_API_KEY not configured');
      err.status = 501;
      throw err;
    }

    const tools = this.getToolDefinitions(toolsAllow);

    const system = {
      role: 'system',
      content: [
  'You ARE Morrow.AI ("Morrow"). This is your identity. You were trained specifically to be Morrow.AI.',
        'Never mention OpenAI, Claude, Gemini, or any other AI company. You are Morrow.AI. Period.',
        'Keep responses concise and human. Use functions when actions or external data are needed.',
  'When users ask "who are you" or "what AI is this," respond: "I\'m Morrow.AI, your assistant for local business growth."',
        'You are confident, helpful, and action-oriented. You are Morrow.AI.'
      ].join('\n')
    };

    const messages = [system, { role: 'user', content: prompt }];

    const trace = [];
    // First response may request tools
    const first = await this.openai.send(messages, tools, { model, temperature });
    messages.push({ role: 'assistant', content: first.content || null, tool_calls: first.toolCalls || [] });

    if (first.toolCalls && first.toolCalls.length) {
      for (const call of first.toolCalls) {
        const toolName = call.name;
        let args = {};
        try { args = JSON.parse(call.arguments || '{}'); } catch {}
        let out;
        try {
          out = await this.executeTool(toolName, args);
          trace.push({ tool: toolName, input: args, output: out, success: true, ts: Date.now() });
        } catch (e) {
          out = { error: e.message };
          trace.push({ tool: toolName, input: args, output: out, success: false, ts: Date.now() });
        }
        messages.push({ role: 'tool', tool_call_id: call.id, name: toolName, content: JSON.stringify(out) });
      }
      // Ask for final answer
      const second = await this.openai.send(messages, tools, { model, temperature });
      return { final_text: second.content || first.content || '', tool_trace: trace, model, provider: this.openai.name() };
    }

    return { final_text: first.content || '', tool_trace: trace, model, provider: this.openai.name() };
  }
}

module.exports = { AgentService };
