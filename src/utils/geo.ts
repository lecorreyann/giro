import type { Coord } from '../types';

export function haversineMeters(a: Coord, b: Coord): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function projectOntoSegment(
  p: Coord,
  a: Coord,
  b: Coord,
): { coord: Coord; distance: number; t: number } {
  const cos = Math.cos((p.lat * Math.PI) / 180);
  const ax = a.lng * cos;
  const ay = a.lat;
  const bx = b.lng * cos;
  const by = b.lat;
  const px = p.lng * cos;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projection: Coord = {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
  return { coord: projection, distance: haversineMeters(p, projection), t };
}

export type PolylineProjection = {
  segmentIndex: number;
  projection: Coord;
  distanceFromRoute: number;
  distanceAlongMeters: number;
};

export function projectOntoPolyline(p: Coord, pts: Coord[]): PolylineProjection | null {
  if (pts.length < 2) return null;
  let best: PolylineProjection | null = null;
  let cumulative = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segLen = haversineMeters(a, b);
    const { coord, distance, t } = projectOntoSegment(p, a, b);
    const along = cumulative + segLen * t;
    if (best === null || distance < best.distanceFromRoute) {
      best = {
        segmentIndex: i,
        projection: coord,
        distanceFromRoute: distance,
        distanceAlongMeters: along,
      };
    }
    cumulative += segLen;
  }
  return best;
}
