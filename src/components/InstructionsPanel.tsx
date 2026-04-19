import { StyleSheet, Text, View } from 'react-native';
import type { RouteLeg } from '../types';

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

type Props = {
  leg: RouteLeg | null;
  currentIndex: number;
};

export function InstructionsPanel({ leg, currentIndex }: Props) {
  if (!leg || leg.instructions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucune instruction disponible.</Text>
      </View>
    );
  }

  const current = leg.instructions[currentIndex] ?? leg.instructions[0];
  const next = leg.instructions[currentIndex + 1] ?? null;
  const upcoming = leg.instructions.slice(currentIndex + 2, currentIndex + 5);

  const distToNext = next ? next.routeOffsetMeters - current.routeOffsetMeters : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Direction — {leg.toAddress}</Text>

      <View style={styles.currentCard}>
        <Text style={styles.currentIcon}>{MANEUVER_ICON[current.maneuver ?? ''] ?? '•'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.currentText}>{current.text || current.maneuver}</Text>
          {next ? (
            <Text style={styles.currentDist}>Dans {formatDistance(distToNext)}</Text>
          ) : (
            <Text style={styles.currentDist}>Dernière étape</Text>
          )}
        </View>
      </View>

      {next ? (
        <View style={styles.nextCard}>
          <Text style={styles.nextIcon}>{MANEUVER_ICON[next.maneuver ?? ''] ?? '•'}</Text>
          <Text style={styles.nextText}>Ensuite : {next.text || next.maneuver}</Text>
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View style={styles.upcomingList}>
          {upcoming.map((inst, i) => (
            <View key={i} style={styles.upcomingRow}>
              <Text style={styles.upcomingIcon}>
                {MANEUVER_ICON[inst.maneuver ?? ''] ?? '•'}
              </Text>
              <Text style={styles.upcomingText} numberOfLines={1}>
                {inst.text || inst.maneuver}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 10,
  },
  empty: { padding: 14, alignItems: 'center' },
  emptyText: { color: '#667085' },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475467',
    textTransform: 'uppercase',
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1570EF',
    borderRadius: 12,
    padding: 14,
  },
  currentIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    width: 40,
    textAlign: 'center',
  },
  currentText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  currentDist: { color: '#DBEAFE', fontSize: 13, marginTop: 2 },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    padding: 10,
  },
  nextIcon: { fontSize: 20, width: 26, textAlign: 'center', color: '#475467' },
  nextText: { flex: 1, fontSize: 14, color: '#475467', fontWeight: '600' },
  upcomingList: { gap: 4 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  upcomingIcon: { fontSize: 14, width: 20, textAlign: 'center', color: '#98A2B3' },
  upcomingText: { flex: 1, fontSize: 12, color: '#667085' },
});
