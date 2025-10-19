// Voice Hooks - React hooks for speech functionality using Web Speech API
// Provides text-to-speech and speech-to-text capabilities

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Voice consent and preferences interface
 */
export interface VoicePreferences {
  enabled: boolean;
  autoSpeak: boolean;
  quietHours: {
    start: string; // e.g., "22:00"
    end: string;   // e.g., "07:00"
  };
  consent: boolean;
  volume: number; // 0-1
  rate: number;   // 0.5-2
  pitch: number;  // 0-2
}

/**
 * Hook for text-to-speech functionality
 */
export function useSpeech(preferences?: Partial<VoicePreferences>) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Default preferences
  const defaultPrefs: VoicePreferences = {
    enabled: true,
    autoSpeak: false,
    quietHours: { start: '22:00', end: '07:00' },
    consent: false,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    ...preferences
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  /**
   * Check if we're in quiet hours
   */
  const isQuietHours = useCallback(() => {
    if (!defaultPrefs.quietHours) return false;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { start, end } = defaultPrefs.quietHours;
    
    // Handle quiet hours that cross midnight
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  }, [defaultPrefs.quietHours]);

  /**
   * Speak text using Web Speech API
   */
  const speak = useCallback((text: string, options?: Partial<VoicePreferences>) => {
    if (!synthRef.current || !isSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }

    if (!defaultPrefs.enabled || !defaultPrefs.consent) {
      console.log('Speech disabled or consent not given');
      return;
    }

    if (isQuietHours()) {
      console.log('In quiet hours, skipping speech');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply preferences
    const prefs = { ...defaultPrefs, ...options };
    utterance.volume = prefs.volume;
    utterance.rate = prefs.rate;
    utterance.pitch = prefs.pitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  }, [isSupported, defaultPrefs, isQuietHours]);

  /**
   * Stop speaking
   */
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Pause speaking
   */
  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
    }
  }, [isSpeaking]);

  /**
   * Resume speaking
   */
  const resume = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.resume();
    }
  }, [isSpeaking]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    isQuietHours: isQuietHours()
  };
}

/**
 * Hook for speech-to-text functionality
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        setIsSupported(true);
      }
    }
  }, []);

  /**
   * Start listening for speech
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      console.warn('Already listening');
      return;
    }

    setTranscript('');
    setError(null);
    setIsListening(true);

    recognitionRef.current.onresult = (event: any) => {
      const results = Array.from(event.results);
      const transcriptText = results
        .map((result: any) => result[0].transcript)
        .join('');
      setTranscript(transcriptText);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      setError(err.message);
      setIsListening(false);
    }
  }, [isSupported, isListening]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  /**
   * Reset transcript
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    startListening,
    stopListening,
    resetTranscript,
    transcript,
    isListening,
    isSupported,
    error
  };
}

/**
 * Hook for managing voice preferences
 */
export function useVoicePreferences() {
  const [preferences, setPreferences] = useState<VoicePreferences>(() => {
    if (typeof localStorage === 'undefined') {
      return {
        enabled: false,
        autoSpeak: false,
        quietHours: { start: '22:00', end: '07:00' },
        consent: false,
        volume: 0.8,
        rate: 1.0,
        pitch: 1.0
      };
    }

    const stored = localStorage.getItem('voice.preferences');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }

    return {
      enabled: false,
      autoSpeak: false,
      quietHours: { start: '22:00', end: '07:00' },
      consent: false,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0
    };
  });

  /**
   * Update preferences
   */
  const updatePreferences = useCallback((updates: Partial<VoicePreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('voice.preferences', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  /**
   * Request user consent for voice features
   */
  const requestConsent = useCallback(() => {
    const consent = window.confirm(
      'Morrow.AI can speak responses and listen to your voice commands. Allow voice features?'
    );
    updatePreferences({ consent, enabled: consent });
    return consent;
  }, [updatePreferences]);

  /**
   * Unsubscribe/disable voice features
   */
  const unsubscribe = useCallback(() => {
    updatePreferences({
      enabled: false,
      autoSpeak: false,
      consent: false
    });
  }, [updatePreferences]);

  return {
    preferences,
    updatePreferences,
    requestConsent,
    unsubscribe
  };
}
