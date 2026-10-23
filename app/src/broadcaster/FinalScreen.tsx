import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import TxDetails from '../components/TxDetails';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { Pending } from './flow';

type Props = {
  language: Language;
  pending: Pending;
  steps: React.ReactNode;
  busy: boolean;
  error: string | null;
  notice: string | null;
  unknown: boolean;
  onBack: () => void;
  onSend: () => void;
  onClose: () => void;
};

const FinalScreen: React.FC<Props> = ({ language, pending, steps, busy, error, notice, unknown, onBack, onSend, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Theme.space.lg }]}>
      <ScreenHeader title={t(language, 'bc.final.title')} onBack={busy || unknown ? undefined : onBack} backLabel={t(language, 'nav.back')} />
      {steps}
      <ScrollView contentContainerStyle={styles.body}>
        <TxDetails language={language} loaded={pending.loaded} />
        <View style={styles.checked}>
          <Text style={styles.checkMark}>✓</Text>
          <Text style={styles.checkedText}>{t(language, 'bc.final.checked')}</Text>
        </View>
        {error !== null && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {notice !== null && <Text style={styles.wait}>{notice}</Text>}
        {busy ? (
          <ActivityIndicator color={Theme.colors.primary} style={styles.busy} />
        ) : unknown ? (
          <Button label={t(language, 'common.close')} kind="primary" onPress={onClose} />
        ) : (
          <Button label={t(language, 'bc.final.send')} kind="primary" onPress={onSend} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.md },
  checked: { flexDirection: 'row', gap: Theme.space.sm, alignItems: 'flex-start' },
  checkMark: { color: Theme.colors.success, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  checkedText: { flex: 1, color: Theme.colors.textMuted, fontSize: 13, lineHeight: 20 },
  notice: {
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.dangerText,
  },
  noticeText: { color: Theme.colors.text, fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
  busy: { minHeight: 48 },
  wait: { color: Theme.colors.primary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: Theme.space.sm },
});

export default FinalScreen;
