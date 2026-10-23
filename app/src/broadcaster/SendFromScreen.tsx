import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import ScreenHeader from '../components/ScreenHeader';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { shortGrouped, walletLogos } from './HomeScreen';
import { Wallet } from './wallets';

type Props = {
  language: Language;
  wallets: Wallet[];
  steps: React.ReactNode;
  onBack: () => void;
  onPick: (wallet: Wallet) => void;
  onScan: () => void;
};

const SendFromScreen: React.FC<Props> = ({ language, wallets, steps, onBack, onPick, onScan }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.from.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      {steps}
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>{t(language, 'bc.from.lead')}</Text>
        {wallets.map(w => (
          <Pressable
            key={w.address}
            onPress={() => onPick(w)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <LogoRow symbols={walletLogos(w)} size={22} />
            <View style={styles.main}>
              <Text style={styles.name} numberOfLines={1}>
                {w.name}
              </Text>
              <Text style={styles.address}>{shortGrouped(w.address)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'bc.from.scan')} kind={wallets.length === 0 ? 'primary' : 'plain'} onPress={onScan} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.sm },
  lead: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: Theme.space.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  main: { flex: 1, gap: 2 },
  name: { color: Theme.colors.text, fontSize: 16, fontWeight: '700' },
  address: { color: Theme.colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  chevron: { color: Theme.colors.textFaint, fontSize: 20 },
  pressed: { opacity: 0.7 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default SendFromScreen;
