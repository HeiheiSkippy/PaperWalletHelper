import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import QrBox from '../components/QrBox';
import ScreenHeader from '../components/ScreenHeader';
import { grouped } from '../components/TxDetails';
import { Button, Warn } from '../components/ui';
import { Language, t } from '../strings';
import { copyText } from '../specs/NativeCopyText';
import { Theme } from '../theme';
import { walletLogos } from './HomeScreen';
import { Wallet } from './wallets';

type Props = { language: Language; wallet: Wallet; onBack: () => void };

const ReceiveScreen: React.FC<Props> = ({ language, wallet, onBack }) => {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.receive.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <LogoRow symbols={walletLogos(wallet)} size={20} />
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={1}>
              {wallet.name}
            </Text>
            <Text style={styles.kind}>{t(language, `bc.add.kind.${wallet.kind}`)}</Text>
          </View>
        </View>
        <View style={styles.qr}>
          <QrBox value={wallet.address} size={220} />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t(language, 'bc.receive.address')}</Text>
          <Text style={styles.address} selectable={false}>
            {grouped(wallet.address)}
          </Text>
        </View>
        <Warn>{t(language, wallet.kind === 'evm' ? 'bc.receive.warn.evm' : 'bc.receive.warn.btc')}</Warn>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={t(language, copied ? 'bc.receive.copied' : 'bc.receive.copy')}
          kind="primary"
          onPress={() => {
            copyText().copy(wallet.address);
            setCopied(true);
          }}
        />
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
  kind: { color: Theme.colors.textMuted, fontSize: 13 },
  qr: { alignItems: 'center' },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  label: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  address: { color: Theme.colors.text, fontSize: 15, lineHeight: 24, fontFamily: 'monospace', fontWeight: '700' },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default ReceiveScreen;
