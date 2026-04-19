import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  type Camera,
  type Region,
} from 'react-native-maps';
import type { Coord, RouteResult, Stop } from '../types';
import type { PolylineProjection } from '../utils/geo';

type Props = {
  userLocation: Coord | null;
  result: RouteResult | null;
  stops: Stop[];
  activeLegIndex: number;
  fullscreen?: boolean;
  follow?: boolean;
  progress?: PolylineProjection | null;
};

function fitRegion(points: Coord[]): Region | null {
  if (points.length === 0) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latDelta = Math.max(0.005, (maxLat - minLat) * 1.3);
  const lngDelta = Math.max(0.005, (maxLng - minLng) * 1.3);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

const PAN_PAUSE_MS = 6000;
const ZOOM_LEVEL = 16.5;
const PITCH_DEG = 30;

export function RouteMap({
  userLocation,
  result,
  stops,
  activeLegIndex,
  fullscreen,
  follow,
  progress,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [isPaused, setIsPaused] = useState(false);
  const panTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInitRef = useRef(false);

  useEffect(() => {
    if (!follow) cameraInitRef.current = false;
  }, [follow]);

  const pauseFollow = () => {
    if (!follow) return;
    setIsPaused(true);
    if (panTimerRef.current) clearTimeout(panTimerRef.current);
    panTimerRef.current = setTimeout(() => setIsPaused(false), PAN_PAUSE_MS);
  };

  const recenter = () => {
    if (panTimerRef.current) clearTimeout(panTimerRef.current);
    setIsPaused(false);
    if (userLocation) applyInitialCamera(userLocation);
  };

  useEffect(() => () => {
    if (panTimerRef.current) clearTimeout(panTimerRef.current);
  }, []);

  const allPoints = useMemo<Coord[]>(() => {
    const pts: Coord[] = [];
    if (userLocation) pts.push(userLocation);
    if (result) {
      for (const leg of result.legs) {
        for (const p of leg.geometry) pts.push(p);
      }
    }
    return pts;
  }, [userLocation, result]);

  const applyInitialCamera = (loc: Coord) => {
    if (!mapRef.current) return;
    const delta = 360 / Math.pow(2, ZOOM_LEVEL);
    mapRef.current.animateToRegion(
      {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400,
    );
    setTimeout(() => {
      mapRef.current?.animateCamera(
        {
          center: { latitude: loc.lat, longitude: loc.lng },
          pitch: PITCH_DEG,
        },
        { duration: 200 },
      );
    }, 450);
  };

  useEffect(() => {
    if (follow && userLocation && mapRef.current) {
      if (isPaused) return;
      if (!cameraInitRef.current) {
        applyInitialCamera(userLocation);
        cameraInitRef.current = true;
      } else {
        mapRef.current.animateCamera(
          {
            center: { latitude: userLocation.lat, longitude: userLocation.lng },
          },
          { duration: 400 },
        );
      }
      return;
    }
    const region = fitRegion(allPoints);
    if (region && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  }, [allPoints, follow, userLocation, isPaused]);

  const initialRegion: Region = fitRegion(allPoints) ?? {
    latitude: userLocation?.lat ?? 39.47,
    longitude: userLocation?.lng ?? -0.38,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const initialCamera: Camera | undefined =
    follow && userLocation
      ? {
          center: { latitude: userLocation.lat, longitude: userLocation.lng },
          zoom: ZOOM_LEVEL,
          pitch: PITCH_DEG,
          heading: 0,
          altitude: 0,
        }
      : undefined;

  const orderedStops = result
    ? result.orderedStopIds
        .map((id) => stops.find((s) => s.id === id))
        .filter((s): s is Stop => Boolean(s))
    : [];

  const trimmedActiveLeg = useMemo<Coord[] | null>(() => {
    if (!result || !progress) return null;
    const leg = result.legs[activeLegIndex];
    if (!leg || leg.geometry.length < 2) return null;
    const remaining = leg.geometry.slice(progress.segmentIndex + 1);
    return [progress.projection, ...remaining];
  }, [result, activeLegIndex, progress]);

  return (
    <View style={[styles.wrap, fullscreen && styles.fullscreen]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialCamera ? undefined : initialRegion}
        initialCamera={initialCamera}
        showsUserLocation
        showsMyLocationButton={!follow}
        toolbarEnabled={false}
        onPanDrag={pauseFollow}
        onRegionChange={(_region, details) => {
          if (follow && details?.isGesture) pauseFollow();
        }}
        onMapReady={() => {
          if (follow && userLocation && !cameraInitRef.current) {
            applyInitialCamera(userLocation);
            cameraInitRef.current = true;
          }
        }}
      >
        {result?.legs.map((leg, idx) => {
          if (leg.geometry.length < 2) return null;
          const isActive = idx === activeLegIndex;
          const isNext = idx === activeLegIndex + 1;
          if (!isActive && !isNext) return null;
          const coords =
            isActive && trimmedActiveLeg
              ? trimmedActiveLeg.map((p) => ({ latitude: p.lat, longitude: p.lng }))
              : leg.geometry.map((p) => ({ latitude: p.lat, longitude: p.lng }));
          if (coords.length < 2) return null;
          return (
            <Polyline
              key={idx}
              coordinates={coords}
              strokeColor={isActive ? '#1570EF' : '#94A3B8'}
              strokeWidth={isActive ? 7 : 3}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={isActive ? undefined : [6, 6]}
            />
          );
        })}
        {orderedStops.map((stop, idx) => {
          const leg = result?.legs[idx];
          const last = leg?.geometry[leg.geometry.length - 1];
          if (!last) return null;
          const isActive = idx === activeLegIndex;
          const isDone = idx < activeLegIndex;
          const color = isActive ? '#1570EF' : isDone ? '#98A2B3' : '#111827';
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: last.lat, longitude: last.lng }}
              title={stop.address}
              description={`Arrêt ${idx + 1}`}
              pinColor={color}
            />
          );
        })}
      </MapView>
      {follow && isPaused ? (
        <Pressable onPress={recenter} style={styles.recenterBtn}>
          <Text style={styles.recenterTxt}>📍 Recentrer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 340,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  fullscreen: {
    flex: 1,
    height: undefined,
    borderRadius: 0,
    borderWidth: 0,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 260,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#1570EF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
  },
  recenterTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
