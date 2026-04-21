import type { Coord, RoutePlan, RouteResult, RouteLeg, Stop, VehicleType } from '../types';
import { decodePolyline } from '../utils/polyline';
import { greedyOrder, tomtomGeocode, type OrderItem } from './tomtom';
import { geocode as nominatimGeocode } from './nominatim';

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

const COSTING: Record<VehicleType, string> = {
  bike: 'bicycle',
  escooter: 'bicycle',
  scooter: 'motorcycle',
  car: 'auto',
};

const SERVICE_SECONDS = 180;

function valhallaManeuverCode(type: number): string {
  switch (type) {
    case 1: case 2: case 3: return 'DEPART';
    case 4: case 5: case 6: return 'ARRIVE';
    case 8: case 17: case 22: return 'STRAIGHT';
    case 9: case 18: return 'BEAR_RIGHT';
    case 10: return 'TURN_RIGHT';
    case 11: return 'SHARP_RIGHT';
    case 12: return 'U_TURN_RIGHT';
    case 13: return 'U_TURN_LEFT';
    case 14: return 'SHARP_LEFT';
    case 15: return 'TURN_LEFT';
    case 16: case 19: return 'BEAR_LEFT';
    case 20: case 23: return 'KEEP_RIGHT';
    case 21: case 24: return 'KEEP_LEFT';
    case 26: case 27: return 'ROUNDABOUT_RIGHT';
    default: return 'STRAIGHT';
  }
}

type ValhallaManeuver = {
  instruction: string;
  begin_shape_index: number;
  type: number;
  length: number;
  time: number;
};

type ValhallaLeg = {
  shape: string;
  summary: { length: number; time: number };
  maneuvers?: ValhallaManeuver[];
};

type ValhallaResponse = {
  trip: {
    legs: ValhallaLeg[];
    summary: { length: number; time: number };
  };
};

async function geocodeWithFallback(address: string): Promise<Coord> {
  const tomtomKey = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;
  if (tomtomKey) return tomtomGeocode(address, tomtomKey);
  return nominatimGeocode(address);
}

export async function fetchValhallaRoute(plan: RoutePlan): Promise<RouteResult> {
  if (plan.stops.length === 0) throw new Error('Aucun arrêt à router');

  const originCoord = plan.originCoord ?? (await geocodeWithFallback(plan.origin));
  const stopCoords = await Promise.all(
    plan.stops.map((s) => (s.coord ? Promise.resolve(s.coord) : geocodeWithFallback(s.address))),
  );

  const withCoords: OrderItem[] = plan.stops.map((stop, i) => ({ stop, coord: stopCoords[i] }));
  const orderedWithCoords = plan.preserveOrder
    ? withCoords
    : greedyOrder(originCoord, withCoords, plan.vehicle, plan.departureAt);
  const orderedStops = orderedWithCoords.map((x) => x.stop);
  const coords = [originCoord, ...orderedWithCoords.map((x) => x.coord)];

  const body = {
    locations: coords.map((c) => ({ lat: c.lat, lon: c.lng, type: 'break' as const })),
    costing: COSTING[plan.vehicle],
    costing_options: {
      bicycle: {
        bicycle_type: 'city',
        use_roads: 0.3,
        use_hills: 0.5,
        avoid_bad_surfaces: 0.75,
      },
    },
    directions_options: { units: 'kilometers', language: (plan.language ?? 'fr-FR').slice(0, 2) },
    shape_format: 'polyline6',
  };

  const res = await fetch(VALHALLA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Valhalla HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as ValhallaResponse;
  if (!data.trip?.legs?.length) throw new Error('Valhalla: aucune route retournée');

  let cursorTime = new Date(plan.departureAt);
  let cursorAddr = plan.origin;
  let totalDistance = 0;
  let totalDuration = 0;
  const legs: RouteLeg[] = [];

  data.trip.legs.forEach((leg, i) => {
    const stop = orderedStops[i];
    const geometry = decodePolyline(leg.shape, 6);
    const distanceMeters = leg.summary.length * 1000;
    const durationSeconds = leg.summary.time;
    const arrival = new Date(cursorTime.getTime() + durationSeconds * 1000);

    const instructions = (leg.maneuvers ?? []).map((m) => {
      const pt = geometry[m.begin_shape_index];
      return {
        text: m.instruction,
        maneuver: valhallaManeuverCode(m.type),
        coord: pt,
        routeOffsetMeters: 0,
      };
    });

    let cumul = 0;
    for (let k = 0; k < (leg.maneuvers ?? []).length; k++) {
      instructions[k].routeOffsetMeters = cumul;
      cumul += (leg.maneuvers![k].length ?? 0) * 1000;
    }

    legs.push({
      fromAddress: cursorAddr,
      toAddress: stop.address,
      distanceMeters: Math.round(distanceMeters),
      baseDurationSeconds: Math.round(durationSeconds),
      trafficDurationSeconds: Math.round(durationSeconds),
      arrivalAt: arrival,
      geometry,
      instructions,
    });

    totalDistance += distanceMeters;
    totalDuration += durationSeconds;
    cursorTime = new Date(arrival.getTime() + SERVICE_SECONDS * 1000);
    cursorAddr = stop.address;
  });

  return {
    vehicle: plan.vehicle,
    departureAt: plan.departureAt,
    totalDistanceMeters: Math.round(totalDistance),
    totalDurationSeconds: Math.round(totalDuration),
    totalTrafficDelaySeconds: 0,
    legs,
    orderedStopIds: orderedStops.map((s) => s.id),
  };
}
