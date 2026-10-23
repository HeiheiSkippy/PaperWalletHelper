import React, { useEffect, useRef } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

const TITLE_MS = 1500;

type Props = { appName: string; logo: ImageSourcePropType; onDone: () => void };

const TitleScreen: React.FC<Props> = ({ appName, logo, onDone }) => {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), TITLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const split = appName.lastIndexOf(' ');
  return (
    <View style={styles.screen}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.name}>{appName.slice(0, split)}</Text>
      <Text style={styles.accent}>{appName.slice(split + 1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.space.xl,
  },
  logo: { width: 168, height: 168, marginBottom: Theme.space.xl },
  name: { color: Theme.colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  accent: { color: Theme.colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
});

export default TitleScreen;
