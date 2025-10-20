# Audit Function Analysis

## Overview

The audit system in Morrow.AI has **two main functions** with different purposes:

### 1. `startAudit()` - Quick Audit Kickoff
**Location**: `ai-server/morrow.js` (lines 506-511)

**Purpose**: Lightweight audit starter that creates a simple audit report summary.

**Current Implementation**:
```javascript
async startAudit({ businessName, website, scope = [], websiteContent, placesData }) {
  const contentHint = websiteContent?.title || websiteContent?.description;
  return this._simulateWork(async () => ({
    report: `Started audit for ${businessName}${website?` (${website})`:''}. 
            Scope: ${scope.join(', ') || 'standard local SEO'}. 
            ${contentHint?`Initial site signal: ${contentHint}`:''}
            ${placesData?.rating?` | Google Rating: ${placesData.rating} (${placesData.user_ratings_total||0})`:''}`,
    provider: this.name,
  }), { type: 'startAudit', businessName, website, scope, websiteContent, placesData });
}
```

**What it does**:
- Takes business name, website, scope array, website content, and Google Places data
- Returns a **simple text report** with basic info
- Logs the call to knowledge base
- **Limitation**: Very basic output, just concatenates info into a string

**Inputs**:
- `businessName` (required)
- `website` (optional)
- `scope` (optional array, e.g., ['seo', 'gbp', 'citations'])
- `websiteContent` (optional, from website_intel tool)
- `placesData` (optional, from Google Places API)

**Output**:
```json
{
  "report": "Started audit for Luna Café (https://lunacafe.com). Scope: seo, gbp. Initial site signal: Best coffee in downtown...",
  "provider": "Morrow.AI"
}
```

---

### 2. `seoAnalysis()` - Full Detailed Audit
**Location**: `ai-server/morrow.js` (lines 420-489)

**Purpose**: Comprehensive SEO and local presence audit with structured output.

**Current Implementation**: Generates a full markdown report with:

#### Sections Generated:
1. **Title**: Business name, website, location, industry
2. **Executive Summary**:
   - Snapshot of local presence and quick wins
   - Prioritized actions to move the needle fast
   - Assumptions stated where data is missing

3. **Findings** (checks):
   - GBP: Categories, photos, reviews, Q&A completeness
   - On-Page: Titles, H1, NAP, internal links, Lighthouse basics
   - Citations: Yelp, BBB, Apple Maps, data aggregators
   - Reviews: Volume/velocity, response cadence, ask flow
   - Social: Activity and relevance to local audience
   - Competitors: 2–3 local peers and differentiation

4. **Website Signals** (extracted from websiteContent):
   - H1 headings (top 2)
   - H2 headings (top 2)
   - Meta description
   - Shows up to 4 unique signals

5. **Google Place Details** (if placesData provided):
   - Rating and review count
   - Business status (OPERATIONAL, etc.)
   - Open now status
   - Price level
   - Phone number
   - Opening hours (full week)
   - Recent reviews (top 3 with ratings and text)

6. **Top Actions** (prioritized recommendations):
   - Fix top 5 on-page issues (titles/H1/NAP) — high impact/low effort
   - Refresh GBP photos and add missing categories — high trust gain
   - Standardize citations across top directories — consistency boost
   - Implement review ask cadence (2x/week) — improve rating density
   - Publish 2 location-focused posts/month — local relevance

7. **Next Steps**: Offers to generate detailed action plan

**Inputs**:
- `businessName` (required)
- `website` (optional)
- `location` (optional)
- `industry` (optional)
- `websiteContent` (optional, rich object with h1, h2, description, contentSample)
- `placesData` (optional, full Google Places result)

**Output**:
```json
{
  "analysis": "# SEO Analysis: Luna Café...\n\n## Executive Summary\n...",
  "provider": "Morrow.AI",
  "timestamp": "2025-10-20T01:00:00.000Z"
}
```

---

## Current Issues & Limitations

### Problems with `startAudit()`:
1. **Too simple**: Just returns a plain text string, not structured data
2. **No real analysis**: Doesn't actually analyze anything, just echoes inputs
3. **Not actionable**: Doesn't provide recommendations
4. **Poor UX**: Output is not formatted well

### Problems with `seoAnalysis()`:
1. **Template-based**: Uses generic bullet points, not real analysis
2. **No live data**: Doesn't fetch website content or Places data itself
3. **Static recommendations**: Same actions for every business
4. **No scoring**: Doesn't rate issues by severity
5. **No competitor analysis**: Claims to check competitors but doesn't

### Common Issues (Both Functions):
1. **No external API calls**: Relies on caller to provide websiteContent and placesData
2. **No real intelligence**: Just formats data, doesn't analyze it
3. **Not using AI**: These are template functions, not AI-powered
4. **No persistence**: Doesn't save audit results to database
5. **No follow-up**: Can't track progress or re-run audits

---

## How It's Currently Used

### 1. From Dashboard UI:
```typescript
// src/components/Dashboard.tsx
const res = await localAI.startAudit({});
// User gets back: "Started audit for undefined. Scope: standard local SEO."
```

### 2. From Agent/Brain Mode:
```javascript
// ai-server/tools/index.js - audit_start tool
const result = await this.morrow.startAudit({
  businessName: args.businessName,
  website: args.website,
  scope: args.scope || []
});
```

### 3. From Agent Service:
```javascript
// ai-server/services/agent.js - run_audit tool
case 'run_audit': {
  const res = await this.morrow.startAudit({
    businessName: args.businessName,
    website: args.website,
    scope: Array.isArray(args.scope) ? args.scope : []
  });
  return res;
}
```

### 4. Batch Audits:
```javascript
// ai-server/routes/agent.js - /run-audits endpoint
const results = await Promise.all(
  businesses.slice(0, 10).map(b => 
    morrow.startAudit({ 
      businessName: b.name || b, 
      website: b.website, 
      scope: b.scope || [] 
    })
  )
);
```

---

## What Morrow.AI Should Do Instead

### Vision: AI-Powered Audit Engine

The audit function should:

1. **Fetch live data**:
   - Scrape website automatically
   - Query Google Places API
   - Check citations across directories
   - Analyze social media presence
   - Compare to competitors

2. **Analyze intelligently** (using OpenAI):
   - Evaluate website SEO quality
   - Score NAP consistency
   - Rate GBP completeness
   - Assess review velocity and sentiment
   - Identify gaps vs competitors

3. **Generate actionable insights**:
   - Prioritized action list (high/medium/low impact)
   - Specific recommendations (not generic templates)
   - Quick wins vs long-term strategies
   - Effort estimates for each action

4. **Provide structured output**:
   ```json
   {
     "auditId": "aud_abc123",
     "businessName": "Luna Café",
     "score": {
       "overall": 68,
       "website": 72,
       "gbp": 85,
       "citations": 45,
       "reviews": 80,
       "social": 30
     },
     "issues": [
       {
         "category": "website",
         "severity": "high",
         "title": "Missing H1 tag on homepage",
         "impact": "Poor SEO signal to Google",
         "recommendation": "Add H1 with primary keyword",
         "effort": "low"
       }
     ],
     "topActions": [...],
     "competitors": [...]
   }
   ```

5. **Enable tracking**:
   - Save audits to Firestore
   - Track changes over time
   - Re-run audits to measure progress
   - Alert on score changes

---

## Recommendation: Rebuild the Audit Engine

### Phase 1: Enhanced Data Collection
- Wire up Google Places API properly
- Use website_intel tool automatically
- Add citation checker (check business on Yelp, BBB, etc.)
- Add social media scanner

### Phase 2: AI-Powered Analysis
- Send all collected data to OpenAI (via Morrow.AI brain)
- Use structured output to get scored analysis
- Generate specific, contextual recommendations
- Compare to industry benchmarks

### Phase 3: Persistence & Tracking
- Store audits in Firestore with unique IDs
- Link to customer profiles
- Enable audit history view
- Add "re-audit" capability

### Phase 4: Actionable Workflows
- Turn recommendations into tasks
- Track completion
- Measure impact on scores
- Automate some fixes (e.g., generate optimized content)

Want me to implement this vision? I can build:
1. Enhanced `runAudit()` that does everything above
2. Firestore schema for audit storage
3. UI for viewing audit results with scores
4. Progress tracking system
