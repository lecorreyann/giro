import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '../components/RouteMap';
import type { Coord, RouteResult, Stop, TurnInstruction } from '../types';
import type { PolylineProjection } from '../utils/geo';

const MANEUVER_ICON: Record<string, string> = {
  TURN_LEFT: '⬅',
  TURN_RIGHT: '➡',
  KEEP_LEFT: '↖',
  KEEP_RIGHT: '↗',
  SHARP_LEFT: '↩',
  SHARP_RIGHT: '↪',
  BEAR_LEFT: '↖',
  BEAR_RIGHT: '↗',
  STRAIGHT: '⬆',
  DEPART: '●',
  ARRIVE: '⚑',
  ARRIVE_LEFT: '⚑',
  ARRIVE_RIGHT: '⚑',
  ROUNDABOUT_RIGHT: '↻',
  ROUNDABOUT_LEFT: '↺',
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  userLocation: Coord | null;
  result: RouteResult;
  stops: Stop[];
  activeLegIndex: number;
  currentInstructionIdx: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  progress: PolylineProjection | null;
  isOffRoute: boolean;
  isRerouting: boolean;
};

export function NavigationView(p: Props) {
  const leg = p.result.legs[p.activeLegIndex];
  const stop = leg ? p.stops.find((s) => s.id === p.result.orderedStopIds[p.activeLegIndex]) : null;
  const current: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx];
  const next: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx + 1];
  const distToNext = current && next ? next.routeOffsetMeters - current.routeOffsetMeters : 0;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <RouteMap
          userLocation={p.userLocation}
          result={p.result}
          stops={p.stops}
          activeLegIndex={p.activeLegIndex}
          fullscreen
          follow
          progress={p.progress}
        />
      </View>

      <SafeAreaView edges={['top']} style={styles.topWrap} pointerEvents="box-none">
        {p.isRerouting ? (
          <View style={styles.rerouteBanner}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.rerouteText}>Recalcul de l'itinéraire…</Text>
          </View>
        ) : p.isOffRoute ? (
          <View style={[styles.rerouteBanner, styles.rerouteBannerWarn]}>
            <Text style={styles.rerouteText}>⚠️ Hors route</Text>
          </View>
        ) : null}
        <View style={styles.topBar}>
          <Pressable onPress={p.onExit} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconBtnTxt}>✕</Text>
          </Pressable>

          <View style={styles.instrCard}>
            <Text style={styles.instrIcon}>
              {MANEUVER_ICON[current?.maneuver ?? ''] ?? '•'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.instrText} numberOfLines={2}>
                {current?.text || current?.maneuver || 'Mise en route…'}
              </Text>
              <Text style={styles.instrDist}>
                {next
                  ? `Dans ${formatDistance(distToNext)}`
                  : current
                    ? 'Dernière étape'
                    : ''}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={p.onToggleVoice}
            style={[styles.iconBtn, p.voiceOn && styles.iconBtnActive]}
            hitSlop={8}
          >
            <Text style={styles.iconBtnTxt}>{p.voiceOn ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>

        {next ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextIcon}>{MANEUVER_ICON[next.maneuver ?? ''] ?? '•'}</Text>
            <Text style={styles.nextText} numberOfLines={1}>
              Ensuite : {next.text || next.maneuver}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>
            Arrêt {p.activeLegIndex + 1} / {p.result.legs.length}
          </Text>
          <Text style={styles.sheetAddress} numberOfLines={2}>
            {leg?.toAddress}
          </Text>
          <View style={styles.sheetMetaRow}>
            {stop?.time ? (
              <Text style={styles.sheetMeta}>📅 Demandée {stop.time}</Text>
            ) : null}
            {leg ? (
              <Text style={styles.sheetMeta}>🕒 ETA {formatTime(leg.arrivalAt)}</Text>
            ) : null}
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              onPress={p.onPrev}
              disabled={p.activeLegIndex <= 0}
              style={[
                styles.sheetBtnSecondary,
                p.activeLegIndex <= 0 && styles.sheetBtnDisabled,
              ]}
            >
              <Text style={styles.sheetBtnSecondaryTxt}>◀</Text>
            </Pressable>
            <Pressable
              onPress={p.onNext}
              disabled={p.activeLegIndex >= p.result.legs.length - 1}
              style={[
                styles.sheetBtnPrimary,
                p.activeLegIndex >= p.result.legs.length - 1 && styles.sheetBtnDisabled,
              ]}
            >
              <Text style={styles.sheetBtnPrimaryTxt}>Livré, suivant ▶</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iconBtnActive: { backgroundColor: '#1570EF' },
  iconBtnTxt: { fontSize: 20 },
  instrCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1570EF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  instrIcon: { fontSize: 34, color: '#FFFFFF', width: 40, textAlign: 'center' },
  instrText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  instrDist: { color: '#DBEAFE', fontSize: 13, marginTop: 2, fontWeight: '600' },
  nextCard: {
    marginHorizontal: 68,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nextIcon: { fontSize: 16, color: '#475467', width: 20, textAlign: 'center' },
  nextText: { flex: 1, fontSize: 13, color: '#475467', fontWeight: '600' },
  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D5DD',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetAddress: { fontSize: 18, fontWeight: '800', color: '#101828', marginTop: 4 },
  sheetMetaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  sheetMeta: { fontSize: 13, color: '#475467', fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sheetBtnSecondary: {
    width: 56,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnSecondaryTxt: { fontSize: 20, color: '#111827' },
  sheetBtnPrimary: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimaryTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  sheetBtnDisabled: { opacity: 0.4 },
  rerouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1570EF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rerouteBannerWarn: { backgroundColor: '#F79009' },
  rerouteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
