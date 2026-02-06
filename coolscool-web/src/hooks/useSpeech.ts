import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechOptions {
  rate?: number;      // Speech rate (0.5-2, default 0.8 for kids)
  pitch?: number;     // Voice pitch (0-2, default 1)
  volume?: number;    // Volume (0-1, default 1)
  lang?: string;      // Language (default 'en-US')
}

export interface UseSpeechReturn {
  speak: (text: string) => void;
  speakSequence: (texts: string[], pauseMs?: number) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

// Check if we're on iOS
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// Check if we're on Android
const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

export function useSpeech(options?: UseSpeechOptions): UseSpeechReturn {
  const {
    rate = 0.8,
    pitch = 1,
    volume = 1,
    lang = 'en-US',
  } = options || {};

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const sequenceAbortRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load voices (needed for some mobile browsers)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    // Try to load voices immediately
    loadVoices();

    // Also listen for voiceschanged event (needed for Chrome/Android)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Chrome mobile bug: speech synthesis can pause indefinitely
  // This workaround resumes it periodically while speaking
  useEffect(() => {
    if (!isSupported || !isSpeaking) return;

    // Only apply workaround on mobile Chrome/Android
    if (!isAndroid) return;

    const resumeInterval = setInterval(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 3000);

    return () => clearInterval(resumeInterval);
  }, [isSupported, isSpeaking]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    sequenceAbortRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, pitch, volume, lang]);

  const speakSequence = useCallback(async (texts: string[], pauseMs: number = 500): Promise<void> => {
    if (!isSupported || texts.length === 0) return;

    sequenceAbortRef.current = false;

    for (const text of texts) {
      if (sequenceAbortRef.current) break;

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        utterance.lang = lang;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      });

      if (sequenceAbortRef.current) break;

      // Pause between texts
      if (pauseMs > 0) {
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, pauseMs);
          // Check abort during pause
          const checkAbort = setInterval(() => {
            if (sequenceAbortRef.current) {
              clearTimeout(timeoutId);
              clearInterval(checkAbort);
              resolve();
            }
          }, 50);
          setTimeout(() => clearInterval(checkAbort), pauseMs + 100);
        });
      }
    }

    setIsSpeaking(false);
  }, [isSupported, rate, pitch, volume, lang]);

  // Listen for 'quiz:stop-speech' custom event to stop speech (for cleanup on navigation)
  useEffect(() => {
    const handleStop = () => stop();
    window.addEventListener('quiz:stop-speech', handleStop);
    return () => window.removeEventListener('quiz:stop-speech', handleStop);
  }, [stop]);

  // Cleanup on unmount - cancel any pending speech
  useEffect(() => {
    return () => {
      if (isSupported) {
        sequenceAbortRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    speakSequence,
    stop,
    isSpeaking,
    isSupported,
  };
}
