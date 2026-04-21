import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  type Camera,
  type Region,
} from 'react-native-maps';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Defs, Polygon, RadialGradient, Stop as GradStop } from 'react-native-svg';
import { colors } from '../theme';
import { useDeviceHeading } from '../hooks/useDeviceHeading';
import type { Coord, RouteResult, Stop } from '../types';
import { bearingDeg, type PolylineProjection } from '../utils/geo';

type Props = {
  userLocation: Coord | null;
  result: RouteResult | null;
  stops: Stop[];
  activeLegIndex: number;
  fullscreen?: boolean;
  follow?: boolean;
  progress?: PolylineProjection | null;
  bottomInset?: number;
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
  bottomInset = 16,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [mapHeading, setMapHeading] = useState(0);
  const panTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInitRef = useRef(false);
  const deviceHeading = useDeviceHeading(Boolean(userLocation));

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
    if (!userLocation || !mapRef.current) return;
    const heading = deviceHeading ?? headingForLeg(userLocation) ?? 0;
    mapRef.current.animateCamera(
      {
        center: { latitude: userLocation.lat, longitude: userLocation.lng },
        heading,
      },
      { duration: 400 },
    );
  };

  useEffect(() => () => {
    if (panTimerRef.current) clearTimeout(panTimerRef.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      mapRef.current?.getCamera().then((cam) => {
        if (typeof cam.heading === 'number') {
          setMapHeading((prev) => (Math.abs(prev - cam.heading) > 0.5 ? cam.heading : prev));
        }
      }).catch(() => {});
    }, 200);
    return () => clearInterval(id);
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

  const headingForLeg = (fromLoc?: Coord | null): number | undefined => {
    if (!result) return undefined;
    const leg = result.legs[activeLegIndex];
    if (!leg || leg.geometry.length < 2) return undefined;
    if (progress) {
      const start = progress.projection;
      const next = leg.geometry[Math.min(progress.segmentIndex + 1, leg.geometry.length - 1)];
      if (next && (start.lat !== next.lat || start.lng !== next.lng)) {
        return bearingDeg(start, next);
      }
    }
    if (fromLoc) {
      const next = leg.geometry[1];
      if (next) return bearingDeg(fromLoc, next);
    }
    return bearingDeg(leg.geometry[0], leg.geometry[1]);
  };

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
      const heading = deviceHeading ?? headingForLeg(loc) ?? 0;
      mapRef.current?.animateCamera(
        {
          center: { latitude: loc.lat, longitude: loc.lng },
          pitch: PITCH_DEG,
          heading,
        },
        { duration: 200 },
      );
    }, 450);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (follow && userLocation) {
      if (isPaused) return;
      if (!cameraInitRef.current) {
        applyInitialCamera(userLocation);
        cameraInitRef.current = true;
        return;
      }
      const heading = deviceHeading ?? headingForLeg(userLocation) ?? 0;
      mapRef.current.animateCamera(
        {
          center: { latitude: userLocation.lat, longitude: userLocation.lng },
          heading,
        },
        { duration: 400 },
      );
      return;
    }
    const region = fitRegion(allPoints);
    if (region) mapRef.current.animateToRegion(region, 500);
  }, [allPoints, follow, userLocation, isPaused, progress, activeLegIndex, deviceHeading]);

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
          heading: headingForLeg(userLocation) ?? 0,
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
        showsUserLocation={false}
        showsMyLocationButton={!follow}
        showsCompass={false}
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
        {userLocation && deviceHeading !== null ? (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={500}
          >
            <View
              style={{
                width: 100,
                height: 160,
                transform: [
                  { rotate: `${((deviceHeading - mapHeading) % 360 + 360) % 360}deg` },
                ],
              }}
            >
              <Svg width={100} height={160} viewBox="0 0 100 160">
                <Defs>
                  <RadialGradient
                    id="headingCone"
                    cx="50"
                    cy="80"
                    r="80"
                    fx="50"
                    fy="80"
                    gradientUnits="userSpaceOnUse"
                  >
                    <GradStop offset="0" stopColor="#4285F4" stopOpacity="0" />
                    <GradStop offset="0.15" stopColor="#4285F4" stopOpacity="0.55" />
                    <GradStop offset="0.6" stopColor="#4285F4" stopOpacity="0.25" />
                    <GradStop offset="1" stopColor="#4285F4" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Polygon points="2,6 98,6 50,80" fill="url(#headingCone)" />
              </Svg>
            </View>
          </Marker>
        ) : null}
        {userLocation ? (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={600}
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        ) : null}
      </MapView>
      {follow && isPaused ? (
        <Pressable
          onPress={recenter}
          style={[styles.recenterBtn, { bottom: bottomInset + 12 }]}
          hitSlop={8}
          accessibilityLabel="Recentrer"
        >
          <Feather name="navigation" size={22} color={colors.text} />
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
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  userDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4285F4',
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 1000,
  },
});
