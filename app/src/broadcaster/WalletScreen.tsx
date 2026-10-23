import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import ScreenHeader from '../components/ScreenHeader';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { grouped } from '../components/TxDetails';
import { Button, Warn } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import { walletLogos } from './HomeScreen';
import { MAX_MEMO_LENGTH, MAX_NAME_LENGTH, Wallet } from './wallets';

type Props = {
  language: Language;
  mode: 'add' | 'edit';
  wallet: Wallet;
  exists?: boolean;
  onBack: () => void;
  onSave: (wallet: Wallet) => void;
  onRemove?: () => void;
};

const WalletScreen: React.FC<Props> = ({ language, mode, wallet, exists, onBack, onSave, onRemove }) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [name, setName] = useState(wallet.name);
  const [memo, setMemo] = useState(wallet.memo);
  const confirmRemove = () =>
    Alert.alert(wallet.name, t(language, 'bc.wallet.removeConfirm'), [
      { text: t(language, 'common.cancel'), style: 'cancel' },
      { text: t(language, 'bc.wallet.remove'), style: 'destructive', onPress: onRemove },
    ]);

  return (
    <View style={[styles.container, { paddingBottom: (keyboard || insets.bottom) + Theme.space.lg }]}>
      <ScreenHeader
        title={t(language, mode === 'add' ? 'bc.add.title' : 'bc.edit.title')}
        onBack={onBack}
        backLabel={t(language, 'nav.back')}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.head}>
            <LogoRow symbols={walletLogos(wallet)} size={20} />
            <Text style={styles.kind}>{t(language, `bc.add.kind.${wallet.kind}`)}</Text>
          </View>
          <Text style={styles.label}>{t(language, 'bc.add.address')}</Text>
          <Text style={styles.address} selectable={false}>
            {grouped(wallet.address)}
          </Text>
        </View>

        <Text style={styles.label}>{t(language, 'bc.add.name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          autoCorrect={false}
          selectionColor={Theme.colors.primary}
        />
        <Text style={styles.label}>{t(language, 'bc.add.memo')}</Text>
        <TextInput
          style={styles.input}
          value={memo}
          onChangeText={setMemo}
          maxLength={MAX_MEMO_LENGTH}
          autoCorrect={false}
          selectionColor={Theme.colors.primary}
        />
        {exists && <Warn>{t(language, 'bc.add.exists')}</Warn>}
        {onRemove !== undefined && (
          <Button label={t(language, 'bc.wallet.remove')} kind="danger" onPress={confirmRemove} style={styles.remove} />
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={t(language, mode === 'add' ? 'bc.add.save' : 'bc.edit.save')}
          kind="primary"
          disabled={exists || name.trim() === ''}
          onPress={() => onSave({ ...wallet, name: name.trim(), memo: memo.trim() })}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.space.lg, gap: Theme.space.sm },
  card: {
    padding: Theme.space.md,
    gap: Theme.space.xs,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm, marginBottom: Theme.space.xs },
  kind: { color: Theme.colors.text, fontSize: 14, fontWeight: '800' },
  label: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: Theme.space.xs },
  address: { color: Theme.colors.text, fontSize: 16, lineHeight: 25, fontFamily: 'monospace', fontWeight: '700' },
  input: {
    minHeight: 48,
    paddingHorizontal: Theme.space.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    color: Theme.colors.text,
    fontSize: 16,
  },
  remove: { marginTop: Theme.space.xl },
  footer: { paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
});

export default WalletScreen;
