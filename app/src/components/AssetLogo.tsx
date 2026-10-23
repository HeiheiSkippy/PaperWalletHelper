import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

const LOGOS: Record<string, ImageSourcePropType> = {
  BTC: require('../assets/logos/btc.png'),
  BMB: require('../assets/logos/bmb.png'),
  BTCBMB: require('../assets/logos/btcbmb.png'),
  BSC: require('../assets/logos/bsc.png'),
  BNB: require('../assets/logos/bnb.png'),
  WBMB: require('../assets/logos/wbmb.png'),
  USDT: require('../assets/logos/usdt.png'),
};

type Props = { symbol: string; size?: number };

// Symbols without a published logo (MOVN) get a lettered disc instead.
const AssetLogo: React.FC<Props> = ({ symbol, size = 24 }) => {
  const logo = LOGOS[symbol];
  if (logo) {
    return <Image source={logo} style={{ width: size, height: size }} />;
  }
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{symbol.slice(0, 1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.border,
    borderWidth: 1,
    borderColor: Theme.colors.textFaint,
  },
  letter: { color: Theme.colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 4 },
});

// The signer cannot tell BTC from BMB, so an unknown chain shows the joined mark.
export function chainSymbols(chain: string | null): string[] {
  return chain === 'BTC' || chain === 'BMB' || chain === 'BSC' ? [chain] : ['BTCBMB'];
}

export const LogoRow: React.FC<{ symbols: string[]; size?: number }> = ({ symbols, size }) => (
  <View style={styles.row}>
    {symbols.map(s => (
      <AssetLogo key={s} symbol={s} size={size} />
    ))}
  </View>
);

export default AssetLogo;
