import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

export function useNavigator<ScreenName extends string>(initial: ScreenName) {
  const [stack, setStack] = useState<ScreenName[]>([initial]);

  const current = stack[stack.length - 1];

  const push = useCallback((name: ScreenName) => {
    setStack(prev => [...prev, name]);
  }, []);

  const pop = useCallback(() => {
    let moved = false;
    setStack(prev => {
      if (prev.length <= 1) {
        return prev;
      }
      moved = true;
      return prev.slice(0, -1);
    });
    return moved;
  }, []);

  const popTo = useCallback((name: ScreenName) => {
    setStack(prev => {
      const at = prev.lastIndexOf(name);
      return at < 0 ? [name] : prev.slice(0, at + 1);
    });
  }, []);

  const reset = useCallback((name: ScreenName) => {
    setStack([name]);
  }, []);

  const custom = useRef<(() => void) | null>(null);
  const setBackAction = useCallback((action: (() => void) | null) => {
    custom.current = action;
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (custom.current) {
        custom.current();
        return true;
      }
      if (stack.length <= 1) {
        return false;
      }
      setStack(prev => (prev.length <= 1 ? prev : prev.slice(0, -1)));
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);

  return { current, push, pop, popTo, reset, setBackAction };
}
