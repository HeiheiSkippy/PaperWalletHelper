import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Language, t } from '../strings';
import { Theme } from '../theme';

type Props = {
  appName: string;
  language: Language;
  mode?: 'onboarding' | 'review';
  onDone: () => void;
};

const ITEMS = [
  'about',
  'pair',
  'source',
  'device',
  'keys',
  'disclaimer',
] as const;
type ItemKey = (typeof ITEMS)[number];

const ConsentScreen: React.FC<Props> = ({ appName, language, mode = 'onboarding', onDone }) => {
  const insets = useSafeAreaInsets();
  const review = mode === 'review';

  const [checked, setChecked] = useState<Record<ItemKey, boolean>>({
    about: false,
    pair: false,
    source: false,
    device: false,
    keys: false,
    disclaimer: false,
  });

  const split = appName.lastIndexOf(' ');
  const allChecked = ITEMS.every(key => checked[key]);
  const canProceed = review || allChecked;

  const toggle = (key: ItemKey) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + Theme.space.lg }]}>
      <Text style={styles.appName}>
        {appName.slice(0, split)}
        {'\n'}
        <Text style={styles.accent}>{appName.slice(split + 1)}</Text>
      </Text>
      <Text style={styles.title}>{t(language, 'consent.title')}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}>
        {!review && (
          <Text style={styles.lead}>{t(language, 'consent.lead')}</Text>
        )}

        {ITEMS.map(key => (
          <View key={key} style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, `consent.${key}.title`)}</Text>

            <Text style={styles.cardDesc}>{t(language, `consent.${key}.desc`)}</Text>

            {!review && (
              <Pressable style={styles.checkRow} onPress={() => toggle(key)}>
                <View style={[styles.checkbox, checked[key] && styles.checkboxOn]}>
                  {checked[key] && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text
                  style={[styles.checkLabel, checked[key] && styles.checkLabelOn]}>
                  {t(language, `consent.${key}.check`)}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Theme.space.lg }]}>
        <Pressable
          style={[styles.button, !canProceed && styles.buttonDisabled]}
          disabled={!canProceed}
          onPress={onDone}>
          <Text style={[styles.buttonText, !canProceed && styles.buttonTextDisabled]}>
            {t(language, review ? 'common.close' : 'consent.start')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  appName: {
    color: Theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    paddingHorizontal: Theme.space.lg,
    marginTop: Theme.space.md,
  },
  accent: { color: Theme.colors.primary },
  title: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: Theme.space.lg,
    marginTop: Theme.space.xl + Theme.space.sm,
    marginBottom: Theme.space.md,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.lg,
    gap: Theme.space.md,
  },
  lead: {
    color: Theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.space.md,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Theme.space.sm,
  },
  cardDesc: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 22 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
    marginTop: Theme.space.md,
    paddingTop: Theme.space.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary,
  },
  checkMark: { color: Theme.colors.onPrimary, fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, color: Theme.colors.textMuted, fontSize: 14 },
  checkLabelOn: { color: Theme.colors.text },
  footer: {
    paddingHorizontal: Theme.space.lg,
    paddingTop: Theme.space.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  button: {
    height: 56,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: Theme.colors.disabled },
  buttonText: { color: Theme.colors.onPrimary, fontSize: 17, fontWeight: '700' },
  buttonTextDisabled: { color: Theme.colors.disabledText },
});

export default ConsentScreen;
