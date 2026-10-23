import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import TxDetails from '../components/TxDetails';
import { Button } from '../components/ui';
import { BtcBlock } from '../core/btc/psbt';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Loaded } from '../tx';

type Props = {
  language: Language;
  loaded: Loaded;
  steps?: React.ReactNode;
  onBack: () => void;
  onSign: () => void;
};

function blockText(language: Language, block: BtcBlock): string {
  if (block.kind === 'fee-rate') {
    return t(language, 'signer.review.block.fee-rate', {
      rate: block.feeRate.toFixed(1),
      max: String(block.max),
    });
  }
  return t(language, `signer.review.block.${block.kind}`);
}

const ReviewScreen: React.FC<Props> = ({ language, loaded, steps, onBack, onSign }) => {
  const insets = useSafeAreaInsets();
  const blocked = loaded.kind === 'btc' ? loaded.view.blocked : [];
  const warnings = loaded.kind === 'btc' ? loaded.view.warnings : [];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'signer.review.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      {steps}
      <ScrollView contentContainerStyle={styles.body}>
        <TxDetails language={language} loaded={loaded} chainNote />

        {warnings.map(w => (
          <View key={w.kind} style={styles.notice}>
            <Text style={styles.noticeText}>{t(language, `signer.review.warn.${w.kind}`)}</Text>
          </View>
        ))}
        {blocked.length > 0 && (
          <View style={[styles.notice, styles.noticeDanger]}>
            <Text style={styles.dangerTitle}>{t(language, 'signer.review.blocked')}</Text>
            {blocked.map((b, i) => (
              <Text key={i} style={styles.dangerText}>
                · {blockText(language, b)}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={t(language, 'signer.review.sign')}
          kind="primary"
          disabled={blocked.length > 0}
          onPress={onSign}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.md },
  notice: {
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  noticeText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700' },
  noticeDanger: { borderColor: Theme.colors.dangerText, gap: Theme.space.xs },
  dangerTitle: { color: Theme.colors.dangerText, fontSize: 15, fontWeight: '800' },
  dangerText: { color: Theme.colors.text, fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default ReviewScreen;
