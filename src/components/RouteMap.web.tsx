import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { Coord, RouteResult, Stop } from '../types';

type Props = {
  userLocation: Coord | null;
  result: RouteResult | null;
  stops: Stop[];
  activeLegIndex: number;
  fullscreen?: boolean;
};

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function WebMap({ userLocation, result, stops, activeLegIndex, fullscreen }: Props) {
  const { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } = require('react-leaflet');
  const L = require('leaflet');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
  }, []);

  const icons = useMemo(() => {
    const make = (text: string, bg: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:#fff;font-weight:700;width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);font-family:sans-serif;font-size:13px">${text}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    const user = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:8px;background:#1570EF;border:3px solid #fff;box-shadow:0 0 0 3px rgba(21,112,239,.35)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    return { make, user };
  }, [L]);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : result?.legs[0]?.geometry[0]
      ? [result.legs[0].geometry[0].lat, result.legs[0].geometry[0].lng]
      : [46.603, 1.888];

  const orderedStops = result
    ? result.orderedStopIds.map((id) => stops.find((s) => s.id === id)!).filter(Boolean)
    : [];

  const allCoords: Array<[number, number]> =
    result?.legs.flatMap((l) => l.geometry.map((p) => [p.lat, p.lng] as [number, number])) ?? [];

  function FitBounds() {
    const map = useMap();
    useEffect(() => {
      const pts: Array<[number, number]> = [];
      if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
      pts.push(...allCoords);
      if (pts.length >= 2) {
        map.fitBounds(pts, { padding: [30, 30] });
      } else if (pts.length === 1) {
        map.setView(pts[0], 14);
      }
    }, [map]);
    return null;
  }

  return (
    <View style={[styles.mapWrap, fullscreen && styles.mapFullscreen]}>
      {/* @ts-expect-error react-leaflet dynamic require */}
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: fullscreen ? '100%' : 340, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds />
        {userLocation ? (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={icons.user}>
            <Popup>Ma position</Popup>
          </Marker>
        ) : null}
        {result?.legs.map((leg, idx) => {
          const positions = leg.geometry.map((p) => [p.lat, p.lng] as [number, number]);
          if (positions.length < 2) return null;
          const isActive = idx === activeLegIndex;
          const isDone = idx < activeLegIndex;
          return (
            <Polyline
              key={idx}
              positions={positions}
              pathOptions={{
                color: isActive ? '#1570EF' : isDone ? '#98A2B3' : '#111827',
                weight: isActive ? 6 : 4,
                opacity: isDone ? 0.5 : 1,
              }}
            />
          );
        })}
        {orderedStops.map((stop, idx) => {
          const leg = result?.legs[idx];
          const coord = leg?.geometry[leg.geometry.length - 1];
          if (!coord) return null;
          const color = idx === activeLegIndex ? '#1570EF' : idx < activeLegIndex ? '#98A2B3' : '#111827';
          return (
            <Marker
              key={stop.id}
              position={[coord.lat, coord.lng]}
              icon={icons.make(String(idx + 1), color)}
            >
              <Popup>{stop.address}</Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </View>
  );
}

export function RouteMap(props: Props) {
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.mapWrap, styles.placeholder]}>
        <Text style={styles.placeholderText}>Carte disponible sur la version web</Text>
      </View>
    );
  }
  return <WebMap {...props} />;
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  mapFullscreen: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
  },
  placeholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#667085' },
});
