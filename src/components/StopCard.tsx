import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Coord, Stop } from '../types';
import { TimeSelect } from './TimeSelect';
import { AddressAutocomplete } from './AddressAutocomplete';
import { colors, radii, space, type } from '../theme';

type Props = {
  index: number;
  stop: Stop;
  onChange: (next: Stop) => void;
  onRemove: () => void;
  bias?: Coord | null;
  autoOpenAddress?: boolean;
};

export function StopCard({
  index,
  stop,
  onChange,
  onRemove,
  bias,
  autoOpenAddress,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.title}>Arrêt {index + 1}</Text>
        <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
          <Text style={styles.removeTxt}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={styles.fieldLabel}>Adresse</Text>
      <AddressAutocomplete
        value={stop.address}
        onChange={(address, coord) => onChange({ ...stop, address, coord })}
        placeholder="Toucher pour saisir"
        bias={bias}
        title={`Arrêt ${index + 1}`}
        autoOpen={autoOpenAddress}
      />

      <View style={styles.timeRow}>
        <Text style={styles.fieldLabel}>Heure</Text>
        <TimeSelect value={stop.time} onChange={(time) => onChange({ ...stop, time })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  title: { ...type.h2, flex: 1 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  removeTxt: { fontSize: 14, color: colors.textMuted, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space.sm,
  },
  fieldLabel: {
    ...type.caps,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
});
