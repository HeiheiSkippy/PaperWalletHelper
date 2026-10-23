import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Saved settings as JSON, or "" when nothing is saved or the stored value
  // fails its Keystore check (then tampered() is true and the value is gone).
  load(): string;
  save(json: string): void;
  tampered(): boolean;

  getAppVersion(): string;
}

let cached: Spec | null = null;

export function settingsStore(): Spec {
  if (cached === null) {
    cached = TurboModuleRegistry.getEnforcing<Spec>('SettingsStore');
  }
  return cached;
}
