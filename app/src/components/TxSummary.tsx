import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LogoRow, chainSymbols } from '../components/AssetLogo';
import { BtcBreakdown } from '../components/TxDetails';
import { BNB_DECIMALS, TOKENS } from '../core/evm/send';
import { formatAmount } from '../core/units';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Loaded } from '../tx';

type Props = { language: Language; loaded: Loaded; title?: string };

function groups(text: string): string {
  return text.match(/.{1,4}/g)?.join(' ') ?? text;
}

function short(address: string): string {
  return `${groups(address.slice(0, 8))} … ${groups(address.slice(-8))}`;
}

function describe(language: Language, loaded: Loaded) {
  if (loaded.kind === 'evm') {
    const { view } = loaded;
    const decimals = view.asset === 'BNB' ? BNB_DECIMALS : TOKENS[view.asset].decimals;
    return {
      chain: 'BSC',
      chainLogos: ['BSC'],
      from: loaded.from,
      payments: [{ amount: `${formatAmount(view.amount, decimals)} ${view.asset}`, logos: [view.asset], to: view.to }],
      fee: { label: t(language, 'tx.maxFee'), value: `${formatAmount(view.maxFee, BNB_DECIMALS)} BNB` },
    };
  }
  const { view } = loaded;
  const unit = view.chain ?? t(language, 'tx.chainUnknown');
  return {
    chain: unit,
    chainLogos: chainSymbols(view.chain),
    from: view.from ?? '-',
    payments: view.outputs
      .filter(o => !o.change)
      .map(o => ({ amount: `${formatAmount(o.amount, 8)} ${unit}`, logos: chainSymbols(view.chain), to: o.address ?? '-' })),
    fee: null,
  };
}

const TxSummary: React.FC<Props> = ({ language, loaded, title }) => {
  const { chain, chainLogos, from, payments, fee } = describe(language, loaded);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>{title ?? ''}</Text>
        <View style={styles.chain}>
          <LogoRow symbols={chainLogos} size={16} />
          <Text style={styles.label}>{chain}</Text>
        </View>
      </View>
      {payments.map((p, i) => (
        <View key={i} style={styles.payment}>
          <View style={styles.amountRow}>
            <LogoRow symbols={p.logos} size={22} />
            <Text style={styles.amount}>{p.amount}</Text>
          </View>
          <Row label={t(language, 'tx.to')} value={short(p.to)} strong />
        </View>
      ))}
      <Row label={t(language, 'tx.from')} value={short(from)} />
      {fee && <Row label={fee.label} value={fee.value} />}
      {loaded.kind === 'btc' && (
        <>
          <View style={styles.rule} />
          <BtcBreakdown language={language} view={loaded.view} compact />
        </>
      )}
    </View>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.address, strong && styles.addressStrong]} selectable={false}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chain: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm },
  label: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  payment: { gap: 2 },
  amount: { flexShrink: 1, color: Theme.colors.primary, fontSize: 20, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Theme.space.sm },
  address: { color: Theme.colors.textMuted, fontSize: 13, fontFamily: 'monospace' },
  addressStrong: { color: Theme.colors.text, fontWeight: '700' },
  rule: { height: 1, marginVertical: 4, backgroundColor: Theme.colors.border },
});

export default TxSummary;
