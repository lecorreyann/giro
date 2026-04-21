import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { RouteMap } from '../components/RouteMap';
import { colors, radii, space } from '../theme';
import type { Coord, RouteResult, Stop, TurnInstruction } from '../types';
import type { PolylineProjection } from '../utils/geo';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const MANEUVER_ICON: Record<string, MaterialIconName> = {
  TURN_LEFT: 'turn-left',
  TURN_RIGHT: 'turn-right',
  KEEP_LEFT: 'fork-left',
  KEEP_RIGHT: 'fork-right',
  SHARP_LEFT: 'turn-sharp-left',
  SHARP_RIGHT: 'turn-sharp-right',
  BEAR_LEFT: 'turn-slight-left',
  BEAR_RIGHT: 'turn-slight-right',
  STRAIGHT: 'arrow-upward',
  DEPART: 'navigation',
  ARRIVE: 'flag',
  ARRIVE_LEFT: 'flag',
  ARRIVE_RIGHT: 'flag',
  ROUNDABOUT_RIGHT: 'roundabout-right',
  ROUNDABOUT_LEFT: 'roundabout-left',
  U_TURN_LEFT: 'u-turn-left',
  U_TURN_RIGHT: 'u-turn-right',
};

function maneuverIcon(maneuver: string | undefined): MaterialIconName {
  if (!maneuver) return 'arrow-upward';
  return MANEUVER_ICON[maneuver] ?? 'arrow-upward';
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function parseRequestedTime(base: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() < base.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function delayStatus(arrival: Date, requested: Date | null) {
  if (!requested) return null;
  const diffMin = Math.round((arrival.getTime() - requested.getTime()) / 60_000);
  if (diffMin > 2) return { text: `+${diffMin} min`, tone: 'late' as const };
  if (diffMin < -5) return { text: `−${-diffMin} min`, tone: 'early' as const };
  return { text: 'À l\'heure', tone: 'ontime' as const };
}

const TONE_FG = { ontime: '#067647', late: '#B54708', early: '#175CD3' };

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
  onFinish: () => void;
  progress: PolylineProjection | null;
  isOffRoute: boolean;
  isRerouting: boolean;
};

export function NavigationView(p: Props) {
  useKeepAwake();
  const [expanded, setExpanded] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const leg = p.result.legs[p.activeLegIndex];
  const stop = leg ? p.stops.find((s) => s.id === p.result.orderedStopIds[p.activeLegIndex]) : null;
  const current: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx];
  const next: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx + 1];
  const distToNext = current && next ? next.routeOffsetMeters - current.routeOffsetMeters : 0;
  const isLast = p.activeLegIndex >= p.result.legs.length - 1;

  const requestedAt = stop?.time ? parseRequestedTime(p.result.departureAt, stop.time) : null;
  const delay = leg ? delayStatus(leg.arrivalAt, requestedAt) : null;
  const totalLegs = p.result.legs.length;
  const finalLeg = p.result.legs[totalLegs - 1];
  const finalEta = finalLeg?.arrivalAt;

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
          bottomInset={sheetHeight}
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
            <Feather name="alert-triangle" size={14} color="#FFFFFF" />
            <Text style={styles.rerouteText}>Hors route</Text>
          </View>
        ) : null}
        <View style={styles.topBar}>
          <View style={styles.instrCard}>
            <View style={styles.instrArrowBox}>
              <MaterialIcons name={maneuverIcon(current?.maneuver)} size={56} color="#FFFFFF" />
            </View>
            <View style={styles.instrTextCol}>
              {next ? (
                <Text style={styles.instrDist}>{formatDistance(distToNext)}</Text>
              ) : (
                <Text style={styles.instrDist}>Dernière étape</Text>
              )}
              <Text style={styles.instrText} numberOfLines={2}>
                {current?.text || current?.maneuver || 'Mise en route…'}
              </Text>
              {next && distToNext < 600 ? (
                <View style={styles.nextInline}>
                  <MaterialIcons name={maneuverIcon(next.maneuver)} size={20} color="#FFFFFF" />
                  <Text style={styles.nextText} numberOfLines={2}>
                    {next.text || next.maneuver}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.cornerCol}>
            <Pressable onPress={p.onExit} style={styles.cornerBtn} hitSlop={8}>
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={p.onToggleVoice}
              style={[styles.cornerBtn, p.voiceOn && styles.cornerBtnActive]}
              hitSlop={8}
            >
              <Feather
                name={p.voiceOn ? 'volume-2' : 'volume-x'}
                size={16}
                color={p.voiceOn ? '#FFFFFF' : colors.text}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView
        edges={['bottom']}
        style={styles.bottomWrap}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.sheet}>
          <Pressable onPress={() => setExpanded((v) => !v)} style={styles.handleZone} hitSlop={6}>
            <View style={styles.handle} />
          </Pressable>

          <View style={styles.headerCol}>
            <Text style={styles.stepLabel}>
              Arrêt {p.activeLegIndex + 1} sur {totalLegs}
            </Text>
            <Text style={styles.sheetAddress} numberOfLines={2}>
              {leg?.toAddress}
            </Text>
          </View>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={styles.etaRow}
            hitSlop={6}
          >
            <Feather name="clock" size={14} color={colors.textMuted} />
            <Text style={styles.etaTxt}>{leg ? formatTime(leg.arrivalAt) : '—'}</Text>
            {delay ? (
              <>
                <Text style={styles.etaSep}>·</Text>
                <Text style={[styles.etaStatus, { color: TONE_FG[delay.tone] }]}>
                  {delay.text}
                </Text>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            {!isLast && finalEta ? (
              <>
                <Feather name="flag" size={12} color={colors.textFaint} />
                <Text style={styles.etaFinalTxt}>{formatTime(finalEta)}</Text>
              </>
            ) : null}
            <Feather
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={16}
              color={colors.textFaint}
            />
          </Pressable>

          {expanded ? (
            <>
              <View style={styles.expandedGrid}>
                {requestedAt ? (
                  <View style={styles.expandedCell}>
                    <Text style={styles.expandedLabel}>Demandée</Text>
                    <Text style={styles.expandedValue}>{formatTime(requestedAt)}</Text>
                  </View>
                ) : null}
                <View style={styles.expandedCell}>
                  <Text style={styles.expandedLabel}>Distance</Text>
                  <Text style={styles.expandedValue}>
                    {formatDistance(leg?.distanceMeters ?? 0)}
                  </Text>
                </View>
                <View style={styles.expandedCell}>
                  <Text style={styles.expandedLabel}>Durée</Text>
                  <Text style={styles.expandedValue}>
                    {leg ? `${Math.round(leg.trafficDurationSeconds / 60)} min` : '—'}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              onPress={p.onPrev}
              disabled={p.activeLegIndex <= 0}
              style={[
                styles.sheetBtnSecondary,
                p.activeLegIndex <= 0 && styles.sheetBtnDisabled,
              ]}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </Pressable>
            {isLast ? (
              <Pressable
                onPress={p.onFinish}
                style={[styles.sheetBtnPrimary, styles.sheetBtnFinish]}
              >
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.sheetBtnPrimaryTxt}>Terminer</Text>
              </Pressable>
            ) : (
              <Pressable onPress={p.onNext} style={styles.sheetBtnPrimary}>
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={styles.sheetBtnPrimaryTxt}>Livré, suivant</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  instrCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  instrArrowBox: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrDist: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  instrTextCol: { flex: 1, gap: 4, justifyContent: 'center' },
  instrText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  nextInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  nextIcon: { fontSize: 13, color: '#DBEAFE' },
  nextText: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '700', lineHeight: 19 },
  cornerCol: { gap: 8, justifyContent: 'flex-start' },
  cornerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cornerBtnActive: { backgroundColor: colors.accent },
  bottomWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    gap: space.md,
  },
  handleZone: { alignItems: 'center', paddingVertical: 4 },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  headerCol: {
    gap: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  etaSep: { fontSize: 14, color: colors.textFaint, fontWeight: '700' },
  etaStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  etaFinalTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  expandedGrid: {
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedCell: { flex: 1 },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  expandedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  sheetAddress: { fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 22 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  sheetBtnSecondary: {
    width: 48,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimary: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.dark,
  },
  sheetBtnPrimaryTxt: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  sheetBtnDisabled: { opacity: 0.4 },
  sheetBtnFinish: { backgroundColor: colors.success },
  rerouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rerouteBannerWarn: { backgroundColor: colors.warning },
  rerouteText: { color: colors.surface, fontWeight: '700', fontSize: 13 },
});
