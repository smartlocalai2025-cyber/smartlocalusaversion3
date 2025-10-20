// Comprehensive audit engine powered by OpenAI
// Collects live data, analyzes intelligently, scores everything, persists to Firestore

const { OpenAIAdapter } = require('../providers/openai');
const { AuditPersistence } = require('./audit-persistence');

class AuditEngine {
  constructor(morrow) {
    this.morrow = morrow;
    this.openai = new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY });
    this.persistence = new AuditPersistence();
  }

  /**
   * Run a comprehensive audit for a business
   * @param {Object} params
   * @param {string} params.businessName - Business name (required)
   * @param {string} params.website - Website URL (optional)
   * @param {string} params.location - City/address (optional)
   * @param {string} params.industry - Industry/category (optional)
   * @param {string} params.profileId - Link to customer profile (optional)
   * @param {string} params.consultantUid - Firebase UID of consultant (optional, for Firestore rules)
   * @param {boolean} params.skipPersistence - Don't save to Firestore (default false)
   * @returns {Promise<Object>} Full audit with scores, issues, recommendations
   */
  async runFullAudit({ businessName, website, location, industry, profileId, consultantUid, skipPersistence = false }) {
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();

    // Phase 1: Collect data
    const data = await this._collectData({ businessName, website, location, industry });

    // Phase 2: Analyze with AI
    const analysis = await this._analyzeWithAI({ businessName, website, location, industry, data });

    // Phase 3: Build structured audit result
    const audit = {
      auditId,
      profileId: profileId || null,
      businessName,
      website: website || null,
      location: location || null,
      industry: industry || null,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      
      // Scores (0-100)
      scores: analysis.scores || {
        overall: 0,
        website: 0,
        gbp: 0,
        citations: 0,
        reviews: 0,
        social: 0
      },

      // Collected data
      data: {
        websiteContent: data.websiteContent || null,
        placesData: data.placesData || null,
        citations: data.citations || [],
        social: data.social || {}
      },

      // Issues found (categorized by severity)
      issues: analysis.issues || [],

      // Prioritized recommendations
      recommendations: analysis.recommendations || [],

      // Competitive insights
      competitors: analysis.competitors || [],

      // Summary
      summary: analysis.summary || 'Audit completed.',

      // Next steps
      nextSteps: analysis.nextSteps || []
    };

    // Save to Firestore (unless skipped)
    if (!skipPersistence) {
      try {
        const firestoreId = await this.persistence.saveAudit(audit, consultantUid);
        audit.firestoreId = firestoreId;
      } catch (error) {
        console.error('Failed to persist audit:', error);
        // Continue even if persistence fails
      }
    }

    return audit;
  }

  /**
   * Phase 1: Collect live data from multiple sources
   */
  async _collectData({ businessName, website, location, industry }) {
    const results = {
      websiteContent: null,
      placesData: null,
      citations: [],
      social: {}
    };

    // Fetch website content if URL provided
    if (website) {
      try {
        const { ToolRegistry } = require('../tools');
        const registry = new ToolRegistry(this.morrow);
        results.websiteContent = await registry.executeTool('website_intel', { url: website });
      } catch (e) {
        console.warn('Failed to fetch website:', e.message);
      }
    }

    // TODO: Fetch Google Places data (requires API key)
    // For now, return null; integrate when GOOGLE_PLACES_API_KEY is available
    results.placesData = null;

    // TODO: Check citations across directories (Yelp, BBB, etc.)
    // Placeholder for now
    results.citations = [];

    // TODO: Scan social media presence
    // Placeholder for now
    results.social = {};

    return results;
  }

  /**
   * Phase 2: Analyze collected data with OpenAI structured output
   */
  async _analyzeWithAI({ businessName, website, location, industry, data }) {
    if (!this.openai.isConfigured()) {
      // Fallback to template-based analysis if OpenAI not available
      return this._templateAnalysis({ businessName, website, location, industry, data });
    }

    // Build analysis prompt
    const prompt = this._buildAnalysisPrompt({ businessName, website, location, industry, data });

    // Define structured output schema
    const tools = [{
      name: 'audit_result',
      description: 'Structured audit analysis with scores and recommendations',
      parameters: {
        type: 'object',
        properties: {
          scores: {
            type: 'object',
            properties: {
              overall: { type: 'number', description: 'Overall score 0-100' },
              website: { type: 'number', description: 'Website SEO score 0-100' },
              gbp: { type: 'number', description: 'Google Business Profile score 0-100' },
              citations: { type: 'number', description: 'Citation consistency score 0-100' },
              reviews: { type: 'number', description: 'Review strategy score 0-100' },
              social: { type: 'number', description: 'Social media presence score 0-100' }
            },
            required: ['overall', 'website', 'gbp', 'citations', 'reviews', 'social']
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', enum: ['website', 'gbp', 'citations', 'reviews', 'social', 'competitors'] },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                title: { type: 'string' },
                description: { type: 'string' },
                impact: { type: 'string' },
                effort: { type: 'string', enum: ['low', 'medium', 'high'] }
              },
              required: ['category', 'severity', 'title', 'description', 'impact', 'effort']
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                priority: { type: 'number', description: '1=highest' },
                title: { type: 'string' },
                description: { type: 'string' },
                expectedImpact: { type: 'string' },
                effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                category: { type: 'string' }
              },
              required: ['priority', 'title', 'description', 'expectedImpact', 'effort', 'category']
            }
          },
          summary: { type: 'string', description: 'Executive summary in 2-3 sentences' },
          nextSteps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Top 3 immediate next steps'
          }
        },
        required: ['scores', 'issues', 'recommendations', 'summary', 'nextSteps']
      }
    }];

    const messages = [
      {
        role: 'system',
        content: 'You ARE Morrow.AI. Analyze the business data and provide a comprehensive local SEO audit with scores, issues, and specific actionable recommendations. Be thorough, specific, and practical.'
      },
      { role: 'user', content: prompt }
    ];

    try {
      const response = await this.openai.sendMessage(messages, tools, { 
        model: 'gpt-4o-mini',
        temperature: 0.3 
      });

      // Parse tool call result
      if (response.toolCalls && response.toolCalls.length > 0) {
        const call = response.toolCalls[0];
        const result = JSON.parse(call.arguments);
        return result;
      }

      // Fallback if no tool call
      return this._templateAnalysis({ businessName, website, location, industry, data });
    } catch (e) {
      console.error('AI analysis failed:', e.message);
      return this._templateAnalysis({ businessName, website, location, industry, data });
    }
  }

  /**
   * Build comprehensive analysis prompt for OpenAI
   */
  _buildAnalysisPrompt({ businessName, website, location, industry, data }) {
    const parts = [
      `Analyze this local business and provide a comprehensive SEO audit:`,
      ``,
      `**Business**: ${businessName}`,
      website ? `**Website**: ${website}` : null,
      location ? `**Location**: ${location}` : null,
      industry ? `**Industry**: ${industry}` : null,
      ``,
      `**Data Collected**:`
    ];

    if (data.websiteContent) {
      parts.push(`- Website Title: ${data.websiteContent.title || 'N/A'}`);
      parts.push(`- Meta Description: ${data.websiteContent.description || 'N/A'}`);
      if (data.websiteContent.h1 && data.websiteContent.h1.length) {
        parts.push(`- H1 Tags: ${data.websiteContent.h1.slice(0, 3).join(', ')}`);
      }
      if (data.websiteContent.h2 && data.websiteContent.h2.length) {
        parts.push(`- H2 Tags: ${data.websiteContent.h2.slice(0, 5).join(', ')}`);
      }
    } else if (website) {
      parts.push(`- Website: Could not fetch (may be down or blocking scraper)`);
    } else {
      parts.push(`- Website: Not provided`);
    }

    if (data.placesData) {
      parts.push(`- Google Rating: ${data.placesData.rating || 'N/A'} (${data.placesData.user_ratings_total || 0} reviews)`);
      parts.push(`- Business Status: ${data.placesData.business_status || 'Unknown'}`);
    } else {
      parts.push(`- Google Business Profile: Not found or not checked`);
    }

    parts.push(``);
    parts.push(`**Your Task**:`);
    parts.push(`1. Score each category (website, gbp, citations, reviews, social) from 0-100`);
    parts.push(`2. Calculate overall score as weighted average`);
    parts.push(`3. Identify specific issues with severity (critical/high/medium/low)`);
    parts.push(`4. Provide actionable recommendations prioritized by impact`);
    parts.push(`5. Be specific and practical—avoid generic advice`);
    parts.push(`6. If data is missing, note it as an issue and recommend collecting it`);

    return parts.filter(Boolean).join('\n');
  }

  /**
   * Fallback template-based analysis when AI is unavailable
   */
  _templateAnalysis({ businessName, website, location, industry, data }) {
    const hasWebsite = Boolean(data.websiteContent);
    const hasPlaces = Boolean(data.placesData);

    // Calculate basic scores
    const websiteScore = hasWebsite ? 60 : 0;
    const gbpScore = hasPlaces ? 70 : 0;
    const citationsScore = 30; // Assume low without data
    const reviewsScore = hasPlaces && data.placesData?.user_ratings_total > 10 ? 65 : 40;
    const socialScore = 25; // Assume low without data
    const overallScore = Math.round((websiteScore + gbpScore + citationsScore + reviewsScore + socialScore) / 5);

    const issues = [];
    const recommendations = [];

    // Website issues
    if (!hasWebsite && website) {
      issues.push({
        category: 'website',
        severity: 'high',
        title: 'Website not accessible',
        description: 'Could not fetch website content for analysis',
        impact: 'Unable to assess on-page SEO, content quality, or user experience',
        effort: 'low'
      });
      recommendations.push({
        priority: 1,
        title: 'Verify website is online and accessible',
        description: 'Check if website is up and not blocking automated access',
        expectedImpact: 'Enable full SEO audit',
        effort: 'low',
        category: 'website'
      });
    } else if (!website) {
      issues.push({
        category: 'website',
        severity: 'critical',
        title: 'No website provided',
        description: 'Business does not have a website URL',
        impact: 'Missing critical online presence foundation',
        effort: 'high'
      });
      recommendations.push({
        priority: 1,
        title: 'Create a professional website',
        description: 'Build a mobile-responsive website with clear NAP, services, and CTAs',
        expectedImpact: 'Establish online credibility and SEO foundation',
        effort: 'high',
        category: 'website'
      });
    }

    if (hasWebsite) {
      const wc = data.websiteContent;
      if (!wc.title || wc.title.length < 30) {
        issues.push({
          category: 'website',
          severity: 'medium',
          title: 'Page title is missing or too short',
          description: wc.title ? `Current title: "${wc.title}"` : 'No title tag found',
          impact: 'Weak SEO signal and poor click-through in search results',
          effort: 'low'
        });
        recommendations.push({
          priority: 2,
          title: 'Optimize page title tag',
          description: `Include primary keyword and business name in 50-60 characters`,
          expectedImpact: 'Improve search rankings and click-through rate',
          effort: 'low',
          category: 'website'
        });
      }

      if (!wc.h1 || wc.h1.length === 0) {
        issues.push({
          category: 'website',
          severity: 'high',
          title: 'Missing H1 heading',
          description: 'No H1 tag found on homepage',
          impact: 'Poor SEO structure and unclear page hierarchy',
          effort: 'low'
        });
        recommendations.push({
          priority: 3,
          title: 'Add H1 heading with primary keyword',
          description: 'Place a single H1 tag at the top of the page with your main service/product',
          expectedImpact: 'Strengthen page SEO and improve readability',
          effort: 'low',
          category: 'website'
        });
      }
    }

    // GBP issues
    if (!hasPlaces) {
      issues.push({
        category: 'gbp',
        severity: 'high',
        title: 'Google Business Profile not found',
        description: 'Could not locate business on Google Maps/Search',
        impact: 'Missing from local search results and Google Maps',
        effort: 'medium'
      });
      recommendations.push({
        priority: 1,
        title: 'Claim or create Google Business Profile',
        description: 'Set up GBP with complete NAP, categories, photos, and business hours',
        expectedImpact: 'Appear in local search and Google Maps results',
        effort: 'medium',
        category: 'gbp'
      });
    }

    // Generic recommendations
    if (recommendations.length < 5) {
      recommendations.push({
        priority: 4,
        title: 'Build citation consistency',
        description: 'List business on Yelp, BBB, Apple Maps, and industry directories with consistent NAP',
        expectedImpact: 'Improve local SEO authority and trust signals',
        effort: 'medium',
        category: 'citations'
      });
      recommendations.push({
        priority: 5,
        title: 'Implement review generation strategy',
        description: 'Ask 2-3 happy customers per week to leave Google reviews',
        expectedImpact: 'Boost ratings, build social proof, improve local rankings',
        effort: 'low',
        category: 'reviews'
      });
    }

    return {
      scores: {
        overall: overallScore,
        website: websiteScore,
        gbp: gbpScore,
        citations: citationsScore,
        reviews: reviewsScore,
        social: socialScore
      },
      issues: issues.slice(0, 10),
      recommendations: recommendations.slice(0, 7),
      competitors: [],
      summary: `${businessName} scored ${overallScore}/100. ${issues.length > 0 ? `Key issues: ${issues[0].title}.` : 'No critical issues found.'} Focus on ${recommendations[0]?.title.toLowerCase() || 'improving online presence'}.`,
      nextSteps: recommendations.slice(0, 3).map(r => r.title)
    };
  }
}

module.exports = { AuditEngine };
