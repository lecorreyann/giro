import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { AddressSearchModal } from '../components/AddressSearchModal';
import { LangPickerModal } from '../components/LangPickerModal';
import { VehiclePickerModal } from '../components/VehiclePickerModal';
import { VEHICLE_LABEL, VehicleIcon } from '../components/VehicleIcon';
import { LANG_FLAG, LANG_LABEL } from '../i18n';
import { colors, radii, space, type as T } from '../theme';
import type { Settings } from '../hooks/useSettings';

type Props = {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SettingsScreen({ settings, onUpdate, onReset, onClose }: Props) {
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      'Réinitialiser l’application ?',
      'Vos préférences seront effacées et l’onboarding sera réaffiché.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', onPress: onReset },
      ],
    );
  };

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
            icon={<Text style={styles.flagIcon}>{LANG_FLAG[settings.lang]}</Text>}
            label="Langue"
            value={LANG_LABEL[settings.lang]}
            onPress={() => setLangOpen(true)}
          />
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

        <Section title="Compte">
          <Row
            icon={<Feather name="refresh-ccw" size={20} color={colors.text} />}
            label="Réinitialiser l’application"
            value="Efface les préférences et réaffiche l’onboarding"
            onPress={confirmReset}
          />
        </Section>
      </ScrollView>

      <LangPickerModal
        visible={langOpen}
        value={settings.lang}
        onSelect={(v) => onUpdate({ lang: v })}
        onClose={() => setLangOpen(false)}
      />
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
        lang={settings.lang}
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
  rowIconDanger: {
    backgroundColor: '#FEE4E2',
  },
  flagIcon: { fontSize: 20 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  clearBtnTxt: { ...T.small, fontWeight: '600' },
  rowLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { ...T.bodyStrong, marginTop: 2 },
});
