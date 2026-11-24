import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import QrBox from '../components/QrBox';
import ScreenHeader from '../components/ScreenHeader';
import { grouped } from '../components/TxDetails';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { KeyAddresses } from './flow';

type Props = { language: Language; addresses: KeyAddresses; onClose: () => void };

type Tab = 'btc' | 'evm';

const TABS: { id: Tab; logos: string[] }[] = [
  { id: 'btc', logos: ['BTC', 'BMB'] },
  { id: 'evm', logos: ['BSC'] },
];

const AddressScreen: React.FC<Props> = ({ language, addresses, onClose }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(addresses.pkh === null ? 'evm' : 'btc');
  const address = tab === 'btc' && addresses.pkh !== null ? addresses.pkh : addresses.evm;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'signer.addr.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map(item => {
            const on = item.id === tab;
            const off = item.id === 'btc' && addresses.pkh === null;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                disabled={off}
                accessibilityRole="tab"
                accessibilityState={{ selected: on, disabled: off }}
                style={[styles.tab, on && styles.tabOn, off && styles.tabOff]}>
                <LogoRow symbols={item.logos} size={18} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(language, `signer.addr.tab.${item.id}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.qr}>
          <QrBox value={address} size={220} />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t(language, 'signer.addr.address')}</Text>
          <Text style={styles.address} selectable={false}>
            {grouped(address)}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'common.close')} kind="primary" onPress={onClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.md },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  tab: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.space.xs,
    borderRadius: Theme.radius.sm + 2,
  },
  tabOn: { backgroundColor: Theme.colors.primaryBg, borderWidth: 1, borderColor: Theme.colors.primary },
  tabText: { color: Theme.colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextOn: { color: Theme.colors.primary, fontWeight: '800' },
  tabOff: { opacity: 0.35 },
  qr: { alignItems: 'center', marginTop: Theme.space.xs },
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

export default AddressScreen;
