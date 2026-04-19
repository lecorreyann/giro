import type { Coord, RoutePlan, RouteResult, RouteLeg, Stop, TurnInstruction, VehicleType } from '../types';
import { haversineMeters } from '../utils/geo';

type TomTomTravelMode = 'car' | 'motorcycle' | 'bicycle' | 'pedestrian';

const TRAVEL_MODE: Record<VehicleType, TomTomTravelMode> = {
  bike: 'bicycle',
  escooter: 'bicycle',
  scooter: 'motorcycle',
  car: 'car',
};

const VEHICLE_SPEED_MS: Record<VehicleType, number> = {
  bike: (16 * 1000) / 3600,
  escooter: (20 * 1000) / 3600,
  scooter: (35 * 1000) / 3600,
  car: (40 * 1000) / 3600,
};

const SERVICE_SECONDS = 180;
const LATE_PENALTY = 5;
const EARLY_PENALTY = 1;

type OrderItem = { stop: Stop; coord: Coord };

function routeCost(
  sequence: OrderItem[],
  originCoord: Coord,
  vehicle: VehicleType,
  departureAt: Date,
): number {
  const speed = VEHICLE_SPEED_MS[vehicle];
  let cost = 0;
  let cursor = originCoord;
  let cursorTime = new Date(departureAt);
  for (const it of sequence) {
    const travelS = haversineMeters(cursor, it.coord) / speed;
    const arrival = new Date(cursorTime.getTime() + travelS * 1000);
    const target = parseTimeOnDay(departureAt, it.stop.time);
    cost += travelS;
    if (target) {
      const lateS = Math.max(0, (arrival.getTime() - target.getTime()) / 1000);
      const earlyS = Math.max(0, (target.getTime() - arrival.getTime()) / 1000);
      cost += LATE_PENALTY * lateS + EARLY_PENALTY * earlyS;
    }
    const effectiveArrival = target && arrival < target ? target : arrival;
    cursorTime = new Date(effectiveArrival.getTime() + SERVICE_SECONDS * 1000);
    cursor = it.coord;
  }
  return cost;
}

function greedySeed(
  originCoord: Coord,
  items: OrderItem[],
  vehicle: VehicleType,
  departureAt: Date,
): OrderItem[] {
  const speed = VEHICLE_SPEED_MS[vehicle];
  const remaining = [...items];
  const ordered: OrderItem[] = [];
  let cursor = originCoord;
  let cursorTime = new Date(departureAt);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    remaining.forEach((it, i) => {
      const travelS = haversineMeters(cursor, it.coord) / speed;
      const arrival = new Date(cursorTime.getTime() + travelS * 1000);
      const target = parseTimeOnDay(departureAt, it.stop.time);
      let score = travelS;
      if (target) {
        const lateS = Math.max(0, (arrival.getTime() - target.getTime()) / 1000);
        const earlyS = Math.max(0, (target.getTime() - arrival.getTime()) / 1000);
        score += LATE_PENALTY * lateS + EARLY_PENALTY * earlyS;
      }
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    const chosen = remaining.splice(bestIdx, 1)[0];
    const travelS = haversineMeters(cursor, chosen.coord) / speed;
    const rawArrival = new Date(cursorTime.getTime() + travelS * 1000);
    const target = parseTimeOnDay(departureAt, chosen.stop.time);
    const effectiveArrival = target && rawArrival < target ? target : rawArrival;
    cursorTime = new Date(effectiveArrival.getTime() + SERVICE_SECONDS * 1000);
    cursor = chosen.coord;
    ordered.push(chosen);
  }
  return ordered;
}

function localOptimize(
  initial: OrderItem[],
  originCoord: Coord,
  vehicle: VehicleType,
  departureAt: Date,
): OrderItem[] {
  if (initial.length < 2) return initial;
  let best = [...initial];
  let bestCost = routeCost(best, originCoord, vehicle, departureAt);
  let improved = true;
  let iterations = 0;
  const MAX_ITER = 30;

  while (improved && iterations < MAX_ITER) {
    improved = false;
    iterations++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        const cost = routeCost(candidate, originCoord, vehicle, departureAt);
        if (cost < bestCost - 0.001) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return best;
}

function greedyOrder(
  originCoord: Coord,
  items: OrderItem[],
  vehicle: VehicleType,
  departureAt: Date,
): OrderItem[] {
  const seed = greedySeed(originCoord, items, vehicle, departureAt);
  return localOptimize(seed, originCoord, vehicle, departureAt);
}

type GeocodeResponse = {
  results: Array<{ position: { lat: number; lon: number } }>;
};

async function tomtomGeocode(address: string, apiKey: string): Promise<Coord> {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?limit=1&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TomTom geocode HTTP ${res.status}`);
  const data = (await res.json()) as GeocodeResponse;
  if (!data.results?.[0]) throw new Error(`Adresse introuvable : ${address}`);
  const { lat, lon } = data.results[0].position;
  return { lat, lng: lon };
}

type RouteResponse = {
  routes: Array<{
    legs: Array<{
      summary: {
        lengthInMeters: number;
        travelTimeInSeconds: number;
        trafficDelayInSeconds: number;
        noTrafficTravelTimeInSeconds: number;
        departureTime: string;
        arrivalTime: string;
      };
      points?: Array<{ latitude: number; longitude: number }>;
    }>;
    guidance?: {
      instructions: Array<{
        pointIndex: number;
        routeOffsetInMeters: number;
        point?: { latitude: number; longitude: number };
        maneuver?: string;
        message?: string;
        street?: string;
      }>;
    };
  }>;
};

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function fetchTomTomRoute(
  plan: RoutePlan,
  apiKey: string,
): Promise<RouteResult> {
  if (plan.stops.length === 0) throw new Error('Aucun arrêt à router');

  const originCoord = plan.originCoord ?? (await tomtomGeocode(plan.origin, apiKey));
  const stopCoords = await Promise.all(
    plan.stops.map((s) => (s.coord ? Promise.resolve(s.coord) : tomtomGeocode(s.address, apiKey))),
  );
  const withCoords = plan.stops.map((stop, i) => ({ stop, coord: stopCoords[i] }));
  const orderedWithCoords = plan.preserveOrder
    ? withCoords
    : greedyOrder(originCoord, withCoords, plan.vehicle, plan.departureAt);
  const orderedStops = orderedWithCoords.map((x) => x.stop);
  const coords = [originCoord, ...orderedWithCoords.map((x) => x.coord)];

  const locPath = coords.map((c) => `${c.lat},${c.lng}`).join(':');
  const params = new URLSearchParams({
    key: apiKey,
    travelMode: TRAVEL_MODE[plan.vehicle],
    traffic: 'true',
    routeType: 'fastest',
    departAt: toIso(plan.departureAt),
    instructionsType: 'text',
    language: 'es-ES',
  });

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${locPath}/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TomTom routing HTTP ${res.status} — ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as RouteResponse;
  const route = data.routes?.[0];
  if (!route) throw new Error('TomTom: aucune route retournée');

  let cursorAddr = plan.origin;
  let cursorTime = new Date(plan.departureAt);
  let totalDistance = 0;
  let totalDuration = 0;
  let totalDelay = 0;
  const legs: RouteLeg[] = [];

  const legPointOffsets: number[] = [];
  let acc = 0;
  route.legs.forEach((l) => {
    legPointOffsets.push(acc);
    acc += l.points?.length ?? 0;
  });
  const legEnds = [...legPointOffsets.slice(1), acc];

  const instructions = route.guidance?.instructions ?? [];
  const instructionsByLeg: TurnInstruction[][] = route.legs.map(() => []);
  instructions.forEach((inst) => {
    const legIdx = legEnds.findIndex((end) => inst.pointIndex < end);
    const targetIdx = legIdx === -1 ? instructionsByLeg.length - 1 : legIdx;
    instructionsByLeg[targetIdx]?.push({
      text: inst.message ?? inst.street ?? inst.maneuver ?? '',
      maneuver: inst.maneuver,
      coord: inst.point ? { lat: inst.point.latitude, lng: inst.point.longitude } : undefined,
      routeOffsetMeters: inst.routeOffsetInMeters,
    });
  });

  route.legs.forEach((leg, i) => {
    const stop = orderedStops[i];
    const { lengthInMeters, travelTimeInSeconds, trafficDelayInSeconds, noTrafficTravelTimeInSeconds } =
      leg.summary;
    const travelArrival = new Date(cursorTime.getTime() + travelTimeInSeconds * 1000);
    const target = parseTimeOnDay(plan.departureAt, stop.time);
    const arrivalAt = target && travelArrival < target ? target : travelArrival;

    const geometry: Coord[] = (leg.points ?? []).map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
    }));

    legs.push({
      fromAddress: cursorAddr,
      toAddress: stop.address,
      distanceMeters: lengthInMeters,
      baseDurationSeconds: noTrafficTravelTimeInSeconds,
      trafficDurationSeconds: travelTimeInSeconds,
      arrivalAt,
      geometry,
      instructions: instructionsByLeg[i] ?? [],
    });

    totalDistance += lengthInMeters;
    totalDuration += travelTimeInSeconds;
    totalDelay += trafficDelayInSeconds;
    cursorTime = new Date(arrivalAt.getTime() + 180 * 1000);
    cursorAddr = stop.address;
  });

  return {
    vehicle: plan.vehicle,
    departureAt: plan.departureAt,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
    totalTrafficDelaySeconds: totalDelay,
    legs,
    orderedStopIds: orderedStops.map((s) => s.id),
  };
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
