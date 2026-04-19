import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Coord } from '../types';
import { AddressSearchModal } from './AddressSearchModal';
import { colors, radii } from '../theme';

type Props = {
  value: string;
  onChange: (address: string, coord?: Coord) => void;
  placeholder?: string;
  bias?: Coord | null;
  title?: string;
  autoOpen?: boolean;
};

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Toucher pour saisir une adresse',
  bias,
  title,
  autoOpen,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value || placeholder}
        </Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <AddressSearchModal
        visible={open}
        initialValue={value}
        bias={bias}
        title={title}
        onSelect={(addr, coord) => {
          onChange(addr, coord);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  value: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  placeholder: { color: colors.textFaint },
  chev: { fontSize: 22, color: colors.textFaint, fontWeight: '600' },
});
