import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coord, VehicleType } from '../types';

const KEY = 'app.settings.v1';

export type Settings = {
  onboarded: boolean;
  vehicle: VehicleType;
  cityName: string | null;
  cityCoord: Coord | null;
  voiceLang: string;
};

const DEFAULT: Settings = {
  onboarded: false,
  vehicle: 'scooter',
  cityName: null,
  cityCoord: null,
  voiceLang: 'es-ES',
};

export function useSettings() {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...DEFAULT, ...parsed });
        }
      } catch {
        /* noop */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
        /* noop */
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    AsyncStorage.removeItem(KEY).catch(() => {});
    setSettings(DEFAULT);
  }, []);

  return { loaded, settings, update, reset };
}
