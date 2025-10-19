// Example: Human-Level Conversation Flow
// This demonstrates how Morrow.AI processes natural language and responds

const { IntentParser } = require('./intent-parser');
const { ResponseFormatter } = require('./response-formatter');

console.log('='.repeat(80));
console.log('Morrow.AI - Human-Level Conversation Example');
console.log('='.repeat(80));
console.log();

const parser = new IntentParser();
const formatter = new ResponseFormatter({ useEmojis: true });

// Simulate conversation scenarios
const conversations = [
  {
    title: 'New User - Exploring Capabilities',
    exchanges: [
      { user: "Hey, what can you do?", context: {} },
      { user: "Cool! Can you help me with SEO?", context: { businessName: "Joe's Pizza" } },
    ]
  },
  {
    title: 'Business Owner - Quick Audit',
    exchanges: [
      { user: "I need to run an audit on my website", context: { businessName: "Sunset Plumbing", website: "https://sunsetplumbing.example" } },
      { user: "Great! Can you also analyze my competitors?", context: { businessName: "Sunset Plumbing", location: "San Diego" } },
    ]
  },
  {
    title: 'Content Manager - Social Media',
    exchanges: [
      { user: "I need help creating social media posts for Instagram", context: { businessName: "Fitness First Gym" } },
      { user: "Can you make a 30-day content calendar too?", context: { businessName: "Fitness First Gym", industry: "fitness" } },
    ]
  },
  {
    title: 'Urgent Request - Fast Response',
    exchanges: [
      { user: "ASAP! I need an SEO report now!", context: { businessName: "Emergency Dental", website: "https://emergencydental.example" } },
    ]
  }
];

conversations.forEach((conversation, idx) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Conversation ${idx + 1}: ${conversation.title}`);
  console.log('─'.repeat(80));
  
  conversation.exchanges.forEach((exchange, eIdx) => {
    console.log(`\n[Exchange ${eIdx + 1}]`);
    console.log(`👤 User: "${exchange.user}"`);
    
    // Parse the intent
    const parsed = parser.parse(exchange.user, exchange.context);
    
    console.log(`\n🧠 Analysis:`);
    console.log(`   Intent: ${parsed.intent}`);
    console.log(`   Action: ${parsed.action}`);
    console.log(`   Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
    if (Object.keys(parsed.parameters).length > 0) {
      console.log(`   Parameters:`, JSON.stringify(parsed.parameters, null, 2).split('\n').map((l, i) => i === 0 ? l : '              ' + l).join('\n'));
    }
    
    // Check for missing fields
    if (parsed.missingFields && parsed.missingFields.length > 0) {
      const clarification = parser.getClarificationQuestion(parsed);
      const response = formatter.format({
        response: clarification,
        noSuggestions: true
      }, { tone: 'casual', includeNextSteps: false });
      
      console.log(`\n🤖 Morrow (needs info):\n${response}`);
    } else {
      // Generate confirmation
      const confirmation = parser.toConfirmation(parsed);
      
      // Detect tone from user input
      const tone = detectTone(exchange.user);
      
      // Format a mock response
      const mockResult = generateMockResult(parsed.action, parsed.parameters);
      const response = formatter.format(mockResult, { tone, includeNextSteps: true });
      
      console.log(`\n🤖 Morrow (${tone} tone):`);
      console.log(response);
    }
  });
});

console.log(`\n${'='.repeat(80)}`);
console.log('Example Complete!');
console.log('='.repeat(80));

// Helper functions
function detectTone(text) {
  const t = text.toLowerCase();
  if (/asap|urgent|now|immediately/i.test(text) || (text.match(/!/g) || []).length >= 2) {
    return 'urgent';
  }
  if (/cool|great|awesome|love/i.test(t)) {
    return 'excited';
  }
  if (/hey|hi|thanks/i.test(t)) {
    return 'casual';
  }
  return 'neutral';
}

function generateMockResult(action, params) {
  const results = {
    explainCapabilities: {
      response: `I can help you with:\n• SEO Analysis\n• Social Content\n• Business Audits\n• Competitor Analysis\n• Content Calendar\n• Reports`
    },
    performSEOAnalysis: {
      analysis: `SEO Analysis for ${params.businessName || 'your business'}:\n• GBP optimization: Good\n• On-page SEO: Needs improvement\n• Local citations: 15 found\n• Reviews: 4.2 stars (32 reviews)`,
      action: 'performSEOAnalysis'
    },
    startAudit: {
      report: `Started comprehensive audit for ${params.businessName || 'your business'}. This includes:\n• Local SEO health check\n• Website performance\n• Citation consistency\n• Review analysis`,
      action: 'startAudit'
    },
    analyzeCompetitors: {
      analysis: `Competitor analysis for ${params.businessName || 'your business'} in ${params.location || 'your area'}:\n• Found 8 direct competitors\n• Top 3: CompanyA (4.5★), CompanyB (4.3★), CompanyC (4.1★)\n• Your advantage: faster response time\n• Gap to fill: more reviews needed`,
      action: 'analyzeCompetitors'
    },
    generateSocialContent: {
      content: `Social media post for ${params.businessName || 'your business'}:\n"Transform your fitness journey today! 💪 Join our community and see real results. Limited spots available this month. #FitnessGoals #HealthyLiving"`,
      action: 'generateSocialContent'
    },
    createContentCalendar: {
      response: `Created 30-day content calendar for ${params.businessName || 'your business'}:\n• Week 1: Educational posts (workout tips, nutrition)\n• Week 2: Success stories & testimonials\n• Week 3: Promotional offers & challenges\n• Week 4: Community engagement & events`,
      action: 'createContentCalendar'
    }
  };
  
  return results[action] || { response: 'Working on it!', action };
}
