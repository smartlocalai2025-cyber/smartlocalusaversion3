// Intent Parser - Maps natural language to tool/action JSON
// Implements the NLU→tool JSON contract for Morrow.AI

/**
 * Intent Parser for Morrow.AI
 * Maps natural language inputs to structured tool calls
 */
class IntentParser {
  constructor() {
    // Few-shot examples that teach the system how to parse intents
    this.examples = [
      {
        input: "Can you analyze the SEO for my plumbing business?",
        intent: "seo_analysis",
        entities: { industry: "plumbing" },
        confidence: 0.95
      },
      {
        input: "I need help creating social media posts",
        intent: "social_content",
        entities: {},
        confidence: 0.90
      },
      {
        input: "Run an audit on my website",
        intent: "start_audit",
        entities: {},
        confidence: 0.92
      },
      {
        input: "Who are my competitors in Denver?",
        intent: "competitor_analysis",
        entities: { location: "Denver" },
        confidence: 0.88
      },
      {
        input: "Create a content calendar for next month",
        intent: "content_calendar",
        entities: { timeframe: "30" },
        confidence: 0.93
      },
      {
        input: "Hey, what can you do?",
        intent: "capabilities",
        entities: {},
        confidence: 0.85
      },
      {
        input: "Just chatting",
        intent: "chat",
        entities: {},
        confidence: 0.75
      }
    ];

    // Intent patterns with keywords and actions
    this.intentPatterns = [
      {
        intent: "seo_analysis",
        keywords: ["seo", "search", "ranking", "optimize", "google", "visibility"],
        action: "performSEOAnalysis",
        requiredFields: ["businessName"],
        optionalFields: ["website", "location", "industry"]
      },
      {
        intent: "social_content",
        keywords: ["social", "post", "content", "facebook", "instagram", "twitter", "linkedin"],
        action: "generateSocialContent",
        requiredFields: ["businessName", "topic"],
        optionalFields: ["platform", "tone", "includeImage"]
      },
      {
        intent: "start_audit",
        keywords: ["audit", "check", "review", "analyze", "assessment"],
        action: "startAudit",
        requiredFields: [],
        optionalFields: ["businessName", "website", "scope"]
      },
      {
        intent: "competitor_analysis",
        keywords: ["competitor", "competition", "rival", "compare"],
        action: "analyzeCompetitors",
        requiredFields: ["businessName", "location"],
        optionalFields: ["industry"]
      },
      {
        intent: "content_calendar",
        keywords: ["calendar", "schedule", "plan", "content plan"],
        action: "createContentCalendar",
        requiredFields: ["businessName"],
        optionalFields: ["industry", "timeframe", "platforms"]
      },
      {
        intent: "generate_report",
        keywords: ["report", "summary", "document", "findings"],
        action: "generateReport",
        requiredFields: [],
        optionalFields: ["auditId", "format"]
      },
      {
        intent: "capabilities",
        keywords: ["help", "what can", "features", "capabilities", "do for me"],
        action: "explainCapabilities",
        requiredFields: [],
        optionalFields: []
      },
      {
        intent: "chat",
        keywords: ["hi", "hello", "hey", "thanks", "bye"],
        action: "chat",
        requiredFields: [],
        optionalFields: []
      }
    ];
  }

  /**
   * Parse natural language input into structured intent
   * @param {string} input - User's natural language input
   * @param {object} context - Optional context (businessName, etc.)
   * @returns {object} - Parsed intent with action and parameters
   */
  parse(input, context = {}) {
    const normalized = input.toLowerCase().trim();
    
    // Match against patterns
    let bestMatch = null;
    let bestScore = 0;

    for (const pattern of this.intentPatterns) {
      const score = this._scorePattern(normalized, pattern);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }

    // Default to chat if confidence is too low
    if (bestScore < 0.3) {
      bestMatch = this.intentPatterns.find(p => p.intent === 'chat');
    }

    // Extract entities from input
    const entities = this._extractEntities(normalized, context);
    
    // Build structured response
    return {
      intent: bestMatch.intent,
      action: bestMatch.action,
      confidence: Math.min(bestScore, 1.0),
      parameters: this._buildParameters(bestMatch, entities, context),
      missingFields: this._getMissingFields(bestMatch, entities, context),
      rawInput: input
    };
  }

  /**
   * Score a pattern against input text
   */
  _scorePattern(text, pattern) {
    let score = 0;
    let matchCount = 0;

    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        matchCount++;
        // Weight longer keywords higher and boost the score more
        score += (keyword.length / 10) + 1;
      }
    }

    // Boost score if we have multiple matches
    if (matchCount > 1) {
      score *= 1.5;
    }

    return score;
  }

  /**
   * Extract entities from text
   */
  _extractEntities(text, context) {
    const entities = { ...context };

    // Extract location patterns
    const locationMatch = text.match(/in ([a-z\s]+?)(?:\s|,|$)/i);
    if (locationMatch) {
      entities.location = locationMatch[1].trim();
    }

    // Extract business types/industries
    const industries = ['plumbing', 'restaurant', 'dentist', 'lawyer', 'bakery', 'gym', 'salon'];
    for (const industry of industries) {
      if (text.includes(industry)) {
        entities.industry = industry;
        break;
      }
    }

    // Extract timeframes
    const timeMatch = text.match(/(\d+)\s*(day|week|month)/i);
    if (timeMatch) {
      const unit = timeMatch[2].toLowerCase();
      const multiplier = unit === 'week' ? 7 : unit === 'month' ? 30 : 1;
      entities.timeframe = String(parseInt(timeMatch[1]) * multiplier);
    }

    // Extract platforms
    const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
    entities.platforms = platforms.filter(p => text.includes(p));

    return entities;
  }

  /**
   * Build parameters for the action
   */
  _buildParameters(pattern, entities, context) {
    const params = {};

    // Add all available fields
    [...pattern.requiredFields, ...pattern.optionalFields].forEach(field => {
      if (entities[field] !== undefined) {
        params[field] = entities[field];
      }
    });

    return params;
  }

  /**
   * Check for missing required fields
   */
  _getMissingFields(pattern, entities, context) {
    return pattern.requiredFields.filter(field => {
      return entities[field] === undefined && context[field] === undefined;
    });
  }

  /**
   * Generate a clarification question for missing fields
   */
  getClarificationQuestion(parsed) {
    if (!parsed.missingFields || parsed.missingFields.length === 0) {
      return null;
    }

    const field = parsed.missingFields[0];
    const questions = {
      businessName: "What's your business name?",
      website: "What's your website URL?",
      location: "What city are you in?",
      industry: "What industry are you in?",
      topic: "What topic should I focus on?"
    };

    return questions[field] || `I need to know: ${field}`;
  }

  /**
   * Convert parsed intent to a human-readable confirmation
   */
  toConfirmation(parsed) {
    const actionDescriptions = {
      performSEOAnalysis: "run an SEO analysis",
      generateSocialContent: "create social media content",
      startAudit: "start a business audit",
      analyzeCompetitors: "analyze your competitors",
      createContentCalendar: "build a content calendar",
      generateReport: "generate a report",
      chat: "chat"
    };

    const desc = actionDescriptions[parsed.action] || "help you";
    const params = Object.entries(parsed.parameters)
      .filter(([k, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    if (params) {
      return `I'll ${desc} (${params})`;
    }
    return `I'll ${desc}`;
  }
}

module.exports = { IntentParser };
