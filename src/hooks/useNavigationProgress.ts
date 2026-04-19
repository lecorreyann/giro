import { useEffect, useRef, useState } from 'react';
import type { Coord, RouteResult } from '../types';
import { haversineMeters, projectOntoPolyline, type PolylineProjection } from '../utils/geo';

const INSTRUCTION_ADVANCE_M = 30;
const LEG_ADVANCE_M = 40;
const OFF_ROUTE_M = 60;
const OFF_ROUTE_SUSTAIN_MS = 5000;
const REROUTE_COOLDOWN_MS = 15_000;

type Args = {
  result: RouteResult | null;
  enabled: boolean;
  userLocation: Coord | null;
  activeLegIndex: number;
  onLegAdvance: (nextIndex: number) => void;
  onOffRoute?: () => void;
};

type Progress = {
  instructionIndex: number;
  projection: PolylineProjection | null;
  isOffRoute: boolean;
};

export function useNavigationProgress({
  result,
  enabled,
  userLocation,
  activeLegIndex,
  onLegAdvance,
  onOffRoute,
}: Args): Progress {
  const [instructionIdx, setInstructionIdx] = useState(0);
  const [projection, setProjection] = useState<PolylineProjection | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const offRouteSinceRef = useRef<number | null>(null);
  const lastRerouteAtRef = useRef<number>(0);
  const legAdvanceRef = useRef(onLegAdvance);
  const offRouteRef = useRef(onOffRoute);

  useEffect(() => {
    legAdvanceRef.current = onLegAdvance;
    offRouteRef.current = onOffRoute;
  });

  useEffect(() => {
    setInstructionIdx(0);
    setProjection(null);
    setIsOffRoute(false);
    offRouteSinceRef.current = null;
  }, [activeLegIndex, result]);

  useEffect(() => {
    if (!enabled || !result || !userLocation) return;
    const leg = result.legs[activeLegIndex];
    if (!leg) return;

    const proj = projectOntoPolyline(userLocation, leg.geometry);
    setProjection((prev) => {
      if (
        prev &&
        proj &&
        prev.segmentIndex === proj.segmentIndex &&
        Math.abs(prev.distanceAlongMeters - proj.distanceAlongMeters) < 1 &&
        Math.abs(prev.distanceFromRoute - proj.distanceFromRoute) < 1
      ) {
        return prev;
      }
      return proj;
    });

    const next = leg.instructions[instructionIdx + 1];
    if (next?.coord) {
      const d = haversineMeters(userLocation, next.coord);
      if (d < INSTRUCTION_ADVANCE_M) {
        setInstructionIdx((i) => i + 1);
      }
    }

    const lastPt = leg.geometry[leg.geometry.length - 1];
    if (lastPt && activeLegIndex < result.legs.length - 1) {
      const d = haversineMeters(userLocation, lastPt);
      if (d < LEG_ADVANCE_M) {
        legAdvanceRef.current(activeLegIndex + 1);
        return;
      }
    }

    if (proj && proj.distanceFromRoute > OFF_ROUTE_M) {
      if (!offRouteSinceRef.current) offRouteSinceRef.current = Date.now();
      const sustainedMs = Date.now() - offRouteSinceRef.current;
      if (sustainedMs > OFF_ROUTE_SUSTAIN_MS) {
        setIsOffRoute(true);
        const sinceReroute = Date.now() - lastRerouteAtRef.current;
        if (sinceReroute > REROUTE_COOLDOWN_MS) {
          lastRerouteAtRef.current = Date.now();
          offRouteSinceRef.current = null;
          offRouteRef.current?.();
        }
      }
    } else {
      if (offRouteSinceRef.current !== null) offRouteSinceRef.current = null;
      setIsOffRoute((prev) => (prev ? false : prev));
    }
  }, [userLocation, enabled, result, activeLegIndex, instructionIdx]);

  return { instructionIndex: instructionIdx, projection, isOffRoute };
}
