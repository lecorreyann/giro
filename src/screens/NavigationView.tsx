import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RouteMap } from '../components/RouteMap';
import { colors, radii, space } from '../theme';
import type { Coord, RouteResult, Stop, TurnInstruction } from '../types';
import type { PolylineProjection } from '../utils/geo';

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const MANEUVER_ICON: Record<string, FeatherIcon> = {
  TURN_LEFT: 'corner-up-left',
  TURN_RIGHT: 'corner-up-right',
  KEEP_LEFT: 'corner-up-left',
  KEEP_RIGHT: 'corner-up-right',
  SHARP_LEFT: 'arrow-left',
  SHARP_RIGHT: 'arrow-right',
  BEAR_LEFT: 'corner-up-left',
  BEAR_RIGHT: 'corner-up-right',
  STRAIGHT: 'arrow-up',
  DEPART: 'navigation',
  ARRIVE: 'flag',
  ARRIVE_LEFT: 'flag',
  ARRIVE_RIGHT: 'flag',
  ROUNDABOUT_RIGHT: 'rotate-cw',
  ROUNDABOUT_LEFT: 'rotate-ccw',
};

function maneuverIcon(maneuver: string | undefined): FeatherIcon {
  if (!maneuver) return 'arrow-up';
  return MANEUVER_ICON[maneuver] ?? 'arrow-up';
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
  if (diffMin > 2) return { text: `${diffMin} min de retard`, tone: 'late' as const };
  if (diffMin < -5) return { text: `${-diffMin} min d'avance`, tone: 'early' as const };
  return { text: 'À l\'heure', tone: 'ontime' as const };
}

const TONE_BG = { ontime: '#ECFDF3', late: '#FEF3F2', early: '#EFF8FF' };
const TONE_FG = { ontime: '#067647', late: '#B42318', early: '#175CD3' };
const TONE_ICON = { ontime: 'check-circle', late: 'alert-triangle', early: 'clock' } as const;

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
  const [expanded, setExpanded] = useState(false);
  const leg = p.result.legs[p.activeLegIndex];
  const stop = leg ? p.stops.find((s) => s.id === p.result.orderedStopIds[p.activeLegIndex]) : null;
  const current: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx];
  const next: TurnInstruction | undefined = leg?.instructions[p.currentInstructionIdx + 1];
  const distToNext = current && next ? next.routeOffsetMeters - current.routeOffsetMeters : 0;
  const isLast = p.activeLegIndex >= p.result.legs.length - 1;

  const requestedAt = stop?.time ? parseRequestedTime(p.result.departureAt, stop.time) : null;
  const delay = leg ? delayStatus(leg.arrivalAt, requestedAt) : null;
  const totalLegs = p.result.legs.length;
  const progressPct = ((p.activeLegIndex + 1) / totalLegs) * 100;

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
            <Feather name="alert-triangle" size={14} color="#FFFFFF" />
            <Text style={styles.rerouteText}>Hors route</Text>
          </View>
        ) : null}
        <View style={styles.topBar}>
          <View style={styles.instrCard}>
            <View style={styles.instrArrowBox}>
              <Feather name={maneuverIcon(current?.maneuver)} size={42} color="#FFFFFF" />
            </View>
            <View style={styles.instrTextCol}>
              {next ? (
                <Text style={styles.instrDist}>{formatDistance(distToNext)}</Text>
              ) : (
                <Text style={styles.instrDist}>Dernière étape</Text>
              )}
              <Text style={styles.instrText} numberOfLines={3}>
                {current?.text || current?.maneuver || 'Mise en route…'}
              </Text>
              {next && distToNext < 600 ? (
                <View style={styles.nextInline}>
                  <Feather name={maneuverIcon(next.maneuver)} size={12} color="#DBEAFE" />
                  <Text style={styles.nextText} numberOfLines={1}>
                    puis {next.text || next.maneuver}
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

      <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
        <View style={styles.sheet}>
          <Pressable onPress={() => setExpanded((v) => !v)} style={styles.handleZone} hitSlop={6}>
            <View style={styles.handle} />
          </Pressable>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              Arrêt {p.activeLegIndex + 1} / {totalLegs}
            </Text>
            {isLast ? (
              <View style={styles.finalBadge}>
                <Feather name="flag" size={10} color={colors.surface} />
                <Text style={styles.finalBadgeTxt}>DERNIER</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={styles.expandBtn}
              hitSlop={8}
            >
              <Feather
                name={expanded ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={18} color={colors.accent} style={{ marginTop: 2 }} />
            <Text style={styles.sheetAddress} numberOfLines={expanded ? 3 : 1}>
              {leg?.toAddress}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryEta}>
                {leg ? formatTime(leg.arrivalAt) : '—'}
              </Text>
              <Text style={styles.summaryEtaLabel}>Arrivée</Text>
            </View>
            {delay ? (
              <View style={[styles.statusPill, { backgroundColor: TONE_BG[delay.tone] }]}>
                <Feather name={TONE_ICON[delay.tone]} size={13} color={TONE_FG[delay.tone]} />
                <Text style={[styles.statusPillTxt, { color: TONE_FG[delay.tone] }]}>
                  {delay.text}
                </Text>
              </View>
            ) : null}
          </View>

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
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrDist: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  instrTextCol: { flex: 1, gap: 2, justifyContent: 'center' },
  instrText: {
    color: '#DBEAFE',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  nextInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.85,
  },
  nextIcon: { fontSize: 13, color: '#DBEAFE' },
  nextText: { flex: 1, fontSize: 12, color: '#DBEAFE', fontWeight: '600' },
  cornerCol: { gap: 6, justifyContent: 'space-between' },
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    gap: space.md,
  },
  handleZone: { alignItems: 'center', paddingVertical: 6, marginBottom: 2 },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: space.xs,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  summaryEta: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  summaryEtaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  finalBadgeTxt: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.dark,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  sheetAddress: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 22 },
  timeGrid: { flexDirection: 'row', gap: space.md },
  timeCell: { flex: 1 },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  timeValueMuted: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusPillTxt: { fontSize: 12, fontWeight: '800' },
  metaRow: {
    flexDirection: 'row',
    gap: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetBtnSecondary: {
    width: 56,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimary: {
    flex: 1,
    height: 54,
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
