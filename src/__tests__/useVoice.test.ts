import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeech, useSpeechRecognition, useVoicePreferences } from '../hooks/useVoice';

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: () => {},
  cancel: () => {},
  pause: () => {},
  resume: () => {},
};

const mockSpeechRecognition = class {
  start() {}
  stop() {}
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult = null;
  onerror = null;
  onend = null;
};

describe('Voice Hooks', () => {
  describe('useVoicePreferences', () => {
    it('should initialize with default preferences', () => {
      const { result } = renderHook(() => useVoicePreferences());
      
      expect(result.current.preferences.enabled).toBe(false);
      expect(result.current.preferences.consent).toBe(false);
      expect(result.current.preferences.volume).toBe(0.8);
      expect(result.current.preferences.rate).toBe(1.0);
    });

    it('should update preferences', () => {
      const { result } = renderHook(() => useVoicePreferences());
      
      act(() => {
        result.current.updatePreferences({ enabled: true, volume: 0.5 });
      });
      
      expect(result.current.preferences.enabled).toBe(true);
      expect(result.current.preferences.volume).toBe(0.5);
    });

    it('should unsubscribe and disable all voice features', () => {
      const { result } = renderHook(() => useVoicePreferences());
      
      // Enable first
      act(() => {
        result.current.updatePreferences({ enabled: true, consent: true, autoSpeak: true });
      });
      
      // Unsubscribe
      act(() => {
        result.current.unsubscribe();
      });
      
      expect(result.current.preferences.enabled).toBe(false);
      expect(result.current.preferences.consent).toBe(false);
      expect(result.current.preferences.autoSpeak).toBe(false);
    });
  });

  describe('useSpeech', () => {
    it('should detect if speech synthesis is supported', () => {
      // Mock speechSynthesis
      (global as any).window = {
        speechSynthesis: mockSpeechSynthesis
      };
      
      const { result } = renderHook(() => useSpeech({ consent: true, enabled: true }));
      
      // In test environment, might not be supported
      expect(typeof result.current.isSupported).toBe('boolean');
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });
  });

  describe('useSpeechRecognition', () => {
    it('should provide speech recognition interface', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
      expect(typeof result.current.resetTranscript).toBe('function');
      expect(result.current.transcript).toBe('');
      expect(result.current.isListening).toBe(false);
    });

    it('should reset transcript', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      act(() => {
        result.current.resetTranscript();
      });
      
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBe(null);
    });
  });
});
