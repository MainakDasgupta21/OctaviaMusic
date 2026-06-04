// =============================================================================
// `useVoiceSearch` — thin wrapper around the Web Speech API. Returns a stable
// `start` / `stop` pair plus the latest transcript and a hard `isSupported`
// flag so callers can hide the mic button entirely when the browser lacks
// the API (Firefox, older Safari, etc).
//
// The hook never throws on unsupported browsers — it just resolves
// `isSupported: false` and turns `start` into a noop.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const getSpeechRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useVoiceSearch = ({
  lang = 'en-US',
  interimResults = false,
  continuous = false,
  onTranscript,
} = {}) => {
  const Ctor = useMemo(() => getSpeechRecognitionCtor(), []);
  const isSupported = Boolean(Ctor);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  // Keep the latest callback in a ref so the recognition instance can be
  // long-lived without leaking stale closures.
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Ctor) return undefined;
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = interimResults;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      // Concatenate any final results in this event; ignore interim if
      // `interimResults: false` (we still emit final).
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || '';
        }
      }
      const next = finalTranscript.trim();
      if (next) {
        setTranscript(next);
        onTranscriptRef.current?.(next);
      }
    };
    recognition.onerror = (event) => {
      setError(event?.error || 'unknown');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [Ctor, lang, interimResults, continuous]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError(null);
    setTranscript('');
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // `start()` throws if already running — silently ignore.
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* noop */
    }
    setIsListening(false);
  }, []);

  return {
    start,
    stop,
    transcript,
    isListening,
    isSupported,
    error,
  };
};

export default useVoiceSearch;
