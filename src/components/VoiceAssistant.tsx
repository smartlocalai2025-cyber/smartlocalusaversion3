// Voice Assistant Component - React component for voice interaction with Morrow.AI
import React, { useState, useEffect } from 'react';
import { useSpeech, useSpeechRecognition, useVoicePreferences } from '../hooks/useVoice';
import { localAI } from '../ai-service';

interface VoiceAssistantProps {
  onResponse?: (response: string) => void;
  autoSpeak?: boolean;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onResponse, autoSpeak = false }) => {
  const { preferences, updatePreferences, requestConsent, unsubscribe } = useVoicePreferences();
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: speechSupported } = useSpeech(preferences);
  const { 
    startListening, 
    stopListening, 
    transcript, 
    isListening, 
    isSupported: recognitionSupported,
    error: recognitionError 
  } = useSpeechRecognition();
  
  const [response, setResponse] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Handle voice consent on first load
  useEffect(() => {
    if (!preferences.consent && (speechSupported || recognitionSupported)) {
      const hasAsked = localStorage.getItem('voice.consent.asked');
      if (!hasAsked) {
        localStorage.setItem('voice.consent.asked', 'true');
        requestConsent();
      }
    }
  }, [preferences.consent, speechSupported, recognitionSupported, requestConsent]);

  // Process transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript && !isProcessing) {
      handleVoiceCommand(transcript);
    }
  }, [isListening, transcript]);

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await localAI.askAssistant(command);
      const responseText = result.response || result.text || 'Got it!';
      setResponse(responseText);
      
      if (onResponse) {
        onResponse(responseText);
      }

      // Auto-speak the response if enabled
      if ((preferences.autoSpeak || autoSpeak) && preferences.enabled && preferences.consent) {
        speak(responseText);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Sorry, something went wrong';
      setResponse(errorMsg);
      if (preferences.enabled && preferences.consent) {
        speak(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePushToTalk = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!preferences.consent) {
        requestConsent();
      } else {
        startListening();
      }
    }
  };

  const handleSpeak = () => {
    if (response) {
      speak(response);
    }
  };

  if (!speechSupported && !recognitionSupported) {
    return (
      <div className="voice-assistant not-supported">
        <p>Voice features are not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className="voice-assistant">
      <div className="voice-controls">
        {recognitionSupported && (
          <button
            onClick={handlePushToTalk}
            disabled={isProcessing}
            className={`voice-button ${isListening ? 'listening' : ''}`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? '🎙️ Listening...' : '🎤 Push to Talk'}
          </button>
        )}
        
        {speechSupported && response && (
          <button
            onClick={handleSpeak}
            disabled={isSpeaking || isProcessing}
            className="speak-button"
            aria-label="Speak response"
          >
            {isSpeaking ? '🔊 Speaking...' : '🔊 Speak'}
          </button>
        )}

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="stop-button"
            aria-label="Stop speaking"
          >
            ⏹️ Stop
          </button>
        )}

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="settings-button"
          aria-label="Voice settings"
        >
          ⚙️
        </button>
      </div>

      {transcript && (
        <div className="voice-transcript">
          <strong>You said:</strong> {transcript}
        </div>
      )}

      {isProcessing && (
        <div className="voice-processing">
          Processing... ⏳
        </div>
      )}

      {response && !isProcessing && (
        <div className="voice-response">
          <strong>Morrow:</strong> {response}
        </div>
      )}

      {recognitionError && (
        <div className="voice-error" role="alert">
          Error: {recognitionError}
        </div>
      )}

      {showSettings && (
        <div className="voice-settings">
          <h3>Voice Settings</h3>
          
          <label>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => updatePreferences({ enabled: e.target.checked })}
            />
            Enable voice features
          </label>

          <label>
            <input
              type="checkbox"
              checked={preferences.autoSpeak}
              onChange={(e) => updatePreferences({ autoSpeak: e.target.checked })}
            />
            Auto-speak responses
          </label>

          <div className="quiet-hours">
            <h4>Quiet Hours</h4>
            <label>
              Start:
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => updatePreferences({
                  quietHours: { ...preferences.quietHours, start: e.target.value }
                })}
              />
            </label>
            <label>
              End:
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => updatePreferences({
                  quietHours: { ...preferences.quietHours, end: e.target.value }
                })}
              />
            </label>
          </div>

          <div className="voice-controls-settings">
            <label>
              Volume: {Math.round(preferences.volume * 100)}%
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={preferences.volume}
                onChange={(e) => updatePreferences({ volume: parseFloat(e.target.value) })}
              />
            </label>

            <label>
              Speed: {preferences.rate.toFixed(1)}x
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={preferences.rate}
                onChange={(e) => updatePreferences({ rate: parseFloat(e.target.value) })}
              />
            </label>
          </div>

          <button onClick={unsubscribe} className="unsubscribe-button">
            Disable Voice Features
          </button>
        </div>
      )}

      <style>{`
        .voice-assistant {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        
        .voice-assistant.not-supported {
          background: #fff3cd;
          border-color: #ffc107;
        }

        .voice-controls {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .voice-button, .speak-button, .stop-button, .settings-button {
          padding: 0.5rem 1rem;
          border: 1px solid #007bff;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .voice-button:hover, .speak-button:hover, .stop-button:hover, .settings-button:hover {
          background: #0056b3;
        }

        .voice-button:disabled, .speak-button:disabled, .stop-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .voice-button.listening {
          background: #dc3545;
          border-color: #dc3545;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .voice-transcript, .voice-response {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: white;
          border-radius: 4px;
          border-left: 3px solid #007bff;
        }

        .voice-response {
          border-left-color: #28a745;
        }

        .voice-processing {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: #e7f3ff;
          border-radius: 4px;
          color: #0066cc;
        }

        .voice-error {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: #f8d7da;
          border-radius: 4px;
          color: #721c24;
        }

        .voice-settings {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 4px;
        }

        .voice-settings h3, .voice-settings h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }

        .voice-settings label {
          display: block;
          margin: 0.5rem 0;
        }

        .voice-settings input[type="time"],
        .voice-settings input[type="range"] {
          margin-left: 0.5rem;
        }

        .quiet-hours {
          margin: 1rem 0;
          padding: 0.5rem;
          background: #f0f0f0;
          border-radius: 4px;
        }

        .voice-controls-settings {
          margin: 1rem 0;
        }

        .unsubscribe-button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .unsubscribe-button:hover {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistant;
