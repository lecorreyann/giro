import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  value: string;
  onChange: (next: string) => void;
  minuteStep?: number;
  minTime?: Date;
};

function parse(value: string): { h: number; m: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { h: 9, m: 0 };
  return { h: Number(match[1]), m: Number(match[2]) };
}

function format(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function TimeSelect({ value, onChange, minuteStep = 5, minTime }: Props) {
  const { h, m } = parse(value);
  const [open, setOpen] = useState<'h' | 'm' | null>(null);

  const minH = minTime ? minTime.getHours() : 0;
  const minM = minTime ? minTime.getMinutes() : 0;

  const hours = Array.from({ length: 24 }, (_, i) => i).filter((i) => i >= minH);
  const minuteCandidates = Array.from(
    { length: Math.floor(60 / minuteStep) },
    (_, i) => i * minuteStep,
  );
  const minutes = minuteCandidates.filter((min) => h > minH || min >= minM);

  const pick = (type: 'h' | 'm', v: number) => {
    if (type === 'h') {
      const nextM = v === minH && m < minM ? minM : m;
      onChange(format(v, nextM));
    } else {
      onChange(format(h, v));
    }
    setOpen(null);
  };

  return (
    <View style={styles.row}>
      <Pressable style={styles.select} onPress={() => setOpen('h')}>
        <Text style={styles.selectText}>{String(h).padStart(2, '0')}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Text style={styles.sep}>:</Text>
      <Pressable style={styles.select} onPress={() => setOpen('m')}>
        <Text style={styles.selectText}>{String(m).padStart(2, '0')}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {open === 'h' ? 'Heure' : 'Minutes'}
            </Text>
            <FlatList
              data={open === 'h' ? hours : minutes}
              keyExtractor={(n) => String(n)}
              initialScrollIndex={Math.max(
                0,
                (open === 'h'
                  ? Math.max(0, hours.indexOf(h))
                  : Math.max(0, minutes.indexOf(m - (m % minuteStep)))) - 2,
              )}
              getItemLayout={(_, i) => ({ length: 44, offset: 44 * i, index: i })}
              renderItem={({ item }) => {
                const selected = open === 'h' ? item === h : item === m;
                return (
                  <Pressable
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => pick(open!, item)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {String(item).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minWidth: 72,
  },
  selectText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  chevron: { marginLeft: 6, color: '#667085', fontSize: 12 },
  sep: { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475467',
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: '#F2F4F7' },
  optionText: { fontSize: 16, color: '#111827' },
  optionTextSelected: { fontWeight: '800' },
});
