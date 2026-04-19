import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { VehicleType } from '../types';

const MAP: Record<VehicleType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  bike: 'bicycle',
  escooter: 'scooter-electric',
  scooter: 'moped',
  car: 'car',
};

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  bike: 'Vélo',
  escooter: 'Trottinette',
  scooter: 'Scooter',
  car: 'Voiture',
};

export function VehicleIcon({
  type,
  size = 22,
  color = '#101828',
}: {
  type: VehicleType;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={MAP[type]} size={size} color={color} />;
}
