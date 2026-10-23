import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Theme } from '../theme';

type Props = { value: string; size?: number };

const QrBox: React.FC<Props> = ({ value, size = 240 }) => (
  <View style={styles.qr}>
    <QRCode value={value} size={size} backgroundColor="#FFFFFF" />
  </View>
);

const styles = StyleSheet.create({
  qr: { padding: Theme.space.md, borderRadius: Theme.radius.sm, backgroundColor: '#FFFFFF' },
});

export default QrBox;
