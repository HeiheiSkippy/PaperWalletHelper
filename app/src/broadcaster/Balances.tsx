import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AssetLogo from '../components/AssetLogo';
import { formatAmount } from '../core/units';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { ASSETS, Asset, decimalsOf } from './flow';
import { Wallet } from './wallets';
import { Holdings } from '../core/btc/mempool';

export type Balance =
  | { status: 'loading' }
  | { status: 'ok'; value: bigint; incoming: bigint; change: bigint }
  | { status: 'failed' };

export function balanceFrom(held: Holdings): Balance {
  return { status: 'ok', value: held.spendable, incoming: held.incoming, change: held.change };
}

export const PendingLines: React.FC<{ language: Language; balance: Balance | undefined; asset: Asset; large?: boolean }> = ({
  language,
  balance,
  asset,
  large,
}) => {
  if (balance?.status !== 'ok' || (balance.incoming === 0n && balance.change === 0n)) {
    return null;
  }
  const amount = (v: bigint) => formatAmount(v, decimalsOf(asset), 8);
  return (
    <>
      {balance.incoming > 0n && (
        <Text style={[styles.pending, large && styles.pendingLarge]}>
          {t(language, 'bc.pending.incoming', { amount: amount(balance.incoming) })}
        </Text>
      )}
      {balance.change > 0n && (
        <Text style={[styles.pending, large && styles.pendingLarge]}>
          {t(language, 'bc.pending.change', { amount: amount(balance.change) })}
        </Text>
      )}
    </>
  );
};

export type BalanceBook = Record<string, Partial<Record<Asset, Balance>>>;

export function balanceText(language: Language, balance: Balance | undefined, asset: Asset): string {
  if (balance === undefined || balance.status === 'loading') {
    return '…';
  }
  if (balance.status === 'failed') {
    return t(language, 'bc.balance.failed');
  }
  return formatAmount(balance.value, decimalsOf(asset), 8);
}

type Props = { language: Language; wallet: Wallet; book: BalanceBook; large?: boolean; onAsset?: (asset: Asset) => void };

const Balances: React.FC<Props> = ({ language, wallet, book, large, onAsset }) => (
  <View style={styles.list}>
    {ASSETS[wallet.kind].map(asset => {
      const balance = book[wallet.address]?.[asset];
      return (
        <Pressable
          key={asset}
          disabled={onAsset === undefined}
          onPress={() => onAsset?.(asset)}
          accessibilityRole={onAsset ? 'button' : undefined}
          style={({ pressed }) => pressed && styles.pressed}>
          <View style={[styles.row, large && styles.rowLarge]}>
          <AssetLogo symbol={asset} size={large ? 24 : 18} />
          <Text style={[styles.asset, large && styles.assetLarge]}>{asset}</Text>
          <Text
            style={[
              styles.value,
              large && styles.valueLarge,
              balance?.status === 'failed' && styles.failed,
            ]}>
            {balanceText(language, balance, asset)}
          </Text>
          {onAsset && <Text style={styles.chevron}>›</Text>}
          </View>
          <View style={[styles.below, onAsset && styles.belowChevron]}>
            <PendingLines language={language} balance={balance} asset={asset} />
          </View>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm, minHeight: 24 },
  rowLarge: { minHeight: 40 },
  asset: { flex: 1, color: Theme.colors.textMuted, fontSize: 14 },
  assetLarge: { fontSize: 15, color: Theme.colors.text },
  value: { color: Theme.colors.text, fontSize: 14, fontWeight: '600' },
  valueLarge: { fontSize: 17, fontWeight: '700' },
  failed: { color: Theme.colors.textFaint, fontWeight: '400' },
  chevron: { color: Theme.colors.textFaint, fontSize: 18, marginLeft: 2 },
  below: { alignItems: 'flex-end', marginTop: -6 },
  belowChevron: { paddingRight: 16 },
  pending: { color: Theme.colors.primary, fontSize: 12 },
  pendingLarge: { fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.6 },
});

export default Balances;
