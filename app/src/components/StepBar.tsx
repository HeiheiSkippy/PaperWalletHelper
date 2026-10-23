import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

type Props = { steps: string[]; at: number };

const StepBar: React.FC<Props> = ({ steps, at }) => (
  <View style={styles.row}>
    {steps.map((label, i) => (
      <View key={label} style={styles.step}>
        <View style={[styles.bar, i < at && styles.barDone, i === at && styles.barOn]} />
        <Text style={[styles.label, i < at && styles.labelDone, i === at && styles.labelOn]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
  step: { flex: 1, gap: 6 },
  bar: { height: 3, borderRadius: 2, backgroundColor: Theme.colors.border },
  barDone: { backgroundColor: Theme.colors.primaryDim },
  barOn: { backgroundColor: Theme.colors.primary },
  label: { color: Theme.colors.textFaint, fontSize: 12, fontWeight: '600' },
  labelDone: { color: Theme.colors.textMuted },
  labelOn: { color: Theme.colors.primary },
});

export default StepBar;
