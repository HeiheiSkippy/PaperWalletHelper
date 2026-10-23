import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AssetLogo, { LogoRow } from '../components/AssetLogo';
import ScreenHeader from '../components/ScreenHeader';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { grouped } from '../components/TxDetails';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Balance, PendingLines, balanceText } from './Balances';
import { ASSETS, Asset, FeeChoice } from './flow';
import { walletLogos } from './HomeScreen';
import { Wallet } from './wallets';

export type FeeSpeed = keyof FeeChoice;

export type Draft = { asset: Asset; to: string; amount: string; all: boolean; speed: FeeSpeed };

type Props = {
  language: Language;
  wallet: Wallet;
  draft: Draft;
  balance: Balance | undefined;
  fees: FeeChoice | 'loading' | 'failed';
  busy: boolean;
  error: string | null;
  steps: React.ReactNode;
  onDraft: (draft: Draft) => void;
  onBack: () => void;
  onChangeFrom: () => void;
  onScanTo: () => void;
  onBuild: () => void;
};

const SPEEDS: FeeSpeed[] = ['fast', 'normal', 'slow'];

const Chip: React.FC<{ label: string; on: boolean; logo?: string; onPress: () => void }> = ({ label, on, logo, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: on }}
    style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
    {logo ? <AssetLogo symbol={logo} size={18} /> : null}
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const SendFormScreen: React.FC<Props> = ({
  language,
  wallet,
  draft,
  balance,
  fees,
  busy,
  error,
  steps,
  onDraft,
  onBack,
  onChangeFrom,
  onScanTo,
  onBuild,
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const btc = draft.asset === 'BTC' || draft.asset === 'BMB';
  const ready = draft.to.trim() !== '' && (draft.all || draft.amount.trim() !== '') && (!btc || typeof fees === 'object');

  return (
    <View style={[styles.container, { paddingBottom: (keyboard || insets.bottom) + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.form.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      {steps}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>{t(language, 'tx.from')}</Text>
          <View style={styles.fromHead}>
            <LogoRow symbols={walletLogos(wallet)} size={20} />
            <Text style={styles.fromName} numberOfLines={1}>
              {wallet.name}
            </Text>
            <Pressable onPress={onChangeFrom} hitSlop={Theme.space.sm} accessibilityRole="button">
              <Text style={styles.link}>{t(language, 'bc.form.change')}</Text>
            </Pressable>
          </View>
          <Text style={styles.fromAddress}>{grouped(wallet.address)}</Text>
        </View>

        <Text style={styles.label}>{t(language, 'bc.form.asset')}</Text>
        <View style={styles.chips}>
          {ASSETS[wallet.kind].map(a => (
            <Chip key={a} label={a} logo={a} on={draft.asset === a} onPress={() => onDraft({ ...draft, asset: a, all: false, amount: '' })} />
          ))}
        </View>

        <Text style={styles.label}>{t(language, 'tx.to')}</Text>
        <View style={styles.field}>
          <TextInput
            style={[styles.input, styles.mono]}
            value={draft.to}
            onChangeText={to => onDraft({ ...draft, to })}
            placeholder={t(language, 'bc.form.toPlaceholder')}
            placeholderTextColor={Theme.colors.textFaint}
            selectionColor={Theme.colors.primary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <Pressable onPress={onScanTo} hitSlop={Theme.space.sm} accessibilityRole="button" style={styles.fieldButton}>
            <Text style={styles.link}>{t(language, 'bc.form.scanTo')}</Text>
          </Pressable>
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>{t(language, 'tx.amount')}</Text>
          <View style={styles.balanceCol}>
            <Text style={styles.label}>
              {t(language, 'bc.form.balance', { amount: `${balanceText(language, balance, draft.asset)} ${draft.asset}` })}
            </Text>
            <PendingLines language={language} balance={balance} asset={draft.asset} />
          </View>
        </View>
        <View style={[styles.field, draft.all && styles.fieldOn]}>
          <TextInput
            style={[styles.input, draft.all && styles.inputAll]}
            value={draft.all ? t(language, 'bc.form.all') : draft.amount}
            editable={!draft.all}
            onChangeText={amount => onDraft({ ...draft, amount: amount.replace(',', '.') })}
            placeholder="0"
            placeholderTextColor={Theme.colors.textFaint}
            selectionColor={Theme.colors.primary}
            keyboardType="decimal-pad"
          />
          <Text style={styles.unit}>{draft.asset}</Text>
          <Pressable
            onPress={() => onDraft({ ...draft, all: !draft.all })}
            hitSlop={Theme.space.sm}
            accessibilityRole="button"
            style={styles.fieldButton}>
            <Text style={[styles.link, draft.all && styles.linkOn]}>{t(language, 'bc.form.all')}</Text>
          </Pressable>
        </View>

        {btc && (
          <>
            <Text style={styles.label}>{t(language, 'tx.feeRate')}</Text>
            {fees === 'loading' ? (
              <ActivityIndicator color={Theme.colors.primary} style={styles.spinner} />
            ) : fees === 'failed' ? (
              <Text style={styles.error}>{t(language, 'bc.err.network')}</Text>
            ) : (
              <View style={styles.chips}>
                {SPEEDS.map(s => (
                  <Chip
                    key={s}
                    label={`${t(language, `bc.form.${s}`)} ${fees[s]}`}
                    on={draft.speed === s}
                    onPress={() => onDraft({ ...draft, speed: s })}
                  />
                ))}
                <Text style={styles.unitNote}>sat/vB</Text>
              </View>
            )}
          </>
        )}

        {error !== null && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {busy ? (
          <ActivityIndicator color={Theme.colors.primary} style={styles.busy} />
        ) : (
          <Button label={t(language, 'bc.form.build')} kind="primary" disabled={!ready} onPress={onBuild} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.sm },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  fromHead: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm },
  fromName: { flex: 1, color: Theme.colors.text, fontSize: 16, fontWeight: '700' },
  fromAddress: { color: Theme.colors.textMuted, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  label: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: Theme.space.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceCol: { alignItems: 'flex-end' },
  link: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700' },
  linkOn: { textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Theme.space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  chipOn: { borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primaryBg },
  chipText: { color: Theme.colors.text, fontSize: 14 },
  chipTextOn: { color: Theme.colors.primary, fontWeight: '700' },
  unitNote: { color: Theme.colors.textFaint, fontSize: 12 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  fieldOn: { borderColor: Theme.colors.primary },
  input: { flex: 1, color: Theme.colors.text, fontSize: 17, paddingVertical: Theme.space.sm },
  inputAll: { color: Theme.colors.primary, fontWeight: '700' },
  mono: { fontFamily: 'monospace', fontSize: 14 },
  unit: { color: Theme.colors.textMuted, fontSize: 14, marginLeft: Theme.space.sm },
  fieldButton: { paddingHorizontal: Theme.space.md, paddingVertical: Theme.space.sm },
  spinner: { alignSelf: 'flex-start', marginVertical: Theme.space.sm },
  error: { color: Theme.colors.dangerText, fontSize: 14 },
  notice: {
    marginTop: Theme.space.sm,
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.dangerText,
  },
  noticeText: { color: Theme.colors.text, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.7 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
  busy: { minHeight: 48 },
});

export default SendFormScreen;
