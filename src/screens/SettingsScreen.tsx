import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { AddressSearchModal } from '../components/AddressSearchModal';
import { VehiclePickerModal } from '../components/VehiclePickerModal';
import { VEHICLE_LABEL, VehicleIcon } from '../components/VehicleIcon';
import { colors, radii, space, type as T } from '../theme';
import type { Settings } from '../hooks/useSettings';

type Props = {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

export function SettingsScreen({ settings, onUpdate, onClose }: Props) {
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Paramètres</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl }}>
        <Section title="Préférences">
          <Row
            icon={<VehicleIcon type={settings.vehicle} size={20} color={colors.text} />}
            label="Véhicule"
            value={VEHICLE_LABEL[settings.vehicle]}
            onPress={() => setVehicleOpen(true)}
          />
          <Row
            icon={<Feather name="map-pin" size={20} color={colors.text} />}
            label="Ville"
            value={settings.cityName ?? 'Non définie'}
            onPress={() => setCityOpen(true)}
          />
        </Section>

        <Section title="À propos">
          <Row
            icon={<Feather name="info" size={20} color={colors.text} />}
            label="Version"
            value="0.1.0"
          />
        </Section>
      </ScrollView>

      <VehiclePickerModal
        visible={vehicleOpen}
        value={settings.vehicle}
        onSelect={(v) => onUpdate({ vehicle: v })}
        onClose={() => setVehicleOpen(false)}
      />
      <AddressSearchModal
        visible={cityOpen}
        initialValue={settings.cityName ?? ''}
        title="Ville"
        onSelect={(name, coord) => {
          onUpdate({ cityName: name, cityCoord: coord });
          setCityOpen(false);
        }}
        onClose={() => setCityOpen(false)}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionGroup}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const Cmp: any = onPress ? Pressable : View;
  return (
    <Cmp onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {onPress ? <Feather name="chevron-right" size={20} color={colors.textFaint} /> : null}
    </Cmp>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', ...T.h2 },
  sectionTitle: { ...T.caps, marginLeft: 2 },
  sectionGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  rowLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { ...T.bodyStrong, marginTop: 2 },
});
