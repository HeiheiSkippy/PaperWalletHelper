import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedQr from '../components/AnimatedQr';
import ScreenHeader from '../components/ScreenHeader';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Loaded } from '../tx';
import TxSummary from '../components/TxSummary';

type Props = { language: Language; loaded: Loaded; parts: string[]; onClose: () => void };

const ResultScreen: React.FC<Props> = ({ language, loaded, parts, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'signer.result.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.lead}>
          <View style={styles.check}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.leadText}>{t(language, 'signer.result.lead')}</Text>
        </View>
        <AnimatedQr language={language} parts={parts} />
        <TxSummary language={language} loaded={loaded} />
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'common.close')} kind="primary" onPress={onClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.lg },
  lead: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: Theme.colors.success, fontSize: 17, fontWeight: '900' },
  leadText: { flex: 1, color: Theme.colors.text, fontSize: 15, lineHeight: 22 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default ResultScreen;
