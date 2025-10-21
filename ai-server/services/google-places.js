// Google Places API Integration Service
// Provides live business intelligence for Morrow.AI audits

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.isConfigured = !!this.apiKey;
    
    if (!this.isConfigured) {
      console.warn('Google Places API not configured - set GOOGLE_PLACES_API_KEY environment variable');
    }
  }

  /**
   * Find a business by name and location
   * @param {string} businessName - Name of the business
   * @param {string} location - City, state or address
   * @returns {Promise<Object|null>} Place data or null if not found
   */
  async findBusiness(businessName, location) {
    if (!this.isConfigured) {
      console.warn('Google Places API not configured, returning null');
      return null;
    }

    try {
      // Step 1: Text search to find the business
      const searchQuery = `${businessName} ${location}`;
      const searchUrl = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        throw new Error(`Places API error: ${searchData.error_message || searchResponse.status}`);
      }
      
      if (!searchData.results || searchData.results.length === 0) {
        console.log(`No Google Places results found for: ${searchQuery}`);
        return null;
      }
      
      // Get the first (most relevant) result
      const place = searchData.results[0];
      const placeId = place.place_id;
      
      // Step 2: Get detailed information about the place
      const detailsUrl = `${this.baseUrl}/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,reviews,opening_hours,photos,types,price_level,business_status,geometry,vicinity&key=${this.apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (!detailsResponse.ok) {
        throw new Error(`Places Details API error: ${detailsData.error_message || detailsResponse.status}`);
      }
      
      return detailsData.result || null;
      
    } catch (error) {
      console.error('Google Places API error:', error.message);
      return null;
    }
  }

  /**
   * Find nearby competitors for a business
   * @param {Object} business - Business place data with geometry
   * @param {string} businessType - Business category/type
   * @param {number} radius - Search radius in meters (default 5000 = ~3 miles)
   * @returns {Promise<Array>} Array of competitor businesses
   */
  async findCompetitors(business, businessType = null, radius = 5000) {
    if (!this.isConfigured || !business?.geometry?.location) {
      return [];
    }

    try {
      const { lat, lng } = business.geometry.location;
      
      // Determine search type from business types or use provided type
      let searchType = businessType;
      if (!searchType && business.types && business.types.length > 0) {
        // Find the most specific business type (avoid generic ones)
        const genericTypes = ['establishment', 'point_of_interest', 'premise', 'store'];
        searchType = business.types.find(type => !genericTypes.includes(type)) || business.types[0];
      }
      
      // Nearby search for competitors
      const nearbyUrl = `${this.baseUrl}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${searchType || 'establishment'}&key=${this.apiKey}`;
      
      const response = await fetch(nearbyUrl);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Nearby Search API error: ${data.error_message || response.status}`);
      }
      
      // Filter out the original business and return competitors
      const competitors = (data.results || [])
        .filter(place => place.place_id !== business.place_id)
        .map(place => ({
          name: place.name,
          placeId: place.place_id,
          rating: place.rating || 0,
          userRatingsTotal: place.user_ratings_total || 0,
          priceLevel: place.price_level,
          businessStatus: place.business_status,
          types: place.types || [],
          vicinity: place.vicinity,
          photoReference: place.photos?.[0]?.photo_reference || null
        }))
        .slice(0, 10); // Limit to top 10 competitors
        
      return competitors;
      
    } catch (error) {
      console.error('Error finding competitors:', error.message);
      return [];
    }
  }

  /**
   * Analyze business performance compared to local market
   * @param {Object} business - Business place data
   * @param {Array} competitors - Array of competitor businesses
   * @returns {Object} Market analysis with benchmarks and insights
   */
  analyzeMarketPosition(business, competitors) {
    if (!business || !competitors || competitors.length === 0) {
      return {
        marketPosition: 'insufficient-data',
        insights: ['Not enough competitor data available for analysis'],
        benchmarks: {}
      };
    }

    // Calculate market benchmarks
    const competitorRatings = competitors.map(c => c.rating).filter(r => r > 0);
    const competitorReviewCounts = competitors.map(c => c.userRatingsTotal).filter(r => r > 0);
    
    const avgRating = competitorRatings.length > 0 ? 
      competitorRatings.reduce((a, b) => a + b, 0) / competitorRatings.length : 0;
    
    const avgReviewCount = competitorReviewCounts.length > 0 ? 
      competitorReviewCounts.reduce((a, b) => a + b, 0) / competitorReviewCounts.length : 0;
    
    const businessRating = business.rating || 0;
    const businessReviews = business.user_ratings_total || 0;
    
    // Determine market position
    let marketPosition = 'average';
    const insights = [];
    
    if (businessRating > avgRating + 0.3) {
      marketPosition = 'leading';
      insights.push(`Rating (${businessRating}) is above local average (${avgRating.toFixed(1)}) - strong reputation advantage`);
    } else if (businessRating < avgRating - 0.3) {
      marketPosition = 'lagging';
      insights.push(`Rating (${businessRating}) is below local average (${avgRating.toFixed(1)}) - reputation improvement needed`);
    }
    
    if (businessReviews > avgReviewCount * 1.5) {
      insights.push(`Review volume (${businessReviews}) significantly higher than average (${Math.round(avgReviewCount)}) - strong online presence`);
    } else if (businessReviews < avgReviewCount * 0.5) {
      insights.push(`Review volume (${businessReviews}) below average (${Math.round(avgReviewCount)}) - need more customer engagement`);
    }
    
    // Find top competitor
    const topCompetitor = competitors.reduce((top, current) => {
      const topScore = (top.rating || 0) * Math.log(1 + (top.userRatingsTotal || 0));
      const currentScore = (current.rating || 0) * Math.log(1 + (current.userRatingsTotal || 0));
      return currentScore > topScore ? current : top;
    }, competitors[0]);
    
    if (topCompetitor) {
      insights.push(`Top local competitor: ${topCompetitor.name} (${topCompetitor.rating}/5, ${topCompetitor.userRatingsTotal} reviews)`);
    }

    return {
      marketPosition,
      insights,
      benchmarks: {
        avgRating: Number(avgRating.toFixed(1)),
        avgReviewCount: Math.round(avgReviewCount),
        totalCompetitors: competitors.length,
        topCompetitor: topCompetitor?.name || null
      }
    };
  }

  /**
   * Extract actionable insights from business data
   * @param {Object} business - Business place data
   * @param {Object} marketAnalysis - Market position analysis
   * @returns {Array} Array of specific, actionable insights
   */
  generateInsights(business, marketAnalysis) {
    const insights = [];
    
    if (!business) return insights;
    
    // Rating insights
    if (business.rating < 4.0 && business.user_ratings_total > 10) {
      insights.push({
        category: 'reputation',
        priority: 'high',
        issue: `Low rating (${business.rating}/5) with significant review volume`,
        action: 'Implement review recovery strategy - respond to negative reviews and improve service quality'
      });
    }
    
    // Review volume insights
    if (business.user_ratings_total < 20) {
      insights.push({
        category: 'engagement',
        priority: 'medium',
        issue: `Low review count (${business.user_ratings_total})`,
        action: 'Launch review generation campaign - ask satisfied customers for reviews'
      });
    }
    
    // Hours insights
    if (!business.opening_hours?.open_now && business.opening_hours?.periods) {
      insights.push({
        category: 'visibility',
        priority: 'medium', 
        issue: 'Currently closed - may impact discovery',
        action: 'Ensure business hours are accurate and consider extended hours analysis'
      });
    }
    
    // Photos insights  
    if (!business.photos || business.photos.length < 5) {
      insights.push({
        category: 'presentation',
        priority: 'medium',
        issue: 'Limited photos on Google Business Profile',
        action: 'Add high-quality photos: exterior, interior, products, team'
      });
    }
    
    // Website insights
    if (!business.website) {
      insights.push({
        category: 'online-presence',
        priority: 'high',
        issue: 'No website listed on Google Business Profile',
        action: 'Add website URL to GBP and ensure mobile-friendly design'
      });
    }
    
    // Add market-based insights
    if (marketAnalysis?.insights) {
      marketAnalysis.insights.forEach(insight => {
        insights.push({
          category: 'competitive',
          priority: 'medium',
          issue: insight,
          action: 'Use competitive intelligence to adjust strategy and positioning'
        });
      });
    }
    
    return insights;
  }
}

module.exports = { GooglePlacesService };