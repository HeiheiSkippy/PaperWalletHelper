import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Caption, Group, Row } from '../components/ListGroup';
import ScreenHeader from '../components/ScreenHeader';
import { REPO_URL } from '../licenses';
import { LANGUAGES, Language, t } from '../strings';
import { Theme } from '../theme';

type Props = {
  language: Language;
  version: string;
  onBack: () => void;
  onLanguage: () => void;
  onConsent: () => void;
  onLicenses: () => void;
};

// A zero-width space lets a narrow screen break the address after the account name.
const repoText = REPO_URL.replace('https://', '').replace('HeiheiSkippy/', 'HeiheiSkippy/​');

const SettingsScreen: React.FC<Props> = ({ language, version, onBack, onLanguage, onConsent, onLicenses }) => {
  const insets = useSafeAreaInsets();
  const current = LANGUAGES.find(l => l.code === language)?.label ?? '';
  return (
    <View style={styles.container}>
      <ScreenHeader title={t(language, 'settings.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Theme.space.lg }]}>
        <Caption>{t(language, 'settings.general')}</Caption>
        <Group>
          <Row label={t(language, 'settings.language')} value={current} onPress={onLanguage} />
          <Row label={t(language, 'settings.consent')} onPress={onConsent} />
        </Group>
        <Caption>{t(language, 'settings.about')}</Caption>
        <Group>
          <Row label={t(language, 'settings.version')} value={version} />
          <Row label={t(language, 'settings.source')} sub={repoText} />
          <Row label={t(language, 'settings.licenses')} onPress={onLicenses} />
        </Group>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { paddingHorizontal: Theme.space.lg },
});

export default SettingsScreen;
