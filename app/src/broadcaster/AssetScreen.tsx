import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AssetLogo from '../components/AssetLogo';
import ScreenHeader from '../components/ScreenHeader';
import { Button } from '../components/ui';
import { HistoryEntry, Holdings } from '../core/btc/mempool';
import { formatAmount } from '../core/units';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Balance, PendingLines, balanceText } from './Balances';
import { Asset, Net, decimalsOf, explorerUrl, historyOf } from './flow';
import { shortGrouped } from './HomeScreen';
import { Wallet } from './wallets';

type Props = {
  language: Language;
  net: Net;
  wallet: Wallet;
  asset: Asset;
  balance: Balance | undefined;
  onBalance: (balance: Holdings) => void;
  onBack: () => void;
  onSend: () => void;
};

const SHOWN = 100;

type History = { status: 'loading' } | { status: 'ok'; entries: HistoryEntry[] } | { status: 'failed' };

function when(time: number | null): string {
  if (time === null) {
    return '';
  }
  const d = new Date(time * 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

const AssetScreen: React.FC<Props> = ({ language, net, wallet, asset, balance, onBalance, onBack, onSend }) => {
  const insets = useSafeAreaInsets();
  const btc = asset === 'BTC' || asset === 'BMB';
  const [history, setHistory] = useState<History>({ status: 'loading' });

  const load = useCallback(() => {
    if (asset !== 'BTC' && asset !== 'BMB') {
      return;
    }
    setHistory({ status: 'loading' });
    historyOf(net, wallet, asset)
      .then(({ balance: value, entries }) => {
        onBalance(value);
        setHistory({ status: 'ok', entries });
      })
      .catch(() => setHistory({ status: 'failed' }));
  }, [asset, net, onBalance, wallet]);

  useEffect(load, [load]);

  const explorer = () => Linking.openURL(explorerUrl(wallet, asset));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={`${asset} · ${wallet.name}`} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          btc ? (
            <RefreshControl
              refreshing={history.status === 'loading'}
              onRefresh={load}
              tintColor={Theme.colors.primary}
              colors={[Theme.colors.primary]}
              progressBackgroundColor={Theme.colors.surface}
            />
          ) : undefined
        }>
        <View style={styles.hero}>
          <AssetLogo symbol={asset} size={44} />
          <Text style={styles.balance}>
            {balanceText(language, balance, asset)} <Text style={styles.unit}>{asset}</Text>
          </Text>
          <PendingLines language={language} balance={balance} asset={asset} large />
          <Text style={styles.address}>{shortGrouped(wallet.address)}</Text>
        </View>

        {btc ? (
          <>
            <Text style={styles.caption}>{t(language, 'bc.asset.history')}</Text>
            {history.status === 'loading' ? (
              <ActivityIndicator color={Theme.colors.primary} style={styles.spinner} />
            ) : history.status === 'failed' ? (
              <Text style={styles.muted}>{t(language, 'bc.asset.failed')}</Text>
            ) : history.entries.length === 0 ? (
              <Text style={styles.muted}>{t(language, 'bc.asset.empty')}</Text>
            ) : (
              <View style={styles.list}>
                {history.entries.slice(0, SHOWN).map((e, i) => {
                  const incoming = e.net >= 0n;
                  const amount = formatAmount(incoming ? e.net : -e.net, decimalsOf(asset));
                  return (
                    <View key={e.txid} style={[styles.tx, i > 0 && styles.txLine]}>
                      <View style={[styles.dir, incoming ? styles.dirIn : styles.dirOut]}>
                        <Text style={[styles.dirGlyph, incoming ? styles.inText : styles.outText]}>
                          {incoming ? '↓' : '↑'}
                        </Text>
                      </View>
                      <View style={styles.main}>
                        <Text style={styles.kind}>{t(language, incoming ? 'bc.asset.in' : 'bc.asset.out')}</Text>
                        <Text style={styles.when}>
                          {when(e.time)}
                          {!e.confirmed && <Text style={styles.pending}>{t(language, 'bc.asset.pending')}</Text>}
                        </Text>
                      </View>
                      <Text style={[styles.amount, incoming && styles.inText]}>
                        {incoming ? '+' : '−'}
                        {amount}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Pressable onPress={explorer} accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.link}>
                {t(language, history.status === 'ok' && history.entries.length > SHOWN ? 'bc.asset.older' : 'bc.asset.explorer')} ↗
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Button label={`${t(language, 'bc.asset.bscScan')} ↗`} onPress={explorer} />
            <Text style={styles.note}>{t(language, 'bc.asset.bscNote')}</Text>
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'bc.home.send')} kind="primary" onPress={onSend} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.md },
  hero: { alignItems: 'center', gap: Theme.space.xs, paddingVertical: Theme.space.md },
  balance: { color: Theme.colors.text, fontSize: 30, fontWeight: '800' },
  unit: { color: Theme.colors.textMuted, fontSize: 17, fontWeight: '700' },
  address: { color: Theme.colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  caption: { color: Theme.colors.textFaint, fontSize: 13, fontWeight: '700' },
  spinner: { marginVertical: Theme.space.lg },
  muted: { color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center', marginVertical: Theme.space.md },
  list: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
  },
  tx: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm, paddingHorizontal: Theme.space.md, paddingVertical: 12 },
  txLine: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  dir: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dirIn: { backgroundColor: Theme.colors.successBg },
  dirOut: { backgroundColor: Theme.colors.primaryBg },
  dirGlyph: { fontSize: 16, fontWeight: '900' },
  inText: { color: Theme.colors.success },
  outText: { color: Theme.colors.primary },
  main: { flex: 1, gap: 2 },
  kind: { color: Theme.colors.text, fontSize: 15, fontWeight: '700' },
  when: { color: Theme.colors.textFaint, fontSize: 12 },
  pending: { color: Theme.colors.primary },
  amount: { color: Theme.colors.text, fontSize: 15, fontWeight: '700' },
  link: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: Theme.space.sm },
  note: { color: Theme.colors.textFaint, fontSize: 13, textAlign: 'center', marginTop: -Theme.space.xs },
  pressed: { opacity: 0.6 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default AssetScreen;
