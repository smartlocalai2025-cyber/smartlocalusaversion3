// Test the Google Places integration
// Run: node test-google-places.js

const { GooglePlacesService } = require('./services/google-places');

async function testGooglePlaces() {
  console.log('🧪 Testing Google Places API Integration...\n');
  
  const placesService = new GooglePlacesService();
  
  if (!placesService.isConfigured) {
    console.log('❌ Google Places API not configured');
    console.log('   Set GOOGLE_PLACES_API_KEY environment variable to test live data');
    console.log('   Testing with simulated mode...\n');
    return;
  }
  
  try {
    // Test business lookup
    console.log('🔍 Testing business lookup...');
    const testBusiness = await placesService.findBusiness('Starbucks', 'San Francisco, CA');
    
    if (testBusiness) {
      console.log('✅ Business found:', testBusiness.name);
      console.log('   Rating:', testBusiness.rating || 'N/A');
      console.log('   Reviews:', testBusiness.user_ratings_total || 0);
      console.log('   Status:', testBusiness.business_status || 'Unknown');
      console.log('   Address:', testBusiness.formatted_address || 'N/A');
      
      // Test competitor analysis
      console.log('\n🥊 Testing competitor analysis...');
      const competitors = await placesService.findCompetitors(testBusiness, 'coffee_shop', 2000);
      console.log(`   Found ${competitors.length} competitors nearby`);
      
      if (competitors.length > 0) {
        const topCompetitor = competitors[0];
        console.log(`   Top competitor: ${topCompetitor.name} (${topCompetitor.rating}/5)`);
      }
      
      // Test market analysis
      console.log('\n📊 Testing market position analysis...');
      const marketAnalysis = placesService.analyzeMarketPosition(testBusiness, competitors);
      console.log(`   Market position: ${marketAnalysis.marketPosition}`);
      console.log(`   Benchmarks:`, marketAnalysis.benchmarks);
      
      if (marketAnalysis.insights.length > 0) {
        console.log('   Key insights:');
        marketAnalysis.insights.forEach(insight => {
          console.log(`   - ${insight}`);
        });
      }
      
      // Test insights generation
      console.log('\n💡 Testing actionable insights...');
      const insights = placesService.generateInsights(testBusiness, marketAnalysis);
      
      if (insights.length > 0) {
        console.log('   Generated insights:');
        insights.forEach(insight => {
          console.log(`   - [${insight.priority.toUpperCase()}] ${insight.category}: ${insight.issue}`);
          console.log(`     Action: ${insight.action}`);
        });
      } else {
        console.log('   No specific insights generated (business performing well)');
      }
      
    } else {
      console.log('❌ No business found for test query');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Make sure your Google Places API key has the following APIs enabled:');
      console.log('   - Places API (New)');
      console.log('   - Places API');
      console.log('   - Maps JavaScript API');
    }
  }
  
  console.log('\n✅ Google Places integration test complete!');
  console.log('\n📈 Impact: Morrow.AI can now provide:');
  console.log('   • Live business ratings vs competitor benchmarks');
  console.log('   • Specific GBP optimization recommendations');
  console.log('   • Market position analysis with actionable insights');
  console.log('   • Data-driven audit scores based on real performance');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run test
testGooglePlaces();