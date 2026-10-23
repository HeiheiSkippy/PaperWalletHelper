import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import { appLock } from '../specs/NativeAppLock';
import { Theme } from '../theme';

type Props = {
  appName: string;
  language: Language;
  onUnlocked: () => void;
};

const LockScreen: React.FC<Props> = ({ appName, language, onUnlocked }) => {
  const insets = useSafeAreaInsets();
  const [secure, setSecure] = useState(() => appLock().isDeviceSecure());
  const [failed, setFailed] = useState(false);

  const unlock = useCallback(() => {
    setFailed(false);
    appLock()
      .unlock(t(language, 'lock.prompt', { app: appName }))
      .then(onUnlocked)
      .catch(() => setFailed(true));
  }, [appName, language, onUnlocked]);

  useEffect(() => {
    if (secure) {
      unlock();
    }
    // Prompt once on arrival; later attempts come from the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Theme.space.lg + Theme.space.md, paddingBottom: insets.bottom + Theme.space.lg },
      ]}>
      <Text style={styles.appName}>
        {appName.slice(0, appName.lastIndexOf(' '))}
        {'\n'}
        <Text style={styles.accent}>{appName.slice(appName.lastIndexOf(' ') + 1)}</Text>
      </Text>
      <View style={styles.body}>
        <View style={styles.badge}>
          <View style={styles.shackle} />
          <View style={styles.lockBody} />
        </View>
        <Text style={styles.title}>{t(language, 'lock.title')}</Text>
        <Text style={styles.lead}>{t(language, secure ? 'lock.lead' : 'lock.noLock')}</Text>
        {secure && failed && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t(language, 'lock.failed')}</Text>
          </View>
        )}
      </View>
      <View style={styles.buttons}>
        {secure ? (
          <Button label={t(language, 'lock.button')} kind="primary" onPress={unlock} />
        ) : (
          <>
            <Button
              label={t(language, 'lock.openSettings')}
              kind="primary"
              onPress={() => appLock().openSecuritySettings()}
            />
            <Button
              label={t(language, 'lock.recheck')}
              onPress={() => setSecure(appLock().isDeviceSecure())}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.space.lg,
  },
  appName: {
    color: Theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  accent: { color: Theme.colors.primary },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Theme.space.md },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Theme.colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shackle: {
    width: 22,
    height: 16,
    marginBottom: -2,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderColor: Theme.colors.primary,
  },
  lockBody: { width: 34, height: 26, borderRadius: 6, backgroundColor: Theme.colors.primary },
  title: { color: Theme.colors.text, fontSize: 20, fontWeight: '700', marginTop: Theme.space.lg },
  lead: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Theme.space.sm,
  },
  notice: {
    marginTop: Theme.space.lg,
    padding: Theme.space.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  noticeText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  buttons: { gap: Theme.space.sm },
});

export default LockScreen;
