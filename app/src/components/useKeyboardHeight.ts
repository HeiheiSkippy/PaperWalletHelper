import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Android 15+ no longer resizes edge-to-edge apps for the keyboard.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version < 35) {
      return;
    }
    const show = Keyboard.addListener('keyboardDidShow', e => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
