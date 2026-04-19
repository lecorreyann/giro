import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tab<T extends string> = {
  value: T;
  label: string;
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
};

type Props<T extends string> = {
  value: T;
  tabs: Tab<T>[];
  onChange: (next: T) => void;
};

export function SegmentedTabs<T extends string>({ value, tabs, onChange }: Props<T>) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            disabled={tab.disabled}
            onPress={() => onChange(tab.value)}
            style={[styles.tab, active && styles.tabActive, tab.disabled && styles.tabDisabled]}
          >
            {tab.icon ? (
              <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {tab.badge ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeTxt, active && styles.badgeTxtActive]}>
                  {tab.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EAECF0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabDisabled: { opacity: 0.4 },
  icon: { fontSize: 16, color: '#475467' },
  iconActive: { color: '#101828' },
  label: { fontSize: 14, fontWeight: '600', color: '#475467' },
  labelActive: { color: '#101828', fontWeight: '700' },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#98A2B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: '#111827' },
  badgeTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  badgeTxtActive: { color: '#FFFFFF' },
});
