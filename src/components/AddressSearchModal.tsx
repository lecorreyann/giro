import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { Coord } from '../types';
import { searchAddresses, type AddressSuggestion } from '../services/tomtomSearch';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { STRINGS, VOICE_LANG, type AppLang } from '../i18n';
import { colors, radii, space, type as T } from '../theme';

const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

type Props = {
  visible: boolean;
  initialValue: string;
  bias?: Coord | null;
  title?: string;
  lang: AppLang;
  onSelect: (address: string, coord: Coord) => void;
  onClose: () => void;
};

export function AddressSearchModal({
  visible,
  initialValue,
  bias,
  title = 'Adresse',
  lang,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const voice = useSpeechRecognition(VOICE_LANG[lang]);
  const s = STRINGS[lang];
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setQuery(initialValue);
      setSuggestions([]);
    } else if (voice.isListening) {
      voice.stop();
    }
  }, [visible, initialValue]);

  useEffect(() => {
    if (!TOMTOM_KEY || !visible) return;
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await searchAddresses(query, TOMTOM_KEY, lang, bias ?? undefined);
      setSuggestions(r);
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible, bias, lang]);

  const onMicPress = () => {
    if (voice.isListening) voice.stop();
    else voice.start((text) => setQuery(text));
  };

  const pick = (s: AddressSuggestion) => {
    selectedRef.current = true;
    if (voice.isListening) voice.stop();
    onSelect(s.address, s.coord);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10}>
            <Feather name="x" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.close} />
        </View>

        <View style={styles.inputRow}>
          <Feather name="search" size={18} color={colors.textFaint} style={styles.inputIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={s.addressPlaceholder}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            autoCapitalize="words"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearBtn}
              hitSlop={10}
              accessibilityLabel="Effacer"
            >
              <Feather name="x" size={16} color={colors.surface} />
            </Pressable>
          ) : null}
          {voice.supported ? (
            <Pressable
              onPress={onMicPress}
              style={[styles.mic, voice.isListening && styles.micOn]}
              hitSlop={8}
            >
              <Feather
                name={voice.isListening ? 'square' : 'mic'}
                size={20}
                color={voice.isListening ? colors.surface : colors.text}
              />
            </Pressable>
          ) : null}
        </View>

        {voice.isListening ? (
          <View style={styles.listeningPill}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningLabel}>{s.listening}</Text>
          </View>
        ) : null}

        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim().length >= 3 ? s.noSuggestion : s.searchHint}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => pick(item)} style={styles.row}>
              <Feather name="map-pin" size={18} color={colors.textMuted} />
              <Text style={styles.rowText}>{item.address}</Text>
              <Feather name="chevron-right" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', ...T.h2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  inputIcon: { position: 'absolute', left: space.lg + 14, zIndex: 1 },
  clearBtn: {
    position: 'absolute',
    right: space.lg + 48 + space.sm + 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textFaint,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 42,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  micOn: { backgroundColor: colors.danger },
  listeningPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 8,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  listeningLabel: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  separator: { height: 1, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.xs,
  },
  rowText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  empty: { padding: 32, textAlign: 'center', color: colors.textFaint },
});
