// Tool Registry
// Safe, validated tools for the AI brain to call

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const net = require('net');

/**
 * Tool definitions with JSON schemas and handler functions
 * Each tool: { name, description, parameters, handler: async (args, context) => result }
 */

class ToolRegistry {
  constructor(morrowInstance) {
    this.morrow = morrowInstance;
    this.tools = this._buildTools();
  }

  _buildTools() {
    return {
      search_knowledge: {
        name: 'search_knowledge',
        description: 'Search the internal knowledge base for relevant information using keywords or topics',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query or topic to find in knowledge base'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default 3)',
              default: 3
            }
          },
          required: ['query']
        },
        handler: async (args) => {
          const query = args.query || '';
          const limit = args.limit || 3;
          const results = this.morrow._searchKnowledge(query, limit, 800);
          return {
            results,
            count: results.length,
            query
          };
        }
      },

      website_intel: {
        name: 'website_intel',
        description: 'Fetch and analyze website content (title, description, headings, text). Only works with public websites.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the website to analyze (must start with http:// or https://)'
            }
          },
          required: ['url']
        },
        handler: async (args) => {
          const url = args.url;
          if (!url || !/^https?:\/\//i.test(url)) {
            throw new Error('Valid URL required (http/https)');
          }

          // SSRF protection (same as in server.js)
          try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase();
            const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
            const isIp = net.isIP(host) !== 0;
            let isPrivate = false;
            if (isIp) {
              if (host.includes(':')) {
                isPrivate = host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd');
              } else {
                const parts = host.split('.').map(n => parseInt(n, 10));
                const [a, b] = parts;
                isPrivate = (
                  a === 10 ||
                  (a === 172 && b >= 16 && b <= 31) ||
                  (a === 192 && b === 168) ||
                  a === 127 ||
                  (a === 169 && b === 254) ||
                  a === 0
                );
              }
            }
            if (isLocalHost || isPrivate) {
              throw new Error('Blocked host: only public websites allowed');
            }
          } catch (e) {
            throw new Error(`Invalid or blocked URL: ${e.message}`);
          }

          // Fetch with timeout
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          try {
            const resp = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'MorrowAI/1.0 (+https://smartlocal.ai)',
                'Accept': 'text/html,application/xhtml+xml'
              }
            });
            clearTimeout(timeout);
            
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status}`);
            }
            
            const ct = (resp.headers.get && resp.headers.get('content-type')) || '';
            if (ct && !ct.includes('text/html')) {
              throw new Error(`Unsupported content-type: ${ct}`);
            }
            
            const html = await resp.text();
            const $ = cheerio.load(html);
            
            const title = $('title').first().text().trim();
            const description = $('meta[name="description"]').attr('content') || 
                              $('meta[property="og:description"]').attr('content') || '';
            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const h1 = $('h1').map((i, el) => $(el).text().trim()).get().slice(0, 5);
            const h2 = $('h2').map((i, el) => $(el).text().trim()).get().slice(0, 8);
            
            const textBlocks = [];
            $('p, li').each((i, el) => {
              const t = $(el).text().replace(/\s+/g, ' ').trim();
              if (t && t.length > 40 && t.length < 500) textBlocks.push(t);
            });
            
            return {
              url,
              title: ogTitle || title,
              description,
              h1,
              h2,
              contentSample: textBlocks.slice(0, 30)
            };
          } catch (e) {
            clearTimeout(timeout);
            throw new Error(`Failed to fetch website: ${e.message}`);
          }
        }
      },

      leads_list: {
        name: 'leads_list',
        description: 'Get a list of current leads/prospects from the system',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: async () => {
          const result = await this.morrow.listLeads();
          return result;
        }
      },

      audit_start: {
        name: 'audit_start',
        description: 'Start a business audit for a given business name and optional website',
        parameters: {
          type: 'object',
          properties: {
            businessName: {
              type: 'string',
              description: 'Name of the business to audit'
            },
            website: {
              type: 'string',
              description: 'Website URL of the business (optional)'
            },
            scope: {
              type: 'array',
              items: { type: 'string' },
              description: 'Audit scope areas (e.g., ["seo", "gbp", "citations"])',
              default: []
            }
          },
          required: ['businessName']
        },
        handler: async (args) => {
          const result = await this.morrow.startAudit({
            businessName: args.businessName,
            website: args.website,
            scope: args.scope || []
          });
          return result;
        }
      },

      report_generate: {
        name: 'report_generate',
        description: 'Generate a report for a completed audit',
        parameters: {
          type: 'object',
          properties: {
            auditId: {
              type: 'string',
              description: 'ID of the audit to generate report for'
            },
            format: {
              type: 'string',
              description: 'Report format (markdown, html, pdf)',
              default: 'markdown'
            }
          },
          required: ['auditId']
        },
        handler: async (args) => {
          const result = await this.morrow.generateReport({
            auditId: args.auditId,
            format: args.format || 'markdown'
          });
          return result;
        }
      }
    };
  }

  /**
   * Get tool definitions for the AI (without handlers)
   */
  getToolDefinitions(allowedTools = null) {
    const toolNames = allowedTools || Object.keys(this.tools);
    return toolNames
      .filter(name => this.tools[name])
      .map(name => {
        const tool = this.tools[name];
        return {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        };
      });
  }

  /**
   * Execute a tool by name with validated arguments
   */
  async executeTool(name, args, context = {}) {
    const tool = this.tools[name];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Basic validation: check required parameters
    const required = tool.parameters.required || [];
    for (const param of required) {
      if (args[param] === undefined) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    try {
      const result = await tool.handler(args, context);
      return result;
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * Check if a tool is allowed
   */
  isToolAllowed(name, allowedTools = null) {
    if (!allowedTools) return true;
    return allowedTools.includes(name);
  }
}

module.exports = { ToolRegistry };
