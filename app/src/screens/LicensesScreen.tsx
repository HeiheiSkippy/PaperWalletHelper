import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Caption, Group, Row } from '../components/ListGroup';
import ScreenHeader from '../components/ScreenHeader';
import { JS_LIBRARIES, NATIVE_LIBRARIES, ThirdParty, licenseLabel } from '../licenses';
import { Language, t } from '../strings';
import { Theme } from '../theme';

type Props = {
  language: Language;
  appName: string;
  onBack: () => void;
  onApp: () => void;
  onItem: (item: ThirdParty) => void;
};

const LicensesScreen: React.FC<Props> = ({ language, appName, onBack, onApp, onItem }) => {
  const insets = useSafeAreaInsets();
  const list = (items: ThirdParty[]) => (
    <Group>
      {items.map(item => (
        <Row
          key={item.name + item.version}
          label={item.name}
          sub={`${item.version} · ${item.holder.replace(/^Copyright\s*(\(c\)|©)?\s*/i, '')}`}
          value={licenseLabel(item.license)}
          onPress={() => onItem(item)}
        />
      ))}
    </Group>
  );
  return (
    <View style={styles.container}>
      <ScreenHeader title={t(language, 'licenses.title')} onBack={onBack} backLabel={t(language, 'nav.back')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Theme.space.lg }]}>
        <Caption>{t(language, 'licenses.app')}</Caption>
        <Group>
          <Row label={appName} value={t(language, 'licenses.appValue')} onPress={onApp} />
        </Group>
        <Caption>{t(language, 'licenses.oss')}</Caption>
        <Text style={styles.hint}>{t(language, 'licenses.hint')}</Text>
        {list(JS_LIBRARIES)}
        <Caption>{t(language, 'licenses.native')}</Caption>
        {list(NATIVE_LIBRARIES)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { paddingHorizontal: Theme.space.lg },
  hint: { color: Theme.colors.textMuted, fontSize: 13, marginBottom: Theme.space.sm, marginLeft: Theme.space.xs },
});

export default LicensesScreen;
