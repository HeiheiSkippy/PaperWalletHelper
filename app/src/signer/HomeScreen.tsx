import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AssetLogo from '../components/AssetLogo';
import { Button, Warn } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';

type Props = {
  language: Language;
  tampered: boolean;
  onLoad: () => void;
  onSettings: () => void;
};

const ASSETS = [
  { name: 'Bitcoin', logo: 'BTC' },
  { name: 'BTCMobick', logo: 'BMB' },
  { name: 'WBMB · MOVN', note: '(BSC)', logo: 'BSC' },
];

const HomeScreen: React.FC<Props> = ({ language, tampered, onLoad, onSettings }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Theme.space.lg, paddingBottom: insets.bottom + Theme.space.lg },
      ]}>
      <View style={styles.top}>
        <Pressable
          onPress={onSettings}
          hitSlop={Theme.space.md}
          accessibilityRole="button"
          accessibilityLabel={t(language, 'signer.home.settings')}>
          <View style={styles.more}>
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </View>
        </Pressable>
      </View>

      <Text style={styles.title}>
        PaperWallet Helper{'\n'}
        <Text style={styles.accent}>Offline</Text>
      </Text>

      <View style={styles.card}>
        {ASSETS.map((a, i) => (
          <View key={a.name} style={[styles.row, i > 0 && styles.rowLine]}>
            <AssetLogo symbol={a.logo} />
            <Text style={styles.asset}>
              {a.name}
              {a.note ? <Text style={styles.note}>{' ' + a.note}</Text> : null}
            </Text>
          </View>
        ))}
      </View>

      {tampered && <Warn>{t(language, 'settings.tampered')}</Warn>}

      <View style={styles.spacer} />
      <Button label={t(language, 'signer.home.load')} kind="primary" onPress={onLoad} style={styles.cta} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.space.lg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  more: { paddingHorizontal: Theme.space.sm, paddingVertical: Theme.space.xs, gap: 4 },
  moreDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Theme.colors.textMuted },
  title: { marginTop: 120, color: Theme.colors.text, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.5 },
  accent: { color: Theme.colors.primary },
  card: {
    marginTop: 48,
    paddingHorizontal: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLine: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  asset: { color: Theme.colors.text, fontSize: 15 },
  note: { color: Theme.colors.textMuted },
  spacer: { flex: 1 },
  cta: { minHeight: 56 },
});

export default HomeScreen;
