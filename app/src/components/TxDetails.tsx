import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BNB_DECIMALS, TOKENS } from '../core/evm/send';
import { formatAmount } from '../core/units';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Loaded } from '../tx';
import { LogoRow, chainSymbols } from './AssetLogo';

// Groups of four make a long address easier to compare by eye.
export function grouped(address: string): string {
  return address.match(/.{1,4}/g)?.join(' ') ?? address;
}

const Section: React.FC<{ children: React.ReactNode; main?: boolean }> = ({ children, main }) => (
  <View style={[styles.section, main && styles.sectionMain]}>{children}</View>
);

const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.caption}>{children}</Text>
);

const Address: React.FC<{ value: string; dim?: boolean }> = ({ value, dim }) => (
  <Text style={[styles.address, dim && styles.addressDim]} selectable={false}>
    {grouped(value)}
  </Text>
);

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.line}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text style={styles.lineValue}>{value}</Text>
  </View>
);

const ChainBadge: React.FC<{ chain: string | null; name: string; note?: string }> = ({ chain, name, note }) => (
  <View style={styles.chainRow}>
    <View style={styles.chainHead}>
      <LogoRow symbols={chainSymbols(chain)} size={20} />
      <Text style={styles.chainName}>{name}</Text>
    </View>
    {note ? <Text style={styles.chainNote}>{note}</Text> : null}
  </View>
);

const Amount: React.FC<{ symbols: string[]; text: string }> = ({ symbols, text }) => (
  <View style={styles.amountRow}>
    <LogoRow symbols={symbols} size={28} />
    <Text style={styles.amount}>{text}</Text>
  </View>
);

type Props = { language: Language; loaded: Loaded; chainNote?: boolean };

const TxDetails: React.FC<Props> = ({ language, loaded, chainNote }) =>
  loaded.kind === 'btc' ? (
    <BtcDetails language={language} loaded={loaded} chainNote={chainNote} />
  ) : (
    <EvmDetails language={language} loaded={loaded} />
  );

const BtcDetails: React.FC<{
  language: Language;
  loaded: Extract<Loaded, { kind: 'btc' }>;
  chainNote?: boolean;
}> = ({ language, loaded, chainNote }) => {
  const { view } = loaded;
  const unit = view.chain ?? t(language, 'tx.chainUnknown');
  const amount = (sats: bigint) => `${formatAmount(sats, 8)} ${unit}`;
  return (
    <>
      <ChainBadge chain={view.chain} name={unit} note={chainNote ? t(language, 'tx.chainNote') : undefined} />
      {view.outputs
        .filter(o => !o.change)
        .map(o => (
          <Section key={o.index} main>
            <Caption>{t(language, 'tx.amount')}</Caption>
            <Amount symbols={chainSymbols(view.chain)} text={amount(o.amount)} />
            <Caption>{t(language, 'tx.to')}</Caption>
            <Address value={o.address ?? '-'} />
          </Section>
        ))}
      <Section>
        <Caption>{t(language, 'tx.from')}</Caption>
        <Address value={view.from ?? '-'} dim />
      </Section>
      <Section>
        <BtcBreakdown language={language} view={view} />
      </Section>
    </>
  );
};

type BtcView = Extract<Loaded, { kind: 'btc' }>['view'];

// Laid out as a subtraction so the user can check that the change adds up.
export const BtcBreakdown: React.FC<{ language: Language; view: BtcView; compact?: boolean }> = ({
  language,
  view,
  compact,
}) => {
  const unit = view.chain ?? t(language, 'tx.chainUnknown');
  const value = (sats: bigint) => (compact ? formatAmount(sats, 8) : `${formatAmount(sats, 8)} ${unit}`);
  const size = compact ? styles.calcSmall : null;
  const row = (op: string, label: string, sats: bigint, result?: boolean) => (
    <View style={styles.calcRow}>
      <Text style={[styles.calcOp, size]}>{op}</Text>
      <Text style={[styles.calcLabel, size, result && styles.calcResultLabel]}>{label}</Text>
      <Text style={[styles.calcValue, size, result && styles.calcResultValue]}>{value(sats)}</Text>
    </View>
  );
  return (
    <View style={styles.calc}>
      {row('', t(language, 'tx.inputs', { count: String(view.inputs.length) }), view.inputTotal)}
      {row('−', t(language, 'tx.amount'), view.sendTotal)}
      {row('−', `${t(language, 'tx.fee')} (${view.feeRate.toFixed(1)} sat/vB)`, view.fee)}
      <View style={styles.calcRule} />
      {row('=', t(language, 'tx.change'), view.changeTotal, true)}
    </View>
  );
};

const EvmDetails: React.FC<{ language: Language; loaded: Extract<Loaded, { kind: 'evm' }> }> = ({
  language,
  loaded,
}) => {
  const { view } = loaded;
  const decimals = view.asset === 'BNB' ? BNB_DECIMALS : TOKENS[view.asset].decimals;
  return (
    <>
      <ChainBadge chain="BSC" name="BSC" />
      <Section main>
        <Caption>{t(language, 'tx.amount')}</Caption>
        <Amount symbols={[view.asset]} text={`${formatAmount(view.amount, decimals)} ${view.asset}`} />
        <Caption>{t(language, 'tx.to')}</Caption>
        <Address value={view.to} />
      </Section>
      <Section>
        <Caption>{t(language, 'tx.from')}</Caption>
        <Address value={loaded.from} dim />
      </Section>
      <Section>
        <Line label={t(language, 'tx.maxFee')} value={`${formatAmount(view.maxFee, BNB_DECIMALS)} BNB`} />
        <Line label={t(language, 'tx.nonce')} value={view.nonce.toString()} />
      </Section>
    </>
  );
};

const styles = StyleSheet.create({
  chainRow: { gap: Theme.space.xs },
  chainHead: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm },
  chainName: { color: Theme.colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm, marginBottom: Theme.space.xs },
  chainNote: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  section: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  sectionMain: { borderColor: Theme.colors.primary, gap: Theme.space.sm },
  caption: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  amount: { flexShrink: 1, color: Theme.colors.primary, fontSize: 28, fontWeight: '800' },
  address: { color: Theme.colors.text, fontSize: 17, lineHeight: 26, fontFamily: 'monospace', fontWeight: '700' },
  addressDim: { color: Theme.colors.textMuted, fontSize: 15, fontWeight: '400' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 2 },
  lineLabel: { color: Theme.colors.textMuted, fontSize: 14 },
  lineValue: { color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
  calc: { gap: 4 },
  calcRow: { flexDirection: 'row', alignItems: 'baseline', gap: Theme.space.xs },
  calcOp: { width: 14, color: Theme.colors.textFaint, fontSize: 14 },
  calcLabel: { flex: 1, color: Theme.colors.textMuted, fontSize: 14 },
  calcValue: { color: Theme.colors.text, fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
  calcSmall: { fontSize: 12 },
  calcRule: { height: 1, marginVertical: 2, backgroundColor: Theme.colors.border },
  calcResultLabel: { color: Theme.colors.text, fontWeight: '600' },
  calcResultValue: { color: Theme.colors.success },
});

export default TxDetails;
