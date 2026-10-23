import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Theme } from '../theme';

export function shortAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  kind = 'plain',
  disabled,
  style,
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.button,
      kind === 'primary' && styles.primary,
      kind === 'danger' && styles.danger,
      disabled && styles.off,
      pressed && styles.pressed,
      style,
    ]}
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}>
    <Text
      style={[
        styles.buttonText,
        kind === 'primary' && styles.primaryText,
        kind === 'danger' && styles.dangerText,
        disabled && styles.offText,
      ]}>
      {label}
    </Text>
  </Pressable>
);

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
};

export const Card: React.FC<CardProps> = ({ children, onPress }) =>
  onPress === undefined ? (
    <View style={styles.card}>{children}</View>
  ) : (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      onPress={onPress}>
      {children}
    </Pressable>
  );

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

export const Body: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({
  children,
  muted,
}) => <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;

export const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.mono} selectable={false}>
    {children}
  </Text>
);

export const Warn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.warn}>{children}</Text>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
  primary: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  primaryText: { color: Theme.colors.onPrimary, fontWeight: '700' },
  danger: { backgroundColor: Theme.colors.danger, borderColor: Theme.colors.danger },
  dangerText: { color: '#FFFFFF', fontWeight: '700' },
  off: { backgroundColor: Theme.colors.disabled, borderColor: Theme.colors.disabled },
  offText: { color: Theme.colors.disabledText },
  pressed: { opacity: 0.7 },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  label: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  body: { color: Theme.colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: Theme.colors.textMuted },
  mono: { color: Theme.colors.text, fontSize: 14, fontFamily: 'monospace' },
  warn: { color: Theme.colors.primary, fontSize: 14, lineHeight: 21, fontWeight: '700' },
});
