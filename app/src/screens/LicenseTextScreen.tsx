import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { Language, t } from '../strings';
import { Theme } from '../theme';

type Props = { language: Language; title: string; text: string; onBack: () => void };

const LicenseTextScreen: React.FC<Props> = ({ language, title, text, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Theme.space.lg }]}>
        <Text style={styles.text} selectable>
          {text}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg },
  text: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
});

export default LicenseTextScreen;
