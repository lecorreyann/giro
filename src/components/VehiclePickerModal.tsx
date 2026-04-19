import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VehicleType } from '../types';
import { colors, radii, space, type as T } from '../theme';
import { VEHICLE_LABEL, VehicleIcon } from './VehicleIcon';

const ORDER: VehicleType[] = ['bike', 'escooter', 'scooter', 'car'];

type Props = {
  visible: boolean;
  value: VehicleType;
  onSelect: (v: VehicleType) => void;
  onClose: () => void;
};

export function VehiclePickerModal({ visible, value, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Véhicule</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {ORDER.map((v) => {
            const isActive = v === value;
            return (
              <Pressable
                key={v}
                onPress={() => {
                  onSelect(v);
                  onClose();
                }}
                style={[styles.row, isActive && styles.rowActive]}
              >
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                  <VehicleIcon
                    type={v}
                    size={22}
                    color={isActive ? colors.surface : colors.text}
                  />
                </View>
                <Text style={styles.label}>{VEHICLE_LABEL[v]}</Text>
                {isActive ? (
                  <Feather name="check" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: 10,
    paddingHorizontal: space.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  title: { ...T.h2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
    backgroundColor: colors.surface,
  },
  rowActive: {
    borderColor: colors.accent,
    backgroundColor: '#EFF8FF',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.accent },
  label: { flex: 1, ...T.bodyStrong },
});
