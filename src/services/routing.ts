import type { RoutePlan, RouteResult, RouteLeg, VehicleType } from '../types';
import { geocode } from './nominatim';
import { osrmOptimizedTrip, type OsrmProfile } from './osrm';
import { fetchTomTomRoute } from './tomtom';
import { fetchValhallaRoute } from './valhalla';

const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

const USE_VALHALLA_FOR: Record<VehicleType, boolean> = {
  bike: true,
  escooter: true,
  scooter: false,
  car: false,
};

const STOP_SERVICE_SECONDS = 180;

const PROFILE: Record<VehicleType, OsrmProfile> = {
  bike: 'bike',
  escooter: 'bike',
  scooter: 'car',
  car: 'car',
};

function trafficMultiplier(date: Date, vehicle: VehicleType): number {
  const h = date.getHours() + date.getMinutes() / 60;
  const rush = (h >= 7.5 && h <= 9.5) || (h >= 17 && h <= 19.5) ? 1 : 0;
  const midDay = h >= 11.5 && h <= 13.5 ? 0.4 : 0;
  const intensity = Math.max(rush, midDay);
  const sensitivity: Record<VehicleType, number> = {
    bike: 0.05,
    escooter: 0.08,
    scooter: 0.25,
    car: 0.8,
  };
  return 1 + intensity * sensitivity[vehicle];
}

function parseTimeOnDay(base: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() < base.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function calculateRoute(plan: RoutePlan): Promise<RouteResult> {
  if (plan.stops.length === 0) {
    throw new Error('Aucun arrêt à router');
  }

  if (USE_VALHALLA_FOR[plan.vehicle]) {
    try {
      return await fetchValhallaRoute(plan);
    } catch (e) {
      if (!TOMTOM_KEY) throw e;
      return fetchTomTomRoute(plan, TOMTOM_KEY);
    }
  }

  if (TOMTOM_KEY) {
    return fetchTomTomRoute(plan, TOMTOM_KEY);
  }

  const originCoord = await geocode(plan.origin);
  const stopCoords = await Promise.all(plan.stops.map((s) => geocode(s.address)));
  const coords = [originCoord, ...stopCoords];

  const trip = await osrmOptimizedTrip(coords, PROFILE[plan.vehicle]);

  const orderedInputIndices = trip.orderOfInputs.slice(1);
  const orderedStops = orderedInputIndices.map((idx) => plan.stops[idx - 1]);

  let cursorAddr = plan.origin;
  let cursorTime = new Date(plan.departureAt);
  let totalDistance = 0;
  let totalBase = 0;
  let totalTraffic = 0;
  const legs: RouteLeg[] = [];

  for (let i = 0; i < trip.legs.length; i++) {
    const osrmLeg = trip.legs[i];
    const stop = orderedStops[i];
    const baseDur = osrmLeg.duration;
    const trafficDur = baseDur * trafficMultiplier(cursorTime, plan.vehicle);
    const travelArrival = new Date(cursorTime.getTime() + trafficDur * 1000);
    const target = parseTimeOnDay(plan.departureAt, stop.time);
    const arrivalAt = target && travelArrival < target ? target : travelArrival;

    legs.push({
      fromAddress: cursorAddr,
      toAddress: stop.address,
      distanceMeters: osrmLeg.distance,
      baseDurationSeconds: Math.round(baseDur),
      trafficDurationSeconds: Math.round(trafficDur),
      arrivalAt,
      geometry: [],
      instructions: [],
    });

    totalDistance += osrmLeg.distance;
    totalBase += baseDur;
    totalTraffic += trafficDur;
    cursorTime = new Date(arrivalAt.getTime() + STOP_SERVICE_SECONDS * 1000);
    cursorAddr = stop.address;
  }

  return {
    vehicle: plan.vehicle,
    departureAt: plan.departureAt,
    totalDistanceMeters: Math.round(totalDistance),
    totalDurationSeconds: Math.round(totalTraffic),
    totalTrafficDelaySeconds: Math.round(totalTraffic - totalBase),
    legs,
    orderedStopIds: orderedStops.map((s) => s.id),
  };
}
