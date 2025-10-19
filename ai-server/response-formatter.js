// Response Formatter - Makes AI responses sound human and natural
// Style guide for plain-English, conversational replies

/**
 * Response Formatter for Morrow.AI
 * Transforms raw AI outputs into friendly, human-sounding responses
 */
class ResponseFormatter {
  constructor(options = {}) {
    // Style guide configuration
    this.style = {
      maxSentenceLength: 20, // words
      maxParagraphLength: 3, // sentences
      useEmojis: options.useEmojis !== false,
      maxEmojis: 2,
      useBullets: true,
      bulletChar: '•',
      preferShortWords: true,
      toneMatching: true,
      ...options
    };

    // Few-shot dialogue examples that teach tone
    this.dialogueExamples = [
      {
        situation: "User asks for help",
        userInput: "Can you help me with SEO?",
        badResponse: "I can assist you with Search Engine Optimization analysis using advanced algorithms.",
        goodResponse: "Absolutely! 🚀 Let's boost your Google rankings. What's your business name?"
      },
      {
        situation: "Confirming action",
        userInput: "Run an audit on my website",
        badResponse: "Initiating comprehensive business audit sequence.",
        goodResponse: "On it! Starting your audit now. This'll take about 2 minutes."
      },
      {
        situation: "Small talk",
        userInput: "Thanks, that's helpful!",
        badResponse: "You are welcome. I am here to assist.",
        goodResponse: "Anytime! 😊 What else can I help with?"
      },
      {
        situation: "Uncertainty",
        userInput: "Something weird",
        badResponse: "I am unable to process your request. Please provide more information.",
        goodResponse: "Hmm, not quite sure what you need. Want to try: audit, SEO check, or social posts?"
      }
    ];

    // Tone indicators and response templates
    this.tones = {
      urgent: {
        emoji: '⚡',
        lead: ['On it', 'Right away', 'Got it'],
        speed: 'fast',
        style: 'direct'
      },
      excited: {
        emoji: '🔥',
        lead: ["Let's go", "Love it", "Awesome"],
        speed: 'energetic',
        style: 'enthusiastic'
      },
      casual: {
        emoji: '🙂',
        lead: ['Sure thing', 'No problem', 'Gotcha'],
        speed: 'relaxed',
        style: 'friendly'
      },
      formal: {
        emoji: '📌',
        lead: ['Understood', 'Will do', 'Certainly'],
        speed: 'measured',
        style: 'professional'
      },
      neutral: {
        emoji: '✨',
        lead: ['Got it', 'Okay', 'Alright'],
        speed: 'normal',
        style: 'balanced'
      }
    };

    // Quick confirmations
    this.confirmations = [
      "On it",
      "You got it",
      "Let's do this",
      "Working on it",
      "Sure thing",
      "Right away"
    ];

    // Next step suggestions
    this.nextSteps = {
      afterAudit: [
        "Review the findings",
        "Get a detailed report",
        "Start fixing issues"
      ],
      afterSEO: [
        "Check competitor rankings",
        "Create content plan",
        "Optimize key pages"
      ],
      afterSocial: [
        "Schedule the posts",
        "Create more content",
        "Review engagement strategy"
      ],
      general: [
        "Run a quick audit",
        "Check your SEO health",
        "Plan next month's content"
      ]
    };
  }

  /**
   * Format a response in human-friendly style
   * @param {object} data - Raw response data
   * @param {object} options - Formatting options
   * @returns {string} - Formatted human-style response
   */
  format(data, options = {}) {
    const tone = options.tone || 'neutral';
    const includeNextSteps = options.includeNextSteps !== false;
    const streaming = options.streaming || false;

    // Get tone configuration
    const toneConfig = this.tones[tone] || this.tones.neutral;
    
    // Build response parts
    const parts = [];

    // 1. Opening with emoji and lead
    if (this.style.useEmojis) {
      const lead = this._pickRandom(toneConfig.lead);
      parts.push(`${toneConfig.emoji} ${lead}.`);
    }

    // 2. Main content
    const mainContent = this._formatMainContent(data, tone);
    if (mainContent) {
      parts.push(mainContent);
    }

    // 3. Streaming status (if applicable)
    if (streaming && data.status) {
      const statusLine = this._formatStreamingStatus(data.status);
      if (statusLine) {
        parts.push(statusLine);
      }
    }

    // 4. Next steps
    if (includeNextSteps && !data.noSuggestions) {
      const steps = this._getRelevantNextSteps(data.action);
      if (steps.length > 0) {
        const stepsText = this._formatNextSteps(steps.slice(0, 3));
        parts.push(stepsText);
      }
    }

    // 5. Friendly sign-off
    if (!streaming) {
      parts.push(this._getSignOff(tone));
    }

    return parts.filter(p => p).join('\n\n');
  }

  /**
   * Format main content based on data type
   */
  _formatMainContent(data, tone) {
    if (data.analysis) {
      return this._simplify(data.analysis);
    }
    if (data.report) {
      return this._simplify(data.report);
    }
    if (data.content) {
      return this._simplify(data.content);
    }
    if (data.text) {
      return this._simplify(data.text);
    }
    if (data.response) {
      return this._simplify(data.response);
    }
    return null;
  }

  /**
   * Simplify technical language to plain English
   */
  _simplify(text) {
    if (!text) return '';

    // Simple replacements for common technical terms
    const replacements = {
      'utilize': 'use',
      'implement': 'set up',
      'commence': 'start',
      'terminate': 'end',
      'facilitate': 'help',
      'therefore': 'so',
      'however': 'but',
      'subsequently': 'then',
      'approximately': 'about',
      'additional': 'more'
    };

    let simplified = text;
    for (const [complex, simple] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    // Break long sentences
    simplified = this._breakLongSentences(simplified);

    return simplified;
  }

  /**
   * Break long sentences into shorter ones
   */
  _breakLongSentences(text) {
    // Split at punctuation and count words
    const sentences = text.split(/([.!?]+)/);
    const result = [];

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punct = sentences[i + 1] || '.';
      
      const words = sentence.trim().split(/\s+/);
      if (words.length > this.style.maxSentenceLength) {
        // Try to break at conjunctions
        const breakPoints = [' and ', ' but ', ' so ', ' because '];
        let broken = false;
        for (const bp of breakPoints) {
          if (sentence.includes(bp)) {
            const parts = sentence.split(bp);
            result.push(parts[0].trim() + '.');
            result.push(parts.slice(1).join(bp).trim() + punct);
            broken = true;
            break;
          }
        }
        if (!broken) {
          result.push(sentence.trim() + punct);
        }
      } else {
        result.push(sentence.trim() + punct);
      }
    }

    return result.join(' ').replace(/\s+/g, ' ');
  }

  /**
   * Format streaming status updates
   */
  _formatStreamingStatus(status) {
    if (typeof status === 'string') {
      return status;
    }
    
    if (status.scanning) {
      return `Scanning… ${status.found || 0} found.`;
    }
    if (status.analyzing) {
      return `Analyzing… ${Math.round(status.progress || 0)}% complete.`;
    }
    if (status.generating) {
      return `Creating content… almost done.`;
    }
    
    return null;
  }

  /**
   * Get relevant next steps based on action
   */
  _getRelevantNextSteps(action) {
    const actionMap = {
      'startAudit': 'afterAudit',
      'performSEOAnalysis': 'afterSEO',
      'generateSocialContent': 'afterSocial'
    };

    const category = actionMap[action] || 'general';
    return this.nextSteps[category] || this.nextSteps.general;
  }

  /**
   * Format next steps as a bulleted list
   */
  _formatNextSteps(steps) {
    const header = "What's next?";
    const bullets = steps.map(s => `${this.style.bulletChar} ${s}`).join('\n');
    return `${header}\n${bullets}`;
  }

  /**
   * Get appropriate sign-off
   */
  _getSignOff(tone) {
    const signOffs = {
      urgent: "Anything else urgent?",
      excited: "What should we tackle next?",
      casual: "Need anything else?",
      formal: "How else may I assist?",
      neutral: "What can I help with next?"
    };

    return signOffs[tone] || signOffs.neutral;
  }

  /**
   * Pick random item from array
   */
  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Format confirmation message
   */
  formatConfirmation(action, params) {
    const confirmation = this._pickRandom(this.confirmations);
    const details = this._formatActionDetails(action, params);
    return `${confirmation}! ${details}`;
  }

  /**
   * Format action details in plain English
   */
  _formatActionDetails(action, params) {
    const templates = {
      startAudit: (p) => `Running audit${p.businessName ? ` for ${p.businessName}` : ''}`,
      performSEOAnalysis: (p) => `Checking SEO${p.businessName ? ` for ${p.businessName}` : ''}`,
      generateSocialContent: (p) => `Creating ${p.platform || 'social media'} post${p.topic ? ` about ${p.topic}` : ''}`,
      analyzeCompetitors: (p) => `Looking at competitors${p.location ? ` in ${p.location}` : ''}`,
      createContentCalendar: (p) => `Building a ${p.timeframe || '30'}-day content plan`
    };

    const template = templates[action];
    return template ? template(params) : 'Working on your request';
  }

  /**
   * Format error message in friendly way
   */
  formatError(error, tone = 'casual') {
    const friendly = {
      'timeout': "Hmm, that's taking too long. Can you try again?",
      'network': "Lost connection for a sec. Mind trying again?",
      'rate_limit': "Whoa, too many requests. Let's take a quick breather.",
      'unknown': "Something went sideways. Want to try that again?"
    };

    const errorType = this._detectErrorType(error);
    return friendly[errorType] || friendly.unknown;
  }

  /**
   * Detect error type from error message
   */
  _detectErrorType(error) {
    const msg = (error.message || String(error)).toLowerCase();
    if (msg.includes('timeout')) return 'timeout';
    if (msg.includes('network') || msg.includes('connection')) return 'network';
    if (msg.includes('rate') || msg.includes('limit')) return 'rate_limit';
    return 'unknown';
  }
}

module.exports = { ResponseFormatter };
