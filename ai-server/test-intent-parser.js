// Simple test for intent parser
const { IntentParser } = require('./intent-parser');

const parser = new IntentParser();

console.log('Testing Intent Parser...\n');

// Test 1: SEO analysis
const test1 = parser.parse("Can you analyze the SEO for my plumbing business?");
console.log('Test 1 - SEO Analysis:');
console.log('  Intent:', test1.intent);
console.log('  Action:', test1.action);
console.log('  Confidence:', test1.confidence);
console.log('  Entities:', test1.parameters);
console.log('');

// Test 2: Social content
const test2 = parser.parse("I need help creating social media posts for Facebook");
console.log('Test 2 - Social Content:');
console.log('  Intent:', test2.intent);
console.log('  Action:', test2.action);
console.log('  Confidence:', test2.confidence);
console.log('  Platforms:', test2.parameters.platforms);
console.log('');

// Test 3: Audit with missing fields
const test3 = parser.parse("Run an audit");
console.log('Test 3 - Audit (minimal info):');
console.log('  Intent:', test3.intent);
console.log('  Action:', test3.action);
console.log('  Missing fields:', test3.missingFields);
console.log('  Clarification:', parser.getClarificationQuestion(test3));
console.log('');

// Test 4: Location extraction
const test4 = parser.parse("Who are my competitors in Denver?", { businessName: 'Joe\'s Pizza' });
console.log('Test 4 - Competitor Analysis:');
console.log('  Intent:', test4.intent);
console.log('  Location:', test4.parameters.location);
console.log('  Business:', test4.parameters.businessName);
console.log('  Confirmation:', parser.toConfirmation(test4));
console.log('');

// Test 5: Casual chat
const test5 = parser.parse("Hey, what can you do?");
console.log('Test 5 - Casual Chat:');
console.log('  Intent:', test5.intent);
console.log('  Action:', test5.action);
console.log('  Confidence:', test5.confidence);
console.log('');

console.log('✅ All tests completed!');
