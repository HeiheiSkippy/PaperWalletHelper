import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import TxSummary from '../components/TxSummary';
import { grouped } from '../components/TxDetails';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { copyText } from '../specs/NativeCopyText';
import { Theme } from '../theme';
import { Loaded } from '../tx';
import { Outcome } from './flow';

type Props = {
  language: Language;
  loaded: Loaded;
  txid: string;
  // Only EVM sends can fail after broadcast; BTC and BMB pass nothing.
  check?: () => Promise<Outcome>;
  onClose: () => void;
};

type Shown = Outcome | 'unknown';

const POLL_MS = 3_000;
const POLL_TRIES = 40;

function useOutcome(check: (() => Promise<Outcome>) | undefined): Shown | null {
  const [shown, setShown] = useState<Shown | null>(check ? 'waiting' : null);
  useEffect(() => {
    if (!check) {
      return;
    }
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      tries++;
      let outcome: Outcome = 'waiting';
      try {
        outcome = await check();
      } catch {}
      if (!alive) {
        return;
      }
      if (outcome !== 'waiting') {
        setShown(outcome);
      } else if (tries >= POLL_TRIES) {
        setShown('unknown');
      } else {
        timer = setTimeout(poll, POLL_MS);
      }
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [check]);
  return shown;
}

const SentScreen: React.FC<Props> = ({ language, loaded, txid, check, onClose }) => {
  const insets = useSafeAreaInsets();
  const shown = useOutcome(check);
  const failed = shown === 'failed' || shown === 'out-of-gas';
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.sent.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        {shown === 'waiting' ? (
          <View style={[styles.check, styles.checkWaiting]}>
            <ActivityIndicator color={Theme.colors.primary} />
          </View>
        ) : (
          <View style={[styles.check, failed && styles.checkFailed]}>
            <Text style={[styles.checkMark, failed && styles.checkMarkFailed]}>{failed ? '✕' : '✓'}</Text>
          </View>
        )}
        <Text style={styles.lead}>{t(language, 'bc.sent.lead')}</Text>
        {shown === null ? (
          <Text style={styles.note}>{t(language, 'bc.sent.note')}</Text>
        ) : (
          <Text style={[styles.note, failed && styles.noteFailed]}>{t(language, `bc.sent.${shown}`)}</Text>
        )}
        <TxSummary language={language} loaded={loaded} />
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.label}>{t(language, 'bc.sent.txid')}</Text>
            <Pressable
              onPress={() => copyText().copy(txid)}
              hitSlop={Theme.space.sm}
              accessibilityRole="button"
              accessibilityLabel={t(language, 'bc.sent.copy')}
              style={({ pressed }) => pressed && styles.pressed}>
              <View style={styles.copyIcon}>
                <View style={[styles.sheet, styles.sheetBack]} />
                <View style={[styles.sheet, styles.sheetFront]} />
              </View>
            </Pressable>
          </View>
          <Text style={styles.txid}>
            {txid.startsWith('0x') ? `0x${grouped(txid.slice(2))}` : grouped(txid)}
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
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: Theme.space.lg,
    alignSelf: 'center',
    backgroundColor: Theme.colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWaiting: { backgroundColor: Theme.colors.primaryBg },
  checkFailed: { backgroundColor: Theme.colors.danger },
  checkMark: { color: Theme.colors.success, fontSize: 28, fontWeight: '900' },
  checkMarkFailed: { color: Theme.colors.text },
  noteFailed: { color: Theme.colors.dangerText, fontWeight: '700' },
  lead: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  note: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: Theme.space.sm },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  copyIcon: { width: 18, height: 18 },
  sheet: { position: 'absolute', width: 11, height: 13, borderRadius: 2, borderWidth: 1.5, borderColor: Theme.colors.textMuted },
  sheetBack: { left: 0, top: 0 },
  sheetFront: { left: 5, top: 4, backgroundColor: Theme.colors.surface },
  pressed: { opacity: 0.5 },
  txid: { color: Theme.colors.text, fontSize: 13, lineHeight: 21, fontFamily: 'monospace' },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default SentScreen;
