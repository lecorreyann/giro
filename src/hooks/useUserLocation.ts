import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coord } from '../types';

export function useUserLocation(): Coord | null {
  const [coord, setCoord] = useState<Coord | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (!cancelled && last) {
          setCoord({ lat: last.coords.latitude, lng: last.coords.longitude });
        }
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (pos) => {
            if (!cancelled) {
              setCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          },
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return coord;
}
