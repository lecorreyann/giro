import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { PlanView } from './PlanView';
import { NavigationView } from './NavigationView';
import { OnboardingScreen } from './OnboardingScreen';
import { SettingsScreen } from './SettingsScreen';
import { calculateRoute } from '../services/routing';
import { useUserLocation } from '../hooks/useUserLocation';
import { useNavigationProgress } from '../hooks/useNavigationProgress';
import { useSettings } from '../hooks/useSettings';
import type { Coord, RouteResult, Stop, VehicleType } from '../types';

function roundUpToStep(date: Date, stepMin = 5): Date {
  const d = new Date(date);
  const m = d.getMinutes();
  const add = (stepMin - (m % stepMin)) % stepMin;
  d.setMinutes(m + add, 0, 0);
  return d;
}

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function newStop(defaultTime: string): Stop {
  return {
    id: Math.random().toString(36).slice(2),
    address: '',
    time: defaultTime,
  };
}

function addMinutesToHHMM(hhmm: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const total = Number(m[1]) * 60 + Number(m[2]) + minutes;
  const h = Math.floor((total / 60) % 24 + 24) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function hhmmToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function buildDepartureDate(hhmm: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

export function RoutePlannerScreen() {
  const userLocation = useUserLocation();
  const { settings, update: updateSettings, loaded: settingsLoaded } = useSettings();
  const now = useMemo(() => new Date(), []);
  const minNow = useMemo(() => roundUpToStep(now), [now]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [vehicle, setVehicleState] = useState<VehicleType>(settings.vehicle);
  const setVehicle = (v: VehicleType) => {
    setVehicleState(v);
    updateSettings({ vehicle: v });
  };
  const [origin, setOrigin] = useState('');
  const [originCoord, setOriginCoord] = useState<Coord | undefined>(undefined);
  const [departureTime, setDepartureTime] = useState(formatHHMM(minNow));
  const [stops, setStops] = useState<Stop[]>([
    newStop(addMinutesToHHMM(formatHHMM(minNow), 15)),
  ]);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [pendingAddressStopId, setPendingAddressStopId] = useState<string | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const skipInvalidateRef = useRef(false);
  const lastSpokenRef = useRef<string>('');

  useEffect(() => {
    if (settingsLoaded) setVehicleState(settings.vehicle);
  }, [settingsLoaded, settings.vehicle]);

  useEffect(() => {
    setResult(null);
    setLocked(false);
    setActiveLegIndex(0);
  }, [origin, originCoord, departureTime]);

  const resultRef = useRef<RouteResult | null>(null);
  const canCalcRef = useRef(false);
  const runCalculationRef = useRef<((preserveOrder: boolean, orderedStops?: Stop[]) => Promise<RouteResult | null>) | null>(null);
  resultRef.current = result;

  useEffect(() => {
    if (skipInvalidateRef.current) {
      skipInvalidateRef.current = false;
      return;
    }
    setResult(null);
    setLocked(false);
    setActiveLegIndex(0);
  }, [stops]);

  const effectiveOrigin = origin.trim() || (userLocation ? 'Ma position' : '');
  const effectiveOriginCoord = originCoord ?? userLocation ?? undefined;

  const canCalculate = useMemo(() => {
    const hasOrigin = effectiveOrigin.length > 0 && Boolean(effectiveOriginCoord);
    return hasOrigin && stops.every((s) => s.address.trim().length > 0);
  }, [effectiveOrigin, effectiveOriginCoord, stops]);

  canCalcRef.current = canCalculate;

  useEffect(() => {
    if (resultRef.current && canCalcRef.current) {
      runCalculationRef.current?.(false);
    } else {
      setLocked(false);
      setActiveLegIndex(0);
    }
  }, [vehicle]);

  const updateStop = (id: string, next: Stop) =>
    setStops((prev) => prev.map((s) => (s.id === id ? next : s)));

  const removeStop = (id: string) =>
    setStops((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const addStop = () => {
    const latestTime = stops.reduce(
      (acc, s) => (hhmmToMinutes(s.time) > hhmmToMinutes(acc) ? s.time : acc),
      departureTime,
    );
    const s = newStop(addMinutesToHHMM(latestTime, 15));
    setStops((prev) => [...prev, s]);
    setPendingAddressStopId(s.id);
  };

  const applyOrderedStops = (
    r: RouteResult,
    sourceStops: Stop[],
    updateSuggestion: boolean,
  ): Stop[] => {
    const reordered = r.orderedStopIds
      .map((id) => sourceStops.find((s) => s.id === id))
      .filter((s): s is Stop => Boolean(s));
    return updateSuggestion ? reordered.map((s, idx) => ({ ...s, suggestedIndex: idx })) : reordered;
  };

  const runCalculation: (
    preserveOrder: boolean,
    orderedStops?: Stop[],
  ) => Promise<RouteResult | null> = async (
    preserveOrder,
    orderedStops,
  ) => {
    let departureAt = buildDepartureDate(departureTime);
    if (departureAt.getTime() < Date.now()) {
      departureAt = roundUpToStep(new Date());
      setDepartureTime(formatHHMM(departureAt));
    }
    const sourceStops = orderedStops ?? stops;
    setLoading(true);
    try {
      const plan = {
        vehicle,
        departureAt,
        origin: effectiveOrigin,
        originCoord: effectiveOriginCoord,
        stops: sourceStops,
        preserveOrder,
      };
      const r = await calculateRoute(plan);
      const nextStops = applyOrderedStops(r, sourceStops, !preserveOrder);
      skipInvalidateRef.current = true;
      setStops(nextStops);
      setResult(r);
      setActiveLegIndex(0);
      return r;
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  runCalculationRef.current = runCalculation;

  const onCalculate = async () => {
    if (!canCalculate) {
      Alert.alert('Incomplet', "Renseignez le départ et l'adresse de chaque arrêt.");
      return;
    }
    setLocked(false);
    await runCalculation(false);
  };

  const onReorderResult = async (newIds: string[]) => {
    const newStops = newIds
      .map((id) => stops.find((s) => s.id === id))
      .filter((s): s is Stop => Boolean(s));
    await runCalculation(true, newStops);
  };

  const onStartNavigation = async () => {
    const r = await runCalculation(true, stops);
    if (r) setLocked(true);
  };

  const onExitNavigation = () => {
    setLocked(false);
    Speech.stop();
  };

  const onFinishTour = () => {
    setLocked(false);
    Speech.stop();
    setResult(null);
    setActiveLegIndex(0);
    const nowStr = formatHHMM(roundUpToStep(new Date()));
    setDepartureTime(nowStr);
    setStops([newStop(addMinutesToHHMM(nowStr, 15))]);
  };

  const handleOffRoute = async () => {
    if (!result || !userLocation) return;
    const remainingIds = result.orderedStopIds.slice(activeLegIndex);
    const remainingStops = remainingIds
      .map((id) => stops.find((s) => s.id === id))
      .filter((s): s is Stop => Boolean(s));
    if (remainingStops.length === 0) return;
    setIsRerouting(true);
    try {
      let departureAt = new Date();
      departureAt = roundUpToStep(departureAt);
      const plan = {
        vehicle,
        departureAt,
        origin: 'Position actuelle',
        originCoord: userLocation,
        stops: remainingStops,
        preserveOrder: true,
      };
      const r = await calculateRoute(plan);
      skipInvalidateRef.current = true;
      setResult(r);
      setActiveLegIndex(0);
    } catch {
      // ignore — cooldown handles next attempt
    } finally {
      setIsRerouting(false);
    }
  };

  const {
    instructionIndex: currentInstructionIdx,
    projection: navProjection,
    isOffRoute,
  } = useNavigationProgress({
    result,
    enabled: locked,
    userLocation,
    activeLegIndex,
    onLegAdvance: (nextIdx) => setActiveLegIndex(nextIdx),
    onOffRoute: handleOffRoute,
  });

  useEffect(() => {
    if (!locked || !voiceOn || !result) return;
    const inst = result.legs[activeLegIndex]?.instructions[currentInstructionIdx];
    if (!inst) return;
    const key = `${activeLegIndex}-${currentInstructionIdx}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    Speech.stop();
    Speech.speak(inst.text || inst.maneuver || '', { language: 'es-ES', rate: 1.0 });
  }, [locked, voiceOn, result, activeLegIndex, currentInstructionIdx]);

  useEffect(() => {
    if (!locked || !voiceOn) Speech.stop();
  }, [locked, voiceOn]);

  if (settingsLoaded && !settings.onboarded) {
    return (
      <OnboardingScreen
        onComplete={({ vehicle: v, cityName, cityCoord }) => {
          updateSettings({ onboarded: true, vehicle: v, cityName, cityCoord });
          setVehicleState(v);
        }}
      />
    );
  }

  if (settingsOpen) {
    return (
      <SettingsScreen
        settings={settings}
        onUpdate={(patch) => {
          updateSettings(patch);
          if (patch.vehicle) setVehicleState(patch.vehicle);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    );
  }

  if (locked && result) {
    return (
      <NavigationView
        userLocation={userLocation}
        result={result}
        stops={stops}
        activeLegIndex={activeLegIndex}
        currentInstructionIdx={currentInstructionIdx}
        voiceOn={voiceOn}
        onToggleVoice={() => setVoiceOn((v) => !v)}
        onPrev={() => setActiveLegIndex((i) => Math.max(0, i - 1))}
        onNext={() =>
          setActiveLegIndex((i) => Math.min(result.legs.length - 1, i + 1))
        }
        onExit={onExitNavigation}
        onFinish={onFinishTour}
        progress={navProjection}
        isOffRoute={isOffRoute}
        isRerouting={isRerouting}
      />
    );
  }

  return (
    <PlanView
      vehicle={vehicle}
      setVehicle={setVehicle}
      origin={origin}
      originCoord={originCoord}
      setOrigin={(a, c) => {
        setOrigin(a);
        setOriginCoord(c);
      }}
      userLocation={userLocation}
      cityName={settings.cityName}
      cityCoord={settings.cityCoord}
      onOpenSettings={() => setSettingsOpen(true)}
      departureTime={departureTime}
      setDepartureTime={setDepartureTime}
      minNow={minNow}
      stops={stops}
      updateStop={updateStop}
      removeStop={removeStop}
      addStop={addStop}
      result={result}
      loading={loading}
      canCalculate={canCalculate}
      onCalculate={onCalculate}
      onStartNavigation={onStartNavigation}
      onReorderResult={onReorderResult}
      activeLegIndex={activeLegIndex}
      pendingAddressStopId={pendingAddressStopId}
      clearPendingAddress={() => setPendingAddressStopId(null)}
    />
  );
}
