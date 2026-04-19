import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { AddressSearchModal } from '../components/AddressSearchModal';
import { VEHICLE_LABEL, VehicleIcon } from '../components/VehicleIcon';
import { colors, radii, space, type as T } from '../theme';
import type { Coord, VehicleType } from '../types';

const VEHICLES: VehicleType[] = ['bike', 'escooter', 'scooter', 'car'];

type Props = {
  onComplete: (payload: {
    vehicle: VehicleType;
    cityName: string;
    cityCoord: Coord;
  }) => void;
};

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityName, setCityName] = useState<string | null>(null);
  const [cityCoord, setCityCoord] = useState<Coord | null>(null);

  const canContinue1 = vehicle !== null;
  const canFinish = cityName !== null && cityCoord !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, step === 2 && styles.progressDotActive]} />
      </View>

      <View style={styles.content}>
        {step === 1 ? (
          <>
            <Text style={styles.kicker}>Étape 1 / 2</Text>
            <Text style={styles.title}>Quel véhicule utilisez-vous ?</Text>
            <Text style={styles.subtitle}>
              On optimisera vos tournées en fonction.
            </Text>
            <View style={styles.vehicleGrid}>
              {VEHICLES.map((v) => {
                const active = vehicle === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVehicle(v)}
                    style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                  >
                    <View style={[styles.vehicleIconWrap, active && styles.vehicleIconWrapActive]}>
                      <VehicleIcon
                        type={v}
                        size={32}
                        color={active ? colors.surface : colors.text}
                      />
                    </View>
                    <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>
                      {VEHICLE_LABEL[v]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>Étape 2 / 2</Text>
            <Text style={styles.title}>Dans quelle ville ?</Text>
            <Text style={styles.subtitle}>
              Les adresses seront suggérées autour de cette ville.
            </Text>
            <Pressable
              onPress={() => setCityModalOpen(true)}
              style={styles.cityTrigger}
            >
              <Feather name="map-pin" size={22} color={colors.textMuted} />
              <Text
                style={[
                  styles.cityTriggerTxt,
                  !cityName && { color: colors.textFaint },
                ]}
                numberOfLines={1}
              >
                {cityName || 'Choisir une ville'}
              </Text>
              <Feather name="chevron-right" size={20} color={colors.textFaint} />
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.bottomBar}>
        {step === 2 ? (
          <Pressable onPress={() => setStep(1)} style={styles.ctaGhost}>
            <Feather name="arrow-left" size={18} color={colors.text} />
            <Text style={styles.ctaGhostTxt}>Retour</Text>
          </Pressable>
        ) : (
          <View style={styles.ctaGhost}>
            <Text style={styles.ctaGhostTxt}>Bienvenue 👋</Text>
          </View>
        )}
        <Pressable
          disabled={step === 1 ? !canContinue1 : !canFinish}
          onPress={() => {
            if (step === 1) setStep(2);
            else if (vehicle && cityName && cityCoord) {
              onComplete({ vehicle, cityName, cityCoord });
            }
          }}
          style={[
            styles.cta,
            (step === 1 ? !canContinue1 : !canFinish) && styles.ctaDisabled,
          ]}
        >
          <Text style={styles.ctaTxt}>{step === 1 ? 'Continuer' : 'Commencer'}</Text>
          <Feather name="arrow-right" size={18} color={colors.surface} />
        </Pressable>
      </View>

      <AddressSearchModal
        visible={cityModalOpen}
        initialValue={cityName ?? ''}
        title="Ville"
        onSelect={(addr, coord) => {
          setCityName(addr);
          setCityCoord(coord);
          setCityModalOpen(false);
        }}
        onClose={() => setCityModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.dark },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    gap: space.md,
  },
  kicker: { ...T.caps },
  title: { ...T.display, lineHeight: 34 },
  subtitle: { ...T.small, marginTop: -4, marginBottom: space.lg },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  vehicleCard: {
    width: '47%',
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: space.sm,
  },
  vehicleCardActive: {
    borderColor: colors.dark,
    borderWidth: 2,
  },
  vehicleIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconWrapActive: { backgroundColor: colors.dark },
  vehicleLabel: { ...T.bodyStrong },
  vehicleLabelActive: { color: colors.text },
  cityTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cityTriggerTxt: { flex: 1, ...T.bodyStrong },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    flexDirection: 'row',
    gap: space.md,
  },
  cta: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark,
    paddingVertical: 18,
    borderRadius: radii.lg,
  },
  ctaTxt: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  ctaDisabled: { backgroundColor: colors.textFaint },
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
});
