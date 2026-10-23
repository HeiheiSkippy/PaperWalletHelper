import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

type Props = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  onMenu?: () => void;
  menuLabel?: string;
  menuGlyph?: string;
};

const ScreenHeader: React.FC<Props> = ({
  title,
  onBack,
  backLabel,
  onMenu,
  menuLabel,
  menuGlyph = '⋮',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {onBack !== undefined && (
          <Pressable
            style={styles.button}
            hitSlop={Theme.space.sm}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}>
            <Text style={styles.glyph}>←</Text>
          </Pressable>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {onMenu !== undefined && (
          <Pressable
            style={styles.menuButton}
            hitSlop={Theme.space.sm}
            accessibilityRole="button"
            accessibilityLabel={menuLabel}
            onPress={onMenu}>
            <Text style={styles.glyph}>{menuGlyph}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  bar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.space.lg,
    gap: Theme.space.md,
  },
  button: { padding: Theme.space.xs, marginLeft: -Theme.space.xs },
  menuButton: { padding: Theme.space.xs, marginRight: -Theme.space.xs },
  glyph: { color: Theme.colors.text, fontSize: 22, lineHeight: 24 },
  title: { flex: 1, color: Theme.colors.text, fontSize: 18, fontWeight: '700' },
});

export default ScreenHeader;
