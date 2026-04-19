import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Step = {
  label: string;
  icon?: string;
};

type Props = {
  steps: Step[];
  currentIndex: number;
};

export function Stepper({ steps, currentIndex }: Props) {
  return (
    <View style={styles.row}>
      {steps.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        const isLast = idx === steps.length - 1;
        return (
          <Fragment key={step.label}>
            <View style={styles.item}>
              <View
                style={[
                  styles.circle,
                  isActive && styles.circleActive,
                  isDone && styles.circleDone,
                ]}
              >
                {isDone ? (
                  <Text style={styles.doneMark}>✓</Text>
                ) : (
                  <Text style={[styles.number, isActive && styles.numberActive]}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isDone && styles.labelDone,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {!isLast ? (
              <View style={[styles.connector, isDone && styles.connectorDone]} />
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    borderColor: colors.dark,
    backgroundColor: colors.dark,
  },
  circleDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  number: { fontSize: 12, fontWeight: '800', color: colors.textFaint },
  numberActive: { color: colors.surface },
  doneMark: { color: colors.surface, fontWeight: '800', fontSize: 13 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelActive: { color: colors.text },
  labelDone: { color: colors.success },
  connector: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
    maxWidth: 32,
    marginHorizontal: 2,
    marginTop: -16,
  },
  connectorDone: { backgroundColor: colors.success },
});
