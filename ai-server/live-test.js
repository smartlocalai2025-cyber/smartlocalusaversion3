// Live brain mode test
const { MorrowAI } = require('./morrow');

async function liveTest() {
  const morrow = new MorrowAI();
  
  console.log('🧠 BRAIN MODE LIVE TEST');
  console.log('=' .repeat(50));
  console.log('\nPrompt: "Search the knowledge base for information about local SEO"\n');
  
  try {
    const result = await morrow.brain({
      prompt: 'Search the knowledge base for information about local SEO and give me a brief summary of what you find.',
      provider: 'openai',
      model: 'gpt-4o-mini'
    });
    
    console.log('✅ SUCCESS!\n');
    console.log('=' .repeat(50));
    console.log('FINAL ANSWER:');
    console.log('=' .repeat(50));
    console.log(result.final_text);
    console.log('\n' + '=' .repeat(50));
    console.log('TOOL EXECUTION TRACE:');
    console.log('=' .repeat(50));
    
    result.tool_trace.forEach((t, i) => {
      console.log(`\nStep ${t.step}: ${t.tool}`);
      console.log(`  Status: ${t.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Input:`, JSON.stringify(t.input, null, 2));
      if (t.success && t.output) {
        const out = JSON.stringify(t.output, null, 2);
        console.log(`  Output: ${out.length > 200 ? out.substring(0, 200) + '...' : out}`);
      }
      if (t.error) {
        console.log(`  Error: ${t.error}`);
      }
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('STATS:');
    console.log('=' .repeat(50));
    console.log(`Steps used: ${result.steps_used}`);
    console.log(`Duration: ${result.duration_ms}ms`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);
    console.log(`Conversation ID: ${result.conversationId}`);
    console.log('\n✨ Brain mode is working perfectly!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

liveTest();
