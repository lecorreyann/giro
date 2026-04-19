import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VehicleType } from '../types';
import { colors, radii } from '../theme';

type Option = { value: VehicleType; label: string; emoji: string };

const OPTIONS: Option[] = [
  { value: 'bike', label: 'Vélo', emoji: '🚲' },
  { value: 'escooter', label: 'Trottinette', emoji: '🛴' },
  { value: 'scooter', label: 'Scooter', emoji: '🛵' },
  { value: 'car', label: 'Voiture', emoji: '🚗' },
];

type Props = {
  value: VehicleType;
  onChange: (v: VehicleType) => void;
};

export function VehicleSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  labelActive: { color: colors.surface },
});
