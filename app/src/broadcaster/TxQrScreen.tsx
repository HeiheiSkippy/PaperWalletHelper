import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedQr from '../components/AnimatedQr';
import ScreenHeader from '../components/ScreenHeader';
import TxSummary from '../components/TxSummary';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Pending } from './flow';

type Props = {
  language: Language;
  pending: Pending;
  steps: React.ReactNode;
  onBack: () => void;
  onLoadSigned: () => void;
};

const TxQrScreen: React.FC<Props> = ({ language, pending, steps, onBack, onLoadSigned }) => {
  const insets = useSafeAreaInsets();
  const { parts } = pending;
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.qr.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      {steps}
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>{t(language, 'bc.qr.lead')}</Text>
        <AnimatedQr language={language} parts={parts} />
        <TxSummary language={language} loaded={pending.loaded} title={t(language, 'bc.qr.summary')} />
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t(language, 'bc.qr.loadSigned')} kind="primary" onPress={onLoadSigned} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.lg },
  lead: { color: Theme.colors.text, fontSize: 15, lineHeight: 22 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default TxQrScreen;
