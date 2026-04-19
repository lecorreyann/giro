import type { Coord } from './nominatim';

export type OsrmProfile = 'car' | 'bike' | 'foot';

type OsrmLeg = {
  distance: number;
  duration: number;
};

type OsrmTrip = {
  legs: OsrmLeg[];
  distance: number;
  duration: number;
};

type OsrmWaypoint = {
  waypoint_index: number;
  trips_index: number;
  location: [number, number];
};

type OsrmResponse = {
  code: string;
  message?: string;
  trips: OsrmTrip[];
  waypoints: OsrmWaypoint[];
};

export type OsrmTripResult = {
  orderOfInputs: number[];
  legs: OsrmLeg[];
  totalDistance: number;
  totalDuration: number;
};

export async function osrmOptimizedTrip(
  coords: Coord[],
  profile: OsrmProfile,
): Promise<OsrmTripResult> {
  const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url =
    `https://router.project-osrm.org/trip/v1/${profile}/${path}` +
    `?source=first&destination=last&roundtrip=false&overview=false&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = (await res.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.trips[0]) {
    throw new Error(`OSRM: ${data.code}${data.message ? ` — ${data.message}` : ''}`);
  }

  const orderOfInputs: number[] = new Array(coords.length).fill(-1);
  data.waypoints.forEach((wp, inputIdx) => {
    orderOfInputs[wp.waypoint_index] = inputIdx;
  });

  const trip = data.trips[0];
  return {
    orderOfInputs,
    legs: trip.legs,
    totalDistance: trip.distance,
    totalDuration: trip.duration,
  };
}
