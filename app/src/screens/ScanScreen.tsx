import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { Button } from '../components/ui';
import { Language, t } from '../strings';
import QrScannerView from '../specs/QrScannerViewNativeComponent';
import { Theme } from '../theme';

type Props = {
  language: Language;
  title: string;
  hint: string;
  above?: React.ReactNode;
  below?: React.ReactNode;
  progress?: { got: number; total: number } | null;
  onBack: () => void;
  // Returns an error to show, null once the value has been taken, or
  // undefined to keep reading (a multi-part QR still being collected).
  onValue: (text: string) => string | null | undefined;
};

type Access = 'asking' | 'granted' | 'denied';

const ScanScreen: React.FC<Props> = ({ language, title, hint, above, below, progress, onBack, onValue }) => {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // Capped by height so the messages under the camera stay on screen.
  const frameSize = Math.min(window.width - Theme.space.lg * 2, window.height * 0.42);
  const [access, setAccess] = useState<Access>('asking');
  const [problem, setProblem] = useState<string | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      .then(result => {
        if (alive) {
          setAccess(result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
        }
      })
      .catch(() => {
        if (alive) {
          setAccess('denied');
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const onQrCode = useCallback(
    (event: { nativeEvent: { value: string } }) => {
      if (finished.current) {
        return;
      }
      const error = onValue(event.nativeEvent.value);
      if (error === null) {
        finished.current = true;
        return;
      }
      setProblem(error === undefined ? null : error);
    },
    [onValue],
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title={title} onBack={onBack} backLabel={t(language, 'nav.back')} />
      {above}

      <View style={styles.cameraArea}>
        <View style={[styles.frame, { width: frameSize, height: frameSize }]}>
          {access === 'granted' ? (
            <>
              <QrScannerView style={styles.camera} active onQrCode={onQrCode} />
              <View style={styles.aim} pointerEvents="none">
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </>
          ) : (
            <Text style={styles.blocked}>
              {access === 'denied' ? t(language, 'scan.denied') : ''}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {access === 'denied' ? (
          <>
            <Text style={styles.hint}>{t(language, 'scan.deniedHint')}</Text>
            <Button
              label={t(language, 'scan.openSettings')}
              onPress={() => Linking.openSettings()}
              style={styles.wide}
            />
          </>
        ) : (
          <>
            {progress ? (
              <View style={styles.progress}>
                <Text style={styles.status}>
                  {t(language, 'scan.progress', { got: String(progress.got), total: String(progress.total) })}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(progress.got / progress.total) * 100}%` }]} />
                </View>
              </View>
            ) : null}
            {problem !== null && (
              <View style={styles.problem}>
                <Text style={styles.problemText}>{problem}</Text>
              </View>
            )}
            <Text style={styles.hint}>{hint}</Text>
          </>
        )}
        {below}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  cameraArea: { alignItems: 'center', paddingHorizontal: Theme.space.lg, paddingTop: Theme.space.md },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: Theme.space.lg,
    paddingVertical: Theme.space.md,
    gap: Theme.space.md,
  },
  frame: {
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  camera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  aim: { width: '64%', aspectRatio: 1 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Theme.colors.primary },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: Theme.radius.sm },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: Theme.radius.sm },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: Theme.radius.sm },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: Theme.radius.sm,
  },
  blocked: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: Theme.space.lg,
  },
  hint: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  progress: { width: '100%', gap: Theme.space.xs },
  status: { color: Theme.colors.primary, fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: Theme.colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Theme.colors.primary },
  problem: {
    width: '100%',
    padding: Theme.space.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  problemText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700' },
  wide: { width: '100%' },
});

export default ScanScreen;
