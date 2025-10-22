# SMARTLOCAL.AI - Complete Design Document
**Version 1.0 | October 2025**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Business Vision & Goals](#business-vision--goals)
3. [Product Overview](#product-overview)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Code Structure & Organization](#code-structure--organization)
7. [Core Features & Functionality](#core-features--functionality)
8. [Database Schema](#database-schema)
9. [API Design](#api-design)
10. [User Experience & Interface](#user-experience--interface)
11. [Security & Authentication](#security--authentication)
12. [Customer Portal System](#customer-portal-system)
13. [Notification System](#notification-system)
14. [AI Integration](#ai-integration)
15. [Deployment & Infrastructure](#deployment--infrastructure)
16. [Business Model](#business-model)
17. [Roadmap & Future Enhancements](#roadmap--future-enhancements)
18. [Implementation Updates (October 2025)](#implementation-updates-october-2025)

---

## Executive Summary

**SMARTLOCAL.AI** is an AI-powered SaaS platform designed to revolutionize how consultants deliver local SEO, digital marketing, and business intelligence services to small and medium businesses. The platform combines cutting-edge AI technology with intuitive consultant tools and white-label customer portals to create a comprehensive, scalable solution for digital marketing consultants. Morrow.AI is the built-in AI companion that powers audits, insights, and conversation inside the platform.

### Key Value Propositions
- **For Consultants**: Automated client onboarding, AI-powered audits, personalized customer portals, and streamlined communication
- **For Clients**: Transparent progress tracking, actionable insights, and professional reporting through personalized dashboards
- **For the Business**: Scalable SaaS model with recurring revenue, low operational overhead, and high-value AI automation

---

## Business Vision & Goals

### Mission Statement
*"Empower digital marketing consultants to deliver enterprise-level AI-powered services to local businesses through intelligent automation and seamless client management."*

### Core Business Objectives
1. **Primary Revenue**: Monthly subscription model ($49-$299/month per consultant)
2. **Secondary Revenue**: Per-client portal fees, API usage fees, white-label licensing
3. **Market Position**: #1 AI-powered consultant platform for local business optimization
4. **Target Growth**: 1,000 active consultants within 12 months, 10,000 client portals managed

### Target Market
- **Primary**: Independent digital marketing consultants
- **Secondary**: Small marketing agencies (2-10 employees)
- **Tertiary**: SEO specialists, local business consultants

---

## Product Overview

### What SMARTLOCAL.AI Does

SMARTLOCAL.AI is a dual-sided platform:

#### Consultant Dashboard (Main Application)
- Client onboarding and profile management
- AI-powered SEO audits using multiple LLM providers (Ollama, OpenAI, Gemini)
- Interactive map view for local business discovery
- AI tools suite (content generation, competitor analysis, reports)
- Customer portal creation and management
- Email/SMS notification system
- Progress tracking and analytics

#### Customer Portal (White-Label)
- Unique, secure link for each client
- Verification-based authentication (email/SMS code)
- Personalized dashboard showing selected tools and services
- Real-time progress tracking
- Report viewing and download
- Direct communication with consultant

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌─────────────────┐           ┌──────────────────┐        │
│  │ Consultant Web  │           │ Customer Portal  │        │
│  │   Application   │           │   (React SPA)    │        │
│  │   (React SPA)   │           └──────────────────┘        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │         AI Server (Express.js - Port 3001)       │      │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │      │
│  │  │AI Routes │  │Customer  │  │ Notification  │  │      │
│  │  │          │  │Routes    │  │   Service     │  │      │
│  │  └──────────┘  └──────────┘  └───────────────┘  │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Firebase   │ │Local Storage│ │External APIs│
│  Firestore  │ │(JSON files) │ │SendGrid/    │
│             │ │             │ │Twilio/LLMs  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Component Architecture

#### Frontend Architecture (React)
```
src/
├── index.tsx                 # Main app component & routing
├── CustomerProfile.tsx       # Customer portal page
├── MapView.tsx              # Interactive map component
├── firebase.ts              # Firebase configuration
├── ai-service.ts            # AI service abstraction
├── index.css                # Global styles
└── components/
    ├── AppHeader
    ├── ClientSetupView
    ├── AuditView
    ├── ProfilesView
    ├── ToolsView
    ├── AdvancedFeaturesView
    └── AIAssistantView
```

#### Backend Architecture (Node.js/Express)
```
ai-server/
├── server.js                # Main server & middleware
├── .env                     # Configuration
├── package.json
├── routes/
│   ├── ai.js               # AI generation endpoints
│   ├── customer.js         # Customer portal management
│   ├── features.js         # Available features
│   └── health.js           # Health check
├── services/
│   ├── ai-provider.js      # LLM abstraction layer
│   └── notify.js           # Email/SMS notifications
└── data/
    └── customers.json      # Local customer database
```

---

## Technology Stack

### Frontend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI Framework | 19.1.1 |
| TypeScript | Type Safety | 5.4.5 |
| Vite | Build Tool | 5.2.13 |
| Firebase SDK | Authentication & Firestore | 10.12.2 |
| Google Maps API | Location Services | Latest |
| React Router | Client-side Routing | Latest |

### Backend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| Node.js | Runtime | 22.14.0 |
| Express.js | Web Framework | 4.19.2 |
| Firebase Admin | Server-side Firebase | Latest |
| SendGrid | Email Service | Latest |
| Twilio | SMS Service | Latest |
| Axios | HTTP Client | 1.7.2 |

### AI/LLM Providers
| Provider | Use Case | Model |
|---------|----------|-------|
| Ollama (Local) | Primary, cost-free inference | llama3.1:8b |
| OpenAI | Fallback, advanced features | gpt-4o-mini |
| Gemini | Fallback, Google integration | gemini-2.0-flash-exp |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Firebase Hosting | Frontend deployment |
| Firebase Firestore | NoSQL database |
| Firebase Functions | Serverless functions |
| Firebase Authentication | User management |
| Local Server | AI inference (dev/production) |

---

## Code Structure & Organization

### Design Patterns

#### 1. Service Layer Pattern (Backend)
```javascript
// services/ai-provider.js
class AIProviderService {
  constructor() {
    this.providers = {
      ollama: new OllamaProvider(),
      openai: new OpenAIProvider(),
      gemini: new GeminiProvider()
    };
  }
  
  async generateContent(prompt, options) {
    const provider = options.provider || this.defaultProvider;
    return await this.providers[provider].generateContent(prompt, options);
  }
}
```

#### 2. Repository Pattern (Data Access)
```javascript
// Dual storage: Firestore + Local JSON
async function saveProfile(profile) {
  // Save to local file
  saveLocalProfile(profile);
  // Save to Firestore
  await saveFirestoreProfile(profile);
}
```

#### 3. Component Composition (Frontend)
```tsx
<App>
  <AppHeader />
  <main>
    {currentView === 'MAP' && <MapView />}
    {currentView === 'TOOLS' && <ToolsView />}
    {currentView === 'PROFILES' && <ProfilesView />}
  </main>
</App>
```

### State Management
- **React useState/useEffect** for local component state
- **Firebase Realtime Updates** for data synchronization
- **Context API** (planned) for global app state

### Error Handling Strategy
```javascript
// Centralized error middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});
```

---

## Core Features & Functionality

### 1. Client Management System

#### Client Onboarding
```typescript
interface Business {
  id: string;
  name: string;
  website?: string;
  consultant_uid: string;
  createdAt: Timestamp;
  notes?: string;
}
```

**Features:**
- Quick client profile creation
- Business information capture
- Notes and context storage
- Firebase Firestore persistence

#### Client Profiles View
- List all clients
- Search and filter
- Quick audit launching
- Profile detail view with audit history

### 2. AI-Powered SEO Audit System

**Workflow:**
1. Consultant enters business name and website
2. AI analyzes business data
3. Multi-step audit process:
   - Local SEO analysis
   - Keyword research
   - Competitor analysis
   - Content recommendations
   - Technical SEO review
4. Generate comprehensive PDF report
5. Store in Firebase with client association

**AI Prompt Engineering:**
```javascript
const auditPrompt = `
Perform a comprehensive local SEO audit for:
Business: ${businessName}
Website: ${websiteUrl}

Analyze:
1. Local SEO optimization
2. Google Business Profile
3. Citation consistency
4. Review strategy
5. Local keyword usage
6. On-page optimization
7. Technical SEO
8. Competitor positioning

Provide actionable recommendations.
`;
```

### 3. Interactive Map View

**Google Maps Integration:**
- Location-based business search
- Autocomplete for place selection
- Custom markers for search results
- Info windows with audit launch button
- Search history tracking
- Geolocation support

**Key Features:**
- Click business → Start audit directly
- Visual competitor identification
- Local market research tool

### 4. AI Tools Suite

#### Content Generation
- Blog posts
- Social media content
- Meta descriptions
- Ad copy

#### Analysis Tools
- Competitor analysis
- Keyword research
- Content gap analysis
- Market trend analysis

#### Reporting
- Custom report generation
- Data visualization
- Export to PDF/Excel

### 5. Customer Portal System

#### Portal Creation Flow
```javascript
POST /api/customer
{
  "email": "customer@example.com",
  "phone": "+15555555555",
  "selectedTools": ["seo-analysis", "social-content"],
  "progress": {
    "seo-analysis": {
      "status": "pending",
      "lastUpdated": "2025-10-17T12:00:00Z",
      "notes": "Initial setup"
    }
  }
}

Response:
{
  "id": "uuid-here",
  "reportUrl": "/customer/uuid-here",
  "verificationCode": "123456",
  "notifyResult": {
    "email": "sent",
    "sms": "sent"
  }
}
```

#### Portal Features
- Unique URL per customer (`/customer/:id`)
- Verification code authentication
- Tool selection and progress tracking
- Real-time updates
- Mobile-responsive design

### 6. Notification System

**Email (SendGrid):**
- Template-based emails
- Dynamic content injection
- Verified sender (tjmorrow909@gmail.com)
- Deliverability tracking

**SMS (Twilio):**
- Short verification codes
- Link delivery
- International support

---

## Database Schema

### Firebase Firestore Collections

#### `clients` Collection
```javascript
{
  id: "auto-generated",
  name: "Joe's Pizza Downtown",
  website: "https://www.joespizza.com",
  notes: "Target keywords: pizza delivery, local pizza",
  consultant_uid: "firebase-auth-uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `audits` Collection
```javascript
{
  id: "auto-generated",
  client_id: "client-doc-id",
  consultant_uid: "firebase-auth-uid",
  status: "complete",
  ai_report: "Full markdown report text...",
  date_completed: Timestamp,
  model_used: "ollama/llama3.1:8b",
  metadata: {
    tokens_used: 2500,
    processing_time_ms: 15000
  }
}
```

#### `customers` Collection (Firestore)
```javascript
{
  id: "uuid",
  contact: {
    email: "customer@example.com",
    phone: "+15555555555"
  },
  selectedTools: ["seo-analysis", "social-content"],
  progress: {
    "seo-analysis": {
      status: "pending",
      lastUpdated: Timestamp,
      notes: "Initial audit scheduled"
    }
  },
  reportUrl: "/customer/uuid",
  verificationCode: "123456",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Local Storage (JSON)

#### `ai-server/data/customers.json`
```json
[
  {
    "id": "uuid",
    "contact": { "email": "...", "phone": "..." },
    "selectedTools": [...],
    "progress": {...},
    "reportUrl": "/customer/uuid",
    "verificationCode": "123456",
    "createdAt": "2025-10-17T12:00:00Z",
    "updatedAt": "2025-10-17T12:00:00Z"
  }
]
```

---

## API Design

### REST API Endpoints

#### Authentication & Health
```
GET  /health                    # Server health check
GET  /                          # Server info
```

#### AI Services
```
POST /api/ai/generate           # Generate AI content
POST /api/ai/chat              # Chat with AI
POST /api/ai/image             # Generate images
POST /api/ai/stream            # Streaming responses
GET  /api/ai/providers         # Available AI providers
GET  /api/ai/health            # AI service health
```

#### Features
```
GET  /api/features             # List available features
POST /api/features/seo-analysis       # Run SEO analysis
POST /api/features/social-content     # Generate social content
POST /api/features/competitor-analysis # Competitor analysis
POST /api/features/custom-report      # Create custom report
POST /api/features/content-calendar   # Generate content calendar
POST /api/features/assistant          # AI assistant chat
```

#### Customer Portal
```
POST /api/customer              # Create customer profile
GET  /api/customer/profile/:id  # Get customer profile
PUT  /api/customer/profile/:id  # Update customer profile
```

### API Request/Response Examples

#### Create Customer Profile
**Request:**
```http
POST /api/customer
Content-Type: application/json

{
  "email": "customer@example.com",
  "phone": "+15555555555",
  "selectedTools": ["seo-analysis", "social-content"],
  "progress": {
    "seo-analysis": {
      "status": "pending",
      "lastUpdated": "2025-10-17T12:00:00Z",
      "notes": "Initial setup"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "contact": {
      "email": "customer@example.com",
      "phone": "+15555555555"
    },
    "selectedTools": ["seo-analysis", "social-content"],
    "progress": {...},
    "reportUrl": "/customer/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "verificationCode": "482719",
    "createdAt": "2025-10-17T12:00:00Z",
    "updatedAt": "2025-10-17T12:00:00Z"
  },
  "notifyResult": {
    "email": "sent",
    "sms": "sent"
  }
}
```

---

## User Experience & Interface

### Consultant Dashboard Flow

```
Login (Google OAuth)
  ↓
Dashboard Home
  ├── Map View (Discover local businesses)
  ├── Client Setup (Onboard new client)
  ├── Profiles (View all clients)
  ├── Tools (AI features)
  ├── Advanced Features (Premium tools)
  └── AI Assistant (Chat interface)
```

### Customer Portal Flow

```
Receive Email/SMS with Link
  ↓
Click Link → /customer/:id?code=123456
  ↓
Verify Code (if not in URL)
  ↓
View Dashboard
  ├── Selected Tools
  ├── Progress Tracking
  ├── Reports
  └── Contact Consultant
```

### UI/UX Principles

1. **Simplicity**: Clean, uncluttered interface
2. **Speed**: Fast load times, instant feedback
3. **Mobile-First**: Responsive design for all screens
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Consistency**: Unified design language

### Design System

#### Color Palette
```css
--primary: #4285F4;      /* Google Blue */
--secondary: #34A853;    /* Google Green */
--accent: #FBBC05;       /* Google Yellow */
--danger: #EA4335;       /* Google Red */
--text-primary: #202124;
--text-secondary: #5f6368;
--background: #ffffff;
--surface: #f8f9fa;
```

#### Typography
- **Headers**: System font stack
- **Body**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **Monospace**: "SF Mono", Monaco, Consolas

---

## Security & Authentication

### Authentication Strategy

#### Consultant Authentication
- **Method**: Firebase Authentication with Google OAuth
- **Session**: JWT tokens, refresh tokens
- **Permissions**: Role-based access control (RBAC)

#### Customer Portal Authentication
- **Method**: Verification code (email/SMS)
- **Approach**: "Magic link" style authentication
- **Security**: Time-limited codes, single-use tokens
- **No passwords**: Reduces attack surface

### Security Measures

#### Backend Security
```javascript
// Rate limiting
app.use(rateLimiter);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Helmet.js for HTTP headers
app.use(helmet({
  contentSecurityPolicy: false // Configured per environment
}));

// Input validation
app.use(express.json({ limit: '10mb' }));
```

#### Data Security
- **Encryption**: HTTPS/TLS for all communication
- **API Keys**: Environment variables, never in code
- **Firestore Rules**: Row-level security
- **Input Sanitization**: All user inputs validated

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clients/{clientId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == resource.data.consultant_uid;
    }
    
    match /audits/{auditId} {
      allow read: if request.auth != null 
                  && request.auth.uid == resource.data.consultant_uid;
      allow write: if request.auth != null;
    }
    
    match /customers/{customerId} {
      allow read: if true; // Public read with verification
      allow write: if request.auth != null; // Consultant only
    }
  }
}
```

---

## Customer Portal System

### Architecture

```
Customer clicks link
  ↓
/customer/:id?code=XXXXXX
  ↓
React Router → CustomerProfile.tsx
  ↓
Fetch profile: GET /api/customer/profile/:id
  ↓
Verify code matches profile.verificationCode
  ↓
Display dashboard
```

### Verification Flow

```typescript
// CustomerProfile.tsx
useEffect(() => {
  if (!id || !code) return;
  
  fetch(`/api/customer/profile/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data.profile.verificationCode !== code) {
        setError('Verification code is incorrect.');
      } else {
        setProfile(data.profile);
      }
    });
}, [id, code]);
```

### Portal Features

#### 1. Tool Selection Display
```tsx
<h3>Your Tools</h3>
<ul>
  {profile.selectedTools.map(tool => (
    <li key={tool}>
      {toolNames[tool]}
    </li>
  ))}
</ul>
```

#### 2. Progress Tracking
```tsx
<h3>Progress</h3>
{Object.entries(profile.progress).map(([tool, prog]) => (
  <div key={tool}>
    <h4>{toolNames[tool]}</h4>
    <ProgressBar status={prog.status} />
    <p>Last updated: {formatDate(prog.lastUpdated)}</p>
    <p>{prog.notes}</p>
  </div>
))}
```

#### 3. White-Label Styling
- Consultant can customize logo
- Brand colors
- Custom domain support (planned)

---

## Notification System

### Email Notifications (SendGrid)

#### Configuration
```javascript
// services/notify.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function sendEmail(to, subject, text, html, dynamicTemplateData) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html
  };
  
  if (process.env.SENDGRID_TEMPLATE_ID) {
    msg.templateId = process.env.SENDGRID_TEMPLATE_ID;
    msg.dynamicTemplateData = dynamicTemplateData;
  }
  
  return sgMail.send(msg);
}
```

#### Email Template Variables
```javascript
{
  customer_name: "John Doe",
  profile_link: "https://smartlocal.ai/customer/abc123",
  verification_code: "482719",
  consultant_name: "Your Consultant",
  consultant_email: "consultant@example.com"
}
```

### SMS Notifications (Twilio)

#### Configuration
```javascript
const twilio = require('twilio');

function sendSMS(to, body) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  return client.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER,
    to
  });
}
```

#### SMS Template
```
Your SMARTLOCAL.AI report is ready!
Access: https://smartlocal.ai/customer/abc123?code=482719
Code: 482719
```

---

## AI Integration

### Multi-Provider Architecture

```javascript
class AIProviderService {
  constructor() {
    this.providers = {
      ollama: new OllamaProvider(),
      openai: new OpenAIProvider(),
      gemini: new GeminiProvider()
    };
    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'ollama';
  }
  
  async generateContent(prompt, options = {}) {
    const provider = options.provider || this.defaultProvider;
    
    try {
      return await this.providers[provider].generateContent(prompt, options);
    } catch (error) {
      // Fallback to OpenAI if available
      if (provider !== 'openai' && this.providers.openai.isAvailable()) {
        return await this.providers.openai.generateContent(prompt, options);
      }
      throw error;
    }
  }
}
```

### Provider Implementations

#### Ollama (Local)
```javascript
class OllamaProvider {
  async generateContent(prompt, options = {}) {
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: options.model || 'llama3.1:8b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        max_tokens: options.max_tokens || 2000
      }
    });
    
    return {
      text: response.data.response,
      model: 'llama3.1:8b',
      provider: 'ollama',
      usage: response.data.usage || null
    };
  }
}
```

#### OpenAI (Cloud)
```javascript
class OpenAIProvider {
  async generateContent(prompt, options = {}) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: options.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      text: response.data.choices[0].message.content,
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: response.data.usage
    };
  }
}
```

### AI Features Implementation

#### SEO Analysis
```javascript
async function performSEOAnalysis(businessName, websiteUrl, provider) {
  const prompt = `
    Perform comprehensive local SEO analysis for:
    Business: ${businessName}
    Website: ${websiteUrl}
    
    Analyze:
    1. On-page SEO (titles, meta descriptions, headings)
    2. Local SEO signals (NAP consistency, schema markup)
    3. Technical SEO (speed, mobile-friendliness, security)
    4. Content quality and keyword optimization
    5. Backlink profile and domain authority
    6. Google Business Profile optimization
    7. Local citation consistency
    
    Provide:
    - Current status assessment
    - Priority action items (1-5 scale)
    - Specific recommendations
    - Expected impact of improvements
  `;
  
  return await aiService.generateContent(prompt, { provider });
}
```

---

## Deployment & Infrastructure

### Development Environment

```bash
# Frontend (Vite dev server)
cd SMART-LOCAL-AI
npm run dev
# Runs on http://localhost:3000

# Backend (Express server)
cd SMART-LOCAL-AI/ai-server
npm start
# Runs on http://localhost:3001

# Local AI (Ollama)
ollama serve
# Runs on http://localhost:11434
```

### Production Deployment

#### Frontend (Firebase Hosting)
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Custom domain
firebase hosting:channel:deploy production
```

#### Backend Options

**Option 1: VPS/Cloud Server**
```bash
# Install Node.js
# Clone repo
# Install dependencies
npm install --production

# Run with PM2
pm2 start server.js --name smartlocal-ai-backend
pm2 startup
pm2 save
```

**Option 2: Firebase Functions**
```javascript
// functions/src/index.ts
export const api = onRequest((request, response) => {
  return app(request, response);
});
```

**Option 3: Docker Container**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Environment Configuration

#### Production `.env`
```bash
# Server
PORT=3001
NODE_ENV=production
PUBLIC_BASE_URL=https://smartlocal.ai

# AI Providers
DEFAULT_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Notifications
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@smartlocal.ai
SENDGRID_TEMPLATE_ID=d-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Security
JWT_SECRET=<strong-random-string>
RATE_LIMIT_MAX_REQUESTS=100
```

### Scaling Strategy

#### Horizontal Scaling
- Load balancer (Nginx/CloudFlare)
- Multiple backend instances
- Shared Redis cache for sessions
- Firestore for distributed state

#### Vertical Scaling
- Upgrade server resources
- Optimize database queries
- Enable caching layers
- CDN for static assets

---

## Business Model

### Pricing Tiers

#### Starter Plan - $49/month
- 10 active client profiles
- 50 AI audits/month
- 100 customer portal views
- Email support
- Basic AI tools

#### Professional Plan - $149/month
- 50 active client profiles
- 250 AI audits/month
- 500 customer portal views
- Priority support
- Advanced AI tools
- White-label portals

#### Agency Plan - $299/month
- Unlimited client profiles
- 1,000 AI audits/month
- Unlimited portal views
- Dedicated support
- All AI tools
- Full white-label
- API access

### Revenue Streams

1. **Primary**: Monthly subscriptions
2. **Add-ons**: 
   - Additional AI credits ($0.10/audit)
   - Extra portal seats ($10/seat)
   - Custom integrations ($500 setup)
3. **Enterprise**: Custom pricing for agencies
4. **Marketplace**: Template marketplace (30% commission)

### Cost Structure

**Fixed Costs:**
- Firebase: $100/month (Blaze plan)
- Servers: $50-200/month (VPS)
- SendGrid: $15/month (50k emails)
- Twilio: $20/month (SMS)
- Domain/SSL: $20/year

**Variable Costs:**
- OpenAI API: $0.02 per 1k tokens (fallback only)
- Gemini API: Free tier, then $0.01/1k tokens
- Storage: $0.026/GB/month
- Bandwidth: $0.12/GB

**Target Margins:**
- Gross Margin: 75-85%
- Operating Margin: 40-50%
- Break-even: ~50 paid users

---

## Roadmap & Future Enhancements

### Phase 1: MVP (Current - Q1 2025)
✅ Core consultant dashboard
✅ Firebase authentication
✅ AI-powered audits
✅ Client profile management
✅ Customer portal system
✅ Email/SMS notifications
🔄 Map-based business discovery

### Phase 2: Enhanced Features (Q2 2025)
- [ ] Advanced AI tools suite
- [ ] Real-time collaboration
- [ ] Mobile apps (iOS/Android)
- [ ] Automated reporting scheduler
- [ ] Integration marketplace (Zapier, etc.)
- [ ] Stripe payment integration
- [ ] Analytics dashboard

### Phase 3: Scale & Optimize (Q3 2025)
- [ ] Multi-language support
- [ ] Advanced white-labeling
- [ ] API for third-party developers
- [ ] Team collaboration features
- [ ] Custom AI model training
- [ ] Advanced SEO crawling
- [ ] Competitor tracking automation

### Phase 4: Enterprise (Q4 2025)
- [ ] Self-hosted option
- [ ] SSO/SAML integration
- [ ] Advanced permissions/roles
- [ ] Dedicated support plans
- [ ] Custom SLAs
- [ ] Compliance certifications (SOC 2, GDPR)

### Feature Backlog

**High Priority:**
- Bulk client import
- CSV/Excel exports
- Template library
- Scheduled audits
- Progress notifications
- Client portal customization

**Medium Priority:**
- Video tutorials
- Knowledge base
- Community forum
- Referral program
- Affiliate system
- Webinar integration

**Future Considerations:**
- AI voice assistant
- Chrome extension
- Slack/Teams integration
- CRM integrations (HubSpot, Salesforce)
- Social media scheduling
- Content calendar automation

---

## Implementation Updates (October 2025)

This section summarizes concrete implementation work completed during October 2025 that affects behavior, configuration, and developer operations.

### Maps, Places, and Marker Behavior
- Switched from “search-only” markers to automatic business loading within the current map bounds using Google Maps Places Text Search.
- Debounced map idle events to reduce API churn and improve responsiveness.
- Clear/dedupe markers between updates to prevent leaks and duplicate pins.
- InfoWindow includes “Start an audit” and passes business name and website (when available) into the audit flow.

### Geolocation Permission UX
- Added an explicit, user-gesture-driven permission prompt flow with clear states: pending, granted, denied.
- When denied, we show friendly guidance and a “Try again” button to re-request permission.
- Notes for development: Geolocation prompts reliably on http://localhost. For non-localhost origins, HTTPS is required by browsers.

### Authentication Performance and Security
- Set Firebase Auth persistence to LOCAL to dramatically speed up returning-user sign-in.
- Added a 5s fallback timeout to onAuthStateChanged to avoid indefinite loading states.
- All frontend API requests now attach Authorization: Bearer <Firebase ID token> when the user is signed in.
- Backend enforces admin-only access via Firebase ID token verification and an admin email allowlist (env: ADMIN_EMAILS).

### AI Provider and Keys
- Added environment wiring for Gemini on both frontend and backend (VITE_GEMINI_API_KEY and GEMINI_API_KEY).
- Local AI provider remains default for cost efficiency; backend routes proxy AI calls under /api/features/* via the Vite dev proxy.
- Improved error reporting and surfaced failures to the UI for faster debugging.

### Dev Environment and Tooling
- Installed and authenticated Google Cloud CLI; set the active project.
- Resolved Node/port conflicts (port 3001) and stabilized backend/frontend restarts.
- Attempted dev HTTPS with @vitejs/plugin-basic-ssl but reverted due to Vite v5 peer constraints. Recommendation: upgrade to Vite 6+ or configure manual certificates for HTTPS in dev if needed.

### Security Hardening
- Secrets are excluded via .gitignore, and sensitive config is stored in .env.local (frontend) and process env (backend).
- Recommended: Apply API key restrictions for Google Maps (HTTP referrers) and rotate keys routinely.

### Known Issues and Troubleshooting
- Geolocation prompts only on localhost or HTTPS: use http://localhost during development or enable HTTPS.
- 401/403 on admin endpoints: ensure your logged-in email is in ADMIN_EMAILS and re-authenticate to refresh the token.
- Missing or stale map markers: verify Google Places API is enabled, key restrictions allow localhost, and check for console errors.
- Port in use: terminate stray node.exe processes or adjust port configuration.

### Next Steps
- Add simple smoke tests for protected endpoints in the UI and server.
- Consider upgrading to Vite 6 to enable the basic-ssl plugin for HTTPS dev.
- Document Firestore security rules and admin allowlist setup in README.
- Expand unit tests for map debounce, marker lifecycle, and auth header injection.

## Technical Specifications

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | ~1.5s |
| API Response Time | < 500ms | ~300ms |
| AI Generation Time | < 30s | ~15s |
| Uptime | 99.9% | N/A |
| Concurrent Users | 1,000+ | Testing |

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- Alt text for images

---

## Conclusion

Morrow.AI represents a comprehensive, scalable solution for digital marketing consultants to deliver AI-powered services to local businesses. The platform combines cutting-edge AI technology with practical business tools, creating a unique value proposition in the market.

### Key Success Factors

1. **AI-First Architecture**: Flexible multi-provider system ensures cost-efficiency and reliability
2. **Consultant-Focused UX**: Streamlined workflows reduce time-to-value
3. **Customer Portal Innovation**: Transparent, professional client experience
4. **Scalable Infrastructure**: Firebase + Express hybrid allows rapid scaling
5. **Revenue Model**: Predictable MRR with clear upgrade paths

### Next Steps

1. Complete MVP testing with beta users
2. Implement payment integration
3. Launch marketing campaign
4. Establish customer success workflows
5. Build community and content library

---

**Document Version**: 1.0  
**Last Updated**: October 17, 2025  
**Author**: SMARTLOCAL.AI Team  
**Status**: Living Document - Subject to Updates

