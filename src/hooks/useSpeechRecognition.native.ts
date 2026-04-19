import { useCallback, useRef, useState } from 'react';

let mod: typeof import('expo-speech-recognition') | null = null;
try {
  mod = require('expo-speech-recognition');
} catch {
  mod = null;
}

const useNoopEvent = (_name: string, _handler: (e: unknown) => void) => {};
const useEvent = mod?.useSpeechRecognitionEvent ?? useNoopEvent;

const SILENCE_MS = 2000;

export function useSpeechRecognition(lang = 'es-ES') {
  const [isListening, setIsListening] = useState(false);
  const onResultRef = useRef<(text: string) => void>(() => {});
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supported = Boolean(mod);

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
        mod?.ExpoSpeechRecognitionModule.stop();
      } catch {
        /* noop */
      }
    }, SILENCE_MS);
  };

  useEvent('result', (event: unknown) => {
    const e = event as { results?: Array<{ transcript: string }> };
    const text = e.results?.[0]?.transcript ?? '';
    if (text) {
      onResultRef.current(text);
      armSilenceTimer();
    }
  });

  useEvent('end', () => {
    clearSilenceTimer();
    setIsListening(false);
  });

  useEvent('error', () => {
    clearSilenceTimer();
    setIsListening(false);
  });

  const start = useCallback(
    async (onResult: (text: string) => void) => {
      if (!mod) return;
      onResultRef.current = onResult;
      try {
        const perm = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) return;
        mod.ExpoSpeechRecognitionModule.start({
          lang,
          interimResults: true,
          continuous: true,
        });
        setIsListening(true);
        armSilenceTimer();
      } catch {
        /* noop */
      }
    },
    [lang],
  );

  const stop = useCallback(() => {
    if (!mod) return;
    try {
      mod.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* noop */
    }
  }, []);

  return { supported, isListening, start, stop };
}
