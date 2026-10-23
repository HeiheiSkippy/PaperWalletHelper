import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoRow } from '../components/AssetLogo';
import { Button, Warn } from '../components/ui';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import Balances, { BalanceBook } from './Balances';
import { Asset } from './flow';
import { Wallet } from './wallets';

type Props = {
  language: Language;
  tampered: boolean;
  wallets: Wallet[];
  book: BalanceBook;
  refreshing: boolean;
  onRefresh: () => void;
  expanded: ReadonlySet<string>;
  onAdd: () => void;
  onToggle: (wallet: Wallet) => void;
  onReload: (wallet: Wallet) => void;
  onEdit: (wallet: Wallet) => void;
  onAsset: (wallet: Wallet, asset: Asset) => void;
  onReceive: (wallet: Wallet) => void;
  onSendFrom: (wallet: Wallet) => void;
  onMove: (index: number, step: -1 | 1) => void;
  onSend: () => void;
  onSettings: () => void;
};

export function walletLogos(wallet: Wallet): string[] {
  return wallet.kind === 'btc' ? ['BTCBMB'] : ['BSC'];
}

export function shortGrouped(address: string): string {
  const g = (s: string) => s.match(/.{1,4}/g)?.join(' ') ?? s;
  return `${g(address.slice(0, 8))} … ${g(address.slice(-8))}`;
}

const HomeScreen: React.FC<Props> = ({
  language,
  tampered,
  wallets,
  book,
  refreshing,
  onRefresh,
  expanded,
  onAdd,
  onToggle,
  onReload,
  onEdit,
  onAsset,
  onReceive,
  onSendFrom,
  onMove,
  onSend,
  onSettings,
}) => {
  const insets = useSafeAreaInsets();
  const [ordering, setOrdering] = useState(false);
  const reordering = ordering && wallets.length > 1;
  return (
    <View style={[styles.container, { paddingTop: insets.top + Theme.space.lg, paddingBottom: insets.bottom + Theme.space.lg }]}>
      <View style={styles.top}>
        <Pressable
          onPress={onSettings}
          hitSlop={Theme.space.md}
          accessibilityRole="button"
          accessibilityLabel={t(language, 'bc.home.settings')}>
          <View style={styles.more}>
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
            progressBackgroundColor={Theme.colors.surface}
          />
        }>
        <Text style={styles.title}>
          PaperWallet Helper{'\n'}
          <Text style={styles.accent}>Online</Text>
        </Text>

        {tampered && <Warn>{t(language, 'settings.tampered')}</Warn>}

        <View style={styles.caption}>
          {reordering ? (
            <>
              <Text style={styles.hint}>{t(language, 'bc.home.reorderHint')}</Text>
              <Pressable onPress={() => setOrdering(false)} hitSlop={Theme.space.sm} accessibilityRole="button">
                <Text style={styles.add}>{t(language, 'bc.home.reorderDone')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={onAdd} hitSlop={Theme.space.sm} accessibilityRole="button">
                <Text style={styles.add}>{t(language, 'bc.home.add')}</Text>
              </Pressable>
              {wallets.length > 1 && (
                <Pressable
                  onPress={() => setOrdering(true)}
                  hitSlop={Theme.space.sm}
                  accessibilityRole="button"
                  accessibilityLabel={t(language, 'bc.home.reorder')}
                  style={styles.handle}>
                  <View style={styles.handleLine} />
                  <View style={styles.handleLine} />
                  <View style={styles.handleLine} />
                </Pressable>
              )}
            </>
          )}
        </View>

        {wallets.length === 0 ? (
          <Pressable onPress={onAdd} style={({ pressed }) => [styles.empty, pressed && styles.pressed]}>
            <Text style={styles.emptyText}>{t(language, 'bc.home.empty')}</Text>
          </Pressable>
        ) : (
          wallets.map((w, i) => {
            const open = !reordering && expanded.has(w.address);
            return (
              <View key={w.address} style={[styles.card, open && styles.cardOpen]}>
                <Pressable
                  onPress={() => onToggle(w)}
                  disabled={reordering}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={({ pressed }) => [styles.fold, pressed && styles.pressed]}>
                  <LogoRow symbols={walletLogos(w)} size={22} />
                  <View style={styles.main}>
                    <Text style={styles.name} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={styles.address}>{shortGrouped(w.address)}</Text>
                    {w.memo !== '' && (
                      <Text style={styles.memo} numberOfLines={1}>
                        {w.memo}
                      </Text>
                    )}
                  </View>
                  {reordering ? (
                    <>
                      <MoveButton
                        glyph="↑"
                        label={t(language, 'bc.home.moveUp')}
                        disabled={i === 0}
                        onPress={() => onMove(i, -1)}
                      />
                      <MoveButton
                        glyph="↓"
                        label={t(language, 'bc.home.moveDown')}
                        disabled={i === wallets.length - 1}
                        onPress={() => onMove(i, 1)}
                      />
                    </>
                  ) : (
                    <View style={[styles.chevron, open && styles.chevronUp]} />
                  )}
                </Pressable>
                {open && (
                  <View style={styles.open}>
                    <View style={styles.openHead}>
                      <Text style={styles.captionText}>{t(language, 'bc.wallet.balances')}</Text>
                      {Object.values(book[w.address] ?? {}).some(b => b?.status === 'loading') ? (
                        <ActivityIndicator size="small" color={Theme.colors.primary} style={styles.reload} />
                      ) : (
                        <Pressable
                          onPress={() => onReload(w)}
                          hitSlop={Theme.space.sm}
                          accessibilityRole="button"
                          accessibilityLabel={t(language, 'bc.balance.refresh')}
                          style={({ pressed }) => [styles.reload, pressed && styles.pressed]}>
                          <Text style={styles.reloadGlyph}>↻</Text>
                        </Pressable>
                      )}
                    </View>
                    <Balances language={language} wallet={w} book={book} large onAsset={a => onAsset(w, a)} />
                    <View style={styles.actions}>
                      <Button label={t(language, 'bc.wallet.edit')} onPress={() => onEdit(w)} style={styles.action} />
                      <Button label={t(language, 'bc.wallet.receive')} onPress={() => onReceive(w)} style={styles.action} />
                      <Button
                        label={t(language, 'bc.home.send')}
                        kind="primary"
                        onPress={() => onSendFrom(w)}
                        style={styles.action}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Button
        label={t(language, 'bc.home.send')}
        kind="primary"
        onPress={onSend}
        disabled={reordering}
        style={styles.cta}
      />
    </View>
  );
};

const MoveButton: React.FC<{ glyph: string; label: string; disabled: boolean; onPress: () => void }> = ({
  glyph,
  label,
  disabled,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    style={({ pressed }) => [styles.move, pressed && styles.pressed]}>
    <Text style={[styles.moveGlyph, disabled && styles.moveOff]}>{glyph}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.space.lg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  more: { paddingHorizontal: Theme.space.sm, paddingVertical: Theme.space.xs, gap: 4 },
  moreDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Theme.colors.textMuted },
  body: { gap: Theme.space.md, paddingBottom: Theme.space.lg },
  title: { marginTop: 48, color: Theme.colors.text, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.5 },
  accent: { color: Theme.colors.primary },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Theme.space.sm,
    minHeight: 28,
    marginTop: Theme.space.md,
  },
  hint: { flex: 1, color: Theme.colors.textMuted, fontSize: 13 },
  handle: { gap: 4, paddingHorizontal: 2, paddingVertical: Theme.space.xs },
  handleLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: Theme.colors.textMuted },
  move: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  moveGlyph: { color: Theme.colors.primary, fontSize: 18, fontWeight: '700' },
  moveOff: { color: Theme.colors.disabled },
  captionText: { color: Theme.colors.textFaint, fontSize: 13, fontWeight: '700' },
  add: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700' },
  empty: {
    padding: Theme.space.lg,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Theme.colors.border,
  },
  emptyText: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  card: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
  },
  cardOpen: { borderColor: Theme.colors.primaryDim },
  fold: { flexDirection: 'row', alignItems: 'center', gap: Theme.space.sm, padding: Theme.space.md },
  main: { flex: 1, gap: 2 },
  name: { color: Theme.colors.text, fontSize: 16, fontWeight: '700' },
  chevron: {
    width: 10,
    height: 10,
    marginHorizontal: Theme.space.xs,
    marginTop: -5,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Theme.colors.textMuted,
    transform: [{ rotate: '45deg' }],
  },
  chevronUp: { marginTop: 5, transform: [{ rotate: '-135deg' }] },
  address: { color: Theme.colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  memo: { color: Theme.colors.textFaint, fontSize: 13 },
  open: {
    paddingHorizontal: Theme.space.md,
    paddingBottom: Theme.space.md,
    paddingTop: Theme.space.sm,
    gap: Theme.space.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  openHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -Theme.space.xs },
  reload: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  reloadGlyph: { color: Theme.colors.primary, fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Theme.space.sm },
  action: { flex: 1, minHeight: 44 },
  pressed: { opacity: 0.7 },
  cta: { minHeight: 56, marginTop: Theme.space.sm },
});

export default HomeScreen;
