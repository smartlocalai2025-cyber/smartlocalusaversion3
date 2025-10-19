// Simple test for response formatter
const { ResponseFormatter } = require('./response-formatter');

const formatter = new ResponseFormatter({ useEmojis: true });

console.log('Testing Response Formatter...\n');

// Test 1: Format SEO analysis response
const test1 = formatter.format({
  analysis: 'SEO Analysis for Joe\'s Pizza: GBP is optimized, titles need work, internal linking could be improved',
  action: 'performSEOAnalysis'
}, { tone: 'neutral' });
console.log('Test 1 - SEO Analysis Response:');
console.log(test1);
console.log('\n---\n');

// Test 2: Format with urgent tone
const test2 = formatter.format({
  response: 'Starting your audit now',
  action: 'startAudit'
}, { tone: 'urgent' });
console.log('Test 2 - Urgent Tone:');
console.log(test2);
console.log('\n---\n');

// Test 3: Confirmation message
const test3 = formatter.formatConfirmation('startAudit', { businessName: 'Joe\'s Pizza' });
console.log('Test 3 - Confirmation:');
console.log(test3);
console.log('\n---\n');

// Test 4: Error formatting
const test4 = formatter.formatError(new Error('Request timeout'));
console.log('Test 4 - Error Message:');
console.log(test4);
console.log('\n---\n');

// Test 5: Streaming status
const test5 = formatter.format({
  response: 'Analyzing your website',
  status: { analyzing: true, progress: 45 },
  action: 'performSEOAnalysis'
}, { tone: 'excited', streaming: true });
console.log('Test 5 - Streaming Status:');
console.log(test5);
console.log('\n---\n');

console.log('✅ All tests completed!');
