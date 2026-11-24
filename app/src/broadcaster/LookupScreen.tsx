import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import ScreenHeader from '../components/ScreenHeader';
import { grouped } from '../components/TxDetails';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import Balances, { BalanceBook } from './Balances';
import { Asset } from './flow';
import { walletLogos } from './HomeScreen';
import { Wallet } from './wallets';

type Props = {
  language: Language;
  wallet: Wallet;
  registered: boolean;
  book: BalanceBook;
  onBack: () => void;
  onReload: () => void;
  onAsset: (asset: Asset) => void;
  onReceive: () => void;
  onRegister: () => void;
  onSend: () => void;
};

const LookupScreen: React.FC<Props> = ({
  language,
  wallet,
  registered,
  book,
  onBack,
  onReload,
  onAsset,
  onReceive,
  onRegister,
  onSend,
}) => {
  const insets = useSafeAreaInsets();
  const loading = Object.values(book[wallet.address] ?? {}).some(b => b?.status === 'loading');
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.lookup.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <LogoRow symbols={walletLogos(wallet)} size={24} />
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={1}>
              {registered ? wallet.name : t(language, `bc.add.kind.${wallet.kind}`)}
            </Text>
            <Text style={styles.address} selectable={false}>
              {grouped(wallet.address)}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.caption}>{t(language, 'bc.wallet.balances')}</Text>
            {loading ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} style={styles.reload} />
            ) : (
              <Pressable
                onPress={onReload}
                hitSlop={Theme.space.sm}
                accessibilityRole="button"
                accessibilityLabel={t(language, 'bc.balance.refresh')}
                style={({ pressed }) => [styles.reload, pressed && styles.pressed]}>
                <Text style={styles.reloadGlyph}>↻</Text>
              </Pressable>
            )}
          </View>
          <Balances language={language} wallet={wallet} book={book} large onAsset={onAsset} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'bc.wallet.receive')} onPress={onReceive} style={styles.action} />
        <Button
          label={t(language, registered ? 'bc.lookup.registered' : 'bc.lookup.register')}
          onPress={onRegister}
          disabled={registered}
          style={styles.action}
        />
        <Button label={t(language, 'bc.home.send')} kind="primary" onPress={onSend} style={styles.send} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm },
  headText: { flex: 1, gap: 2 },
  name: { color: Theme.colors.text, fontSize: 16, fontWeight: '700' },
  address: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: Theme.colors.textFaint, fontSize: 13, fontWeight: '700' },
  reload: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  reloadGlyph: { color: Theme.colors.primary, fontSize: 20, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  footer: { flexDirection: 'row', gap: Theme.space.sm, paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
  action: { flex: 1, minHeight: 52 },
  send: { flex: 1.3, minHeight: 52 },
});

export default LookupScreen;
