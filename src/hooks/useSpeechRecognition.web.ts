import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (e: {
    resultIndex: number;
    results: Array<Array<{ transcript: string }> & { isFinal: boolean }>;
  }) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const SILENCE_MS = 2000;

export function useSpeechRecognition(lang = 'es-ES') {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const onResultRef = useRef<(text: string) => void>(() => {});
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    }, SILENCE_MS);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const g = globalThis as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Ctor = g.SpeechRecognition ?? g.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = '';
    rec.onstart = () => {
      finalText = '';
      armSilenceTimer();
    };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0]?.transcript ?? '';
        if (e.results[i].isFinal) finalText += seg;
        else interim += seg;
      }
      const text = (finalText + interim).trim();
      if (text) {
        onResultRef.current(text);
        armSilenceTimer();
      }
    };
    rec.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
    };
    rec.onerror = () => {
      clearSilenceTimer();
      setIsListening(false);
    };
    recRef.current = rec;
    return () => {
      clearSilenceTimer();
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, [lang]);

  const start = useCallback((onResult: (text: string) => void) => {
    if (!recRef.current) return;
    onResultRef.current = onResult;
    try {
      recRef.current.start();
      setIsListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  return { supported, isListening, start, stop };
}
