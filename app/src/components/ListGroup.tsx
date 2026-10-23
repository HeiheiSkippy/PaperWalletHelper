import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

export const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.caption}>{children}</Text>
);

export const Group: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.group}>
    {React.Children.toArray(children).map((child, i) => (
      <View key={i} style={i > 0 && styles.line}>
        {child}
      </View>
    ))}
  </View>
);

type RowProps = {
  label: string;
  value?: string;
  sub?: string;
  onPress?: () => void;
};

export const Row: React.FC<RowProps> = ({ label, value, sub, onPress }) => {
  const body = (
    <View style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {value || onPress ? (
        <Text style={styles.value}>
          {value ?? ''}
          {onPress ? (value ? '  ›' : '›') : ''}
        </Text>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  ) : (
    body
  );
};

const styles = StyleSheet.create({
  caption: {
    color: Theme.colors.textFaint,
    fontSize: 13,
    fontWeight: '700',
    marginTop: Theme.space.lg,
    marginBottom: Theme.space.sm,
    marginLeft: Theme.space.xs,
  },
  group: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
  },
  line: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
    paddingHorizontal: Theme.space.md,
    paddingVertical: Theme.space.sm,
  },
  main: { flex: 1, gap: 3 },
  label: { color: Theme.colors.text, fontSize: 15 },
  sub: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  value: { color: Theme.colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.6 },
});
