import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { RouteMap } from '../components/RouteMap';
import { RouteResultView } from '../components/RouteResult';
import { Stepper } from '../components/Stepper';
import { StopCard } from '../components/StopCard';
import { TimeSelect } from '../components/TimeSelect';
import { colors, radii, space, type as T } from '../theme';
import type { Coord, RouteResult, Stop, VehicleType } from '../types';

type Step = 'plan' | 'review';

type Props = {
  vehicle: VehicleType;
  setVehicle: (v: VehicleType) => void;
  origin: string;
  originCoord?: Coord;
  setOrigin: (a: string, c?: Coord) => void;
  userLocation: Coord | null;
  cityName: string | null;
  cityCoord: Coord | null;
  departureTime: string;
  setDepartureTime: (t: string) => void;
  minNow: Date;
  stops: Stop[];
  updateStop: (id: string, next: Stop) => void;
  removeStop: (id: string) => void;
  addStop: () => void;
  result: RouteResult | null;
  loading: boolean;
  canCalculate: boolean;
  onCalculate: () => void;
  onStartNavigation: () => void;
  onReorderResult: (ids: string[]) => void;
  activeLegIndex: number;
  pendingAddressStopId: string | null;
  clearPendingAddress: () => void;
  onOpenSettings: () => void;
};

export function PlanView(p: Props) {
  const [step, setStep] = useState<Step>('plan');
  const scrollRef = useRef<ScrollView>(null);
  const prevStopsCount = useRef(p.stops.length);
  const prevPendingId = useRef<string | null>(p.pendingAddressStopId);

  useEffect(() => {
    if (p.result && step === 'plan' && !p.loading) setStep('review');
    if (!p.result && step === 'review') setStep('plan');
  }, [p.result, p.loading]);

  useEffect(() => {
    if (p.stops.length > prevStopsCount.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    prevStopsCount.current = p.stops.length;
  }, [p.stops.length]);

  useEffect(() => {
    if (prevPendingId.current && !p.pendingAddressStopId) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
    }
    prevPendingId.current = p.pendingAddressStopId;
  }, [p.pendingAddressStopId]);

  const stepIndex = step === 'plan' ? 0 : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <View style={styles.topRow}>
          {step === 'review' ? (
            <Pressable onPress={() => setStep('plan')} style={styles.iconBtn} hitSlop={10}>
              <Feather name="arrow-left" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
          <View style={{ flex: 1 }}>
            <Stepper
              currentIndex={stepIndex}
              steps={[
                { label: 'Arrêts' },
                { label: 'Itinéraire' },
                { label: 'Navigation' },
              ]}
            />
          </View>
          <Pressable onPress={p.onOpenSettings} style={styles.iconBtn} hitSlop={10}>
            <Feather name="settings" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'plan' ? <PlanStep {...p} /> : null}
        {step === 'review' && p.result ? <ReviewStep {...p} /> : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {step === 'plan' ? (
          <Pressable
            onPress={p.onCalculate}
            disabled={p.loading || !p.canCalculate}
            style={[
              styles.cta,
              (!p.canCalculate || p.loading) && styles.ctaDisabled,
            ]}
          >
            {p.loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Text style={styles.ctaTxt}>Calculer l'itinéraire</Text>
                <Feather name="arrow-right" size={18} color={colors.surface} />
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => setStep('plan')}
              style={styles.ctaGhost}
              disabled={p.loading}
            >
              <Feather name="arrow-left" size={16} color={colors.text} />
              <Text style={styles.ctaGhostTxt}>Modifier</Text>
            </Pressable>
            <Pressable
              onPress={p.onStartNavigation}
              disabled={p.loading}
              style={[styles.cta, styles.ctaFlex, p.loading && styles.ctaDisabled]}
            >
              {p.loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <>
                  <Feather name="navigation" size={16} color={colors.surface} />
                  <Text style={styles.ctaTxt}>Démarrer</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>

    </SafeAreaView>
  );
}

function PlanStep(p: Props) {
  return (
    <View style={{ gap: space.xl }}>
      <Section title="Départ">
        <View style={styles.sectionCard}>
          <Text style={styles.fieldLabel}>Adresse</Text>
          <AddressAutocomplete
            value={p.origin}
            onChange={(a, c) => p.setOrigin(a, c)}
            placeholder={p.userLocation ? 'Ma position' : 'Adresse de départ'}
            bias={p.cityCoord ?? p.userLocation}
            title="Adresse de départ"
          />
          <View style={styles.timeInlineRow}>
            <Text style={styles.fieldLabel}>Heure</Text>
            <TimeSelect value={p.departureTime} onChange={p.setDepartureTime} minTime={p.minNow} />
          </View>
        </View>
      </Section>

      <Section title={`Arrêts (${p.stops.length})`}>
        <View style={{ gap: space.md }}>
          {p.stops.map((stop, idx) => (
            <StopCard
              key={stop.id}
              index={idx}
              stop={stop}
              onChange={(n) => {
                if (p.pendingAddressStopId === stop.id) p.clearPendingAddress();
                p.updateStop(stop.id, n);
              }}
              onRemove={() => p.removeStop(stop.id)}
              bias={p.cityCoord ?? p.userLocation}
              autoOpenAddress={p.pendingAddressStopId === stop.id}
            />
          ))}
        </View>
        <Pressable onPress={p.addStop} style={styles.addBtn}>
          <Feather name="plus" size={18} color={colors.text} />
          <Text style={styles.addBtnText}>Ajouter un arrêt</Text>
        </Pressable>
      </Section>
    </View>
  );
}

function ReviewStep(p: Props) {
  if (!p.result) return null;
  return (
    <View style={{ gap: space.lg }}>
      <RouteMap
        userLocation={p.userLocation}
        result={p.result}
        stops={p.stops}
        activeLegIndex={p.activeLegIndex}
      />
      <Text style={styles.reviewHint}>
        Glissez ⋮⋮ pour réordonner · horaires recalculés automatiquement
      </Text>
      <RouteResultView
        result={p.result}
        stops={p.stops}
        draggable
        onReorder={p.onReorderResult}
        loading={p.loading}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    paddingHorizontal: space.md,
    paddingTop: 4,
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: { flex: 1, textAlign: 'center', ...T.h2 },
  scroll: { padding: space.lg, paddingBottom: 130 },
  sectionTitle: { ...T.caps, marginLeft: 2 },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.xs,
  },
  fieldLabel: {
    ...T.caps,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  timeInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    marginTop: space.sm,
  },
  addBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  reviewHint: { fontSize: 12, color: colors.textFaint, fontStyle: 'italic', marginLeft: 2 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  ctaRow: { flexDirection: 'row', gap: space.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark,
    paddingVertical: 18,
    borderRadius: radii.lg,
  },
  ctaFlex: { flex: 1.6 },
  ctaGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  ctaGhostTxt: { color: colors.text, fontWeight: '700', fontSize: 15 },
  ctaTxt: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  ctaDisabled: { backgroundColor: colors.textFaint },
});
