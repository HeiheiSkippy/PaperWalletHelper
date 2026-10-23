import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Online app only.
export interface Spec extends TurboModule {
  copy(text: string): void;
}

let cached: Spec | null = null;

export function copyText(): Spec {
  if (cached === null) {
    cached = TurboModuleRegistry.getEnforcing<Spec>('CopyText');
  }
  return cached;
}
