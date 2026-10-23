import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QR_FRAME_MS, qrPieceCount } from '../core/qr';
import { Language, t } from '../strings';
import { Theme } from '../theme';
import QrBox from './QrBox';

type Props = { language: Language; parts: string[] };

const AnimatedQr: React.FC<Props> = ({ language, parts }) => {
  const [at, setAt] = useState(0);
  const total = parts.length;
  const pieces = qrPieceCount(parts);

  useEffect(() => {
    setAt(0);
    if (total < 2) {
      return;
    }
    const timer = setInterval(() => setAt(was => (was + 1) % total), QR_FRAME_MS);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <View style={styles.qr}>
      <QrBox value={parts[at % total]} />
      {pieces > 1 && (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(((at % pieces) + 1) / pieces) * 100}%` }]} />
          </View>
          <Text style={styles.part}>{t(language, 'qr.pieces', { total: String(pieces) })}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  qr: { alignItems: 'center', gap: Theme.space.sm },
  track: { width: 272, height: 4, borderRadius: 2, backgroundColor: Theme.colors.disabled, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: Theme.colors.primary },
  part: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
});

export default AnimatedQr;
