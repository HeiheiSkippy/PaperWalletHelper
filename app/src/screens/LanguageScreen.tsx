import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { LANGUAGES, Language, t } from '../strings';
import { Theme } from '../theme';

type Props = {
  language: Language;
  onSelect: (lang: Language) => void;
  mode?: 'onboarding' | 'settings';
  onNext?: () => void;
  onBack?: () => void;
};

const LanguageScreen: React.FC<Props> = ({
  language,
  onSelect,
  mode = 'onboarding',
  onNext,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const settings = mode === 'settings';

  return (
    <View style={styles.container}>
      {settings ? (
        <ScreenHeader
          title={t(language, 'language.title')}
          backLabel={t(language, 'nav.back')}
          onBack={onBack ?? noop}
        />
      ) : null}

      <View
        style={[
          styles.pad,
          {
            paddingTop: settings ? Theme.space.lg : insets.top + Theme.space.lg,
            paddingBottom: insets.bottom + Theme.space.lg,
          },
        ]}>
        {settings ? null : (
          <View style={styles.topGap} />
        )}

        <View style={styles.list}>
          {LANGUAGES.map(item => {
            const selected = item.code === language;
            return (
              <Pressable
                key={item.code}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => onSelect(item.code)}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={styles.rowAlt}>{item.alt}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <Text style={styles.check}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        {settings ? null : (
          <Pressable style={styles.nextButton} onPress={onNext ?? noop}>
            <Text style={styles.nextText}>{t(language, 'language.next')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

function noop() {}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  pad: { flex: 1, paddingHorizontal: Theme.space.lg },
  topGap: { height: Theme.space.xl },
  title: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Theme.space.md,
  },
  list: { flex: 1, gap: Theme.space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.space.md,
    paddingHorizontal: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  rowSelected: { borderColor: Theme.colors.primary },
  rowText: { gap: 2 },
  rowLabel: { color: Theme.colors.textMuted, fontSize: 22 },
  rowAlt: { color: Theme.colors.textFaint, fontSize: 15 },
  rowLabelSelected: { color: Theme.colors.text, fontWeight: '600' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: Theme.colors.onPrimary, fontSize: 12, fontWeight: '900' },
  radioSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary,
  },
  nextButton: {
    height: 56,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: Theme.colors.onPrimary, fontSize: 17, fontWeight: '700' },
});

export default LanguageScreen;
