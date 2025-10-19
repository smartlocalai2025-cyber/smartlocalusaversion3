// Integration test - Full conversation flow with Morrow.AI
const { MorrowAI } = require('./morrow');

async function runIntegrationTest() {
  console.log('═'.repeat(80));
  console.log('Morrow.AI Integration Test - Human-Level Conversation');
  console.log('═'.repeat(80));
  console.log();

  const morrow = new MorrowAI();
  
  const tests = [
    {
      name: 'Natural Language → Intent → Action → Human Response',
      prompt: 'Can you analyze the SEO for my plumbing business in Denver?',
      context: { businessName: 'Rocky Mountain Plumbing' }
    },
    {
      name: 'Capabilities Question',
      prompt: 'What can you help me with?',
      context: {}
    },
    {
      name: 'Urgent Request',
      prompt: 'I need an audit ASAP!',
      context: { businessName: 'Emergency Services Co', website: 'https://emergency.example' }
    },
    {
      name: 'Casual Social Media',
      prompt: 'Hey, can you make some Instagram posts for my gym?',
      context: { businessName: 'Fitness Peak', topic: 'New Year fitness goals' }
    }
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Test ${i + 1}: ${test.name}`);
    console.log('─'.repeat(80));
    console.log(`\n👤 User Input: "${test.prompt}"`);
    if (Object.keys(test.context).length > 0) {
      console.log(`📋 Context:`, JSON.stringify(test.context));
    }
    
    try {
      const start = Date.now();
      const result = await morrow.assistant({
        prompt: test.prompt,
        context: test.context,
        conversationId: `test_${i}`
      });
      const duration = Date.now() - start;
      
      console.log(`\n🧠 Intent Analysis:`);
      console.log(`   Intent: ${result.intent || 'N/A'}`);
      console.log(`   Action: ${result.action || 'N/A'}`);
      console.log(`   Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'N/A'}`);
      console.log(`   Tone: ${result.tone}`);
      
      console.log(`\n🤖 Morrow's Response:`);
      console.log('┌' + '─'.repeat(78) + '┐');
      result.response.split('\n').forEach(line => {
        console.log('│ ' + line.padEnd(77) + '│');
      });
      console.log('└' + '─'.repeat(78) + '┘');
      
      console.log(`\n⏱️  Response Time: ${duration}ms`);
      console.log(`✅ Test Passed`);
      
    } catch (error) {
      console.log(`\n❌ Test Failed: ${error.message}`);
    }
  }
  
  // Display stats
  console.log(`\n${'═'.repeat(80)}`);
  console.log('System Stats');
  console.log('═'.repeat(80));
  const stats = morrow.getStats();
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Average Latency: ${stats.avgLatency}ms`);
  console.log(`Active Provider: ${stats.activeProvider}`);
  console.log(`Knowledge Base: ${stats.knowledgeCount} documents`);
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log('All Integration Tests Complete! ✅');
  console.log('═'.repeat(80));
}

runIntegrationTest().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
