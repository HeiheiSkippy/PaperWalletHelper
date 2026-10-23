import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  isDeviceSecure(): boolean;
  openSecuritySettings(): void;
  unlock(title: string): Promise<void>;
  // Online app: true once after it came back from the background.
  relockNeeded(): boolean;
}

let cached: Spec | null = null;

export function appLock(): Spec {
  if (cached === null) {
    cached = TurboModuleRegistry.getEnforcing<Spec>('AppLock');
  }
  return cached;
}
