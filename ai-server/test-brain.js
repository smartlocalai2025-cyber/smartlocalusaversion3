// Quick test script for brain mode
// Run with: node test-brain.js

const { MorrowAI } = require('./morrow');

async function testBrain() {
  const morrow = new MorrowAI();
  
  console.log('Testing brain mode without API key (should fail gracefully)...\n');
  
  try {
    const result = await morrow.brain({
      prompt: 'Search the knowledge base for information about local SEO',
      provider: 'openai',
      model: 'gpt-4o-mini'
    });
    
    console.log('✓ Brain response received:');
    console.log('  Final text:', result.final_text.substring(0, 100) + '...');
    console.log('  Steps used:', result.steps_used);
    console.log('  Tools called:', result.tool_trace.length);
    console.log('  Provider:', result.provider);
    console.log('\n✓ Brain mode test PASSED');
  } catch (error) {
    if (error.message.includes('missing API key') || error.message.includes('not configured')) {
      console.log('✓ Expected error (no API key set):', error.message);
      console.log('\n✓ Brain mode code path is working correctly');
      console.log('  To test fully: Set OPENAI_API_KEY in your environment\n');
      process.exit(0);
    } else {
      console.error('✗ Unexpected error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

testBrain();
