# Morrow.AI Human-Level Conversation & Voice Layer

This document describes the human-level conversation and voice capabilities added to Morrow.AI.

## Overview

Morrow.AI now features natural language understanding, human-style responses, and voice interaction capabilities that make it feel like a real companion rather than a chatbot.

## Key Components

### 1. Intent Parser (`ai-server/intent-parser.js`)

The Intent Parser maps natural language inputs to structured tool calls using an NLU→tool JSON contract.

**Features:**
- Few-shot learning examples for intent recognition
- Entity extraction (locations, industries, timeframes, platforms)
- Confidence scoring
- Missing field detection
- Clarification question generation

**Example Usage:**
```javascript
const { IntentParser } = require('./intent-parser');
const parser = new IntentParser();

const parsed = parser.parse("Can you analyze the SEO for my plumbing business?");
// Returns: { intent: 'seo_analysis', action: 'performSEOAnalysis', confidence: 0.95, parameters: {...} }
```

**Supported Intents:**
- `seo_analysis` - SEO analysis requests
- `social_content` - Social media content generation
- `start_audit` - Business audits
- `competitor_analysis` - Competitor research
- `content_calendar` - Content planning
- `generate_report` - Report generation
- `capabilities` - Feature explanations
- `chat` - General conversation

### 2. Response Formatter (`ai-server/response-formatter.js`)

The Response Formatter transforms raw AI outputs into friendly, human-sounding responses following a strict style guide.

**Style Guide Principles:**
- Short sentences (max 20 words)
- Plain English (no jargon)
- Conversational tone
- Emojis for personality (max 2)
- Bullet points for lists
- Contextual next steps

**Tone Matching:**
- `urgent` - Fast, direct responses with ⚡
- `excited` - Energetic, enthusiastic with 🔥
- `casual` - Relaxed, friendly with 🙂
- `formal` - Professional, measured with 📌
- `neutral` - Balanced with ✨

**Example Usage:**
```javascript
const { ResponseFormatter } = require('./response-formatter');
const formatter = new ResponseFormatter({ useEmojis: true });

const response = formatter.format({
  analysis: 'SEO Analysis results...',
  action: 'performSEOAnalysis'
}, { tone: 'excited' });
```

### 3. Voice Hooks (`src/hooks/useVoice.ts`)

React hooks providing text-to-speech and speech-to-text capabilities using the Web Speech API.

**Available Hooks:**

#### `useSpeech(preferences?)`
Text-to-speech functionality.
```typescript
const { speak, stop, isSpeaking, isSupported } = useSpeech({
  enabled: true,
  consent: true,
  volume: 0.8,
  rate: 1.0
});

speak("Hello! I'm Morrow.AI");
```

#### `useSpeechRecognition()`
Speech-to-text functionality.
```typescript
const { startListening, stopListening, transcript, isListening } = useSpeechRecognition();

startListening(); // User speaks
// transcript updates automatically
```

#### `useVoicePreferences()`
Manage voice settings and consent.
```typescript
const { preferences, updatePreferences, requestConsent, unsubscribe } = useVoicePreferences();

requestConsent(); // Ask user for permission
updatePreferences({ volume: 0.5 }); // Update settings
unsubscribe(); // Disable all voice features
```

### 4. Voice Assistant Component (`src/components/VoiceAssistant.tsx`)

A complete voice interaction UI component with push-to-talk and settings management.

**Features:**
- Push-to-talk button for voice commands
- Speak response button
- Visual feedback (listening, speaking, processing)
- Settings panel with volume, speed, quiet hours
- Consent management
- Unsubscribe option

**Example Usage:**
```tsx
import { VoiceAssistant } from './components/VoiceAssistant';

<VoiceAssistant 
  onResponse={(response) => console.log('AI said:', response)}
  autoSpeak={false}
/>
```

## Guardrails

### Quiet Hours
Voice features respect quiet hours (default: 22:00-07:00) and won't speak during those times.

```typescript
updatePreferences({
  quietHours: { start: '22:00', end: '07:00' }
});
```

### Consent
All voice features require explicit user consent before activation.

```typescript
const hasConsent = requestConsent();
if (hasConsent) {
  // Voice features enabled
}
```

### Unsubscribe
Users can disable all voice features at any time.

```typescript
unsubscribe(); // Disables all voice features and removes consent
```

## Integration

### Backend Integration

The `/api/ai/assistant` endpoint now uses the Intent Parser and Response Formatter:

```javascript
// In ai-server/morrow.js
async assistant({ prompt, context, conversationId }) {
  // Parse intent from natural language
  const parsed = this.intentParser.parse(prompt, context || {});
  
  // Execute action if confidence is high enough
  if (parsed.action && parsed.confidence > 0.5) {
    result = await this[parsed.action](parsed.parameters);
  }
  
  // Format response in human-friendly style
  const response = this.responseFormatter.format(result, { 
    tone, 
    includeNextSteps: true 
  });
  
  return { response, intent: parsed.intent, ... };
}
```

### Frontend Integration

The Dashboard component includes the Voice Assistant:

```tsx
import { VoiceAssistant } from './components/VoiceAssistant';

// In Dashboard component
<VoiceAssistant 
  onResponse={(response) => {
    setMessage(response);
  }}
/>
```

## Streaming Status Patterns

The Response Formatter supports streaming status updates for long-running operations:

```javascript
const response = formatter.format({
  response: 'Analyzing your website',
  status: { analyzing: true, progress: 45 }
}, { streaming: true });

// Output: "Analyzing… 45% complete."
```

**Supported Status Types:**
- `scanning` - Shows count of items found
- `analyzing` - Shows percentage progress
- `generating` - Shows completion message

## Testing

### Backend Tests
```bash
# Test intent parser
node ai-server/test-intent-parser.js

# Test response formatter
node ai-server/test-response-formatter.js
```

### Frontend Tests
```bash
npm test
```

Tests cover:
- Intent parsing accuracy
- Response formatting
- Voice hook functionality
- Component rendering

## Browser Compatibility

**Text-to-Speech (Web Speech API):**
- ✅ Chrome/Edge (full support)
- ✅ Safari (full support)
- ⚠️ Firefox (limited voices)

**Speech-to-Text (Web Speech Recognition API):**
- ✅ Chrome/Edge (full support)
- ❌ Safari (not supported)
- ❌ Firefox (not supported)

For browsers without support, the component gracefully degrades and hides unsupported features.

## Examples

### Voice Command Flow
1. User clicks "Push to Talk" button
2. Browser asks for microphone permission (first time)
3. User speaks: "Can you analyze the SEO for my plumbing business?"
4. Speech is transcribed to text
5. Intent Parser identifies: `seo_analysis` intent
6. Morrow.AI executes SEO analysis
7. Response Formatter creates friendly response
8. If auto-speak enabled, response is spoken aloud

### Natural Language Examples

**Input:** "I need help creating social media posts for Facebook"
- **Intent:** `social_content`
- **Action:** `generateSocialContent`
- **Response:** "🔥 Let's go. I'll create Facebook post..."

**Input:** "Who are my competitors in Denver?"
- **Intent:** `competitor_analysis`
- **Action:** `analyzeCompetitors`
- **Response:** "✨ Got it. Looking at competitors in Denver..."

**Input:** "Hey, what can you do?"
- **Intent:** `capabilities`
- **Action:** `explainCapabilities`
- **Response:** Lists all capabilities with bullet points

## Future Enhancements

Potential improvements for future iterations:

1. **Multi-language support** - Support languages beyond English
2. **Voice profiles** - Different voices for different tones
3. **Context memory** - Remember previous conversations for better intent detection
4. **Custom wake word** - "Hey Morrow" activation
5. **Google Cloud STT/TTS** - Higher quality speech for production
6. **Sentiment analysis** - Better tone detection from text and voice
7. **Background listening** - Continuous listening mode (with consent)

## Configuration

### Environment Variables

```bash
# Backend
MORROW_MODEL=controller-v1

# Frontend
VITE_LOCAL_AI_URL=http://localhost:8080
VITE_DEFAULT_AI_PROVIDER=claude
```

### LocalStorage Keys

```javascript
// Voice preferences
'voice.preferences' - JSON object with all settings
'voice.consent.asked' - Flag indicating if consent was requested

// AI preferences  
'ai.provider' - Selected AI provider
'ai.model' - Selected AI model
```

## Security & Privacy

- ❌ No voice data is sent to external servers (uses browser APIs)
- ✅ Explicit consent required before any voice feature activation
- ✅ Users can unsubscribe at any time
- ✅ Quiet hours prevent unexpected audio
- ✅ Settings stored locally (no tracking)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify browser compatibility
3. Ensure microphone permissions granted
4. Test with simple commands first
