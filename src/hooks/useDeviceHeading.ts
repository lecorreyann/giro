import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export function useDeviceHeading(enabled: boolean = true): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHeading(null);
      return;
    }
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' || cancelled) return;
      sub = await Location.watchHeadingAsync((h) => {
        const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (v >= 0) setHeading(v);
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return heading;
}
