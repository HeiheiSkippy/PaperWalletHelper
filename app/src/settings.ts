import { LANGUAGES, Language } from './strings';
import { settingsStore } from './specs/NativeSettingsStore';

export const CONSENT_VERSION = '2026-10-22';

export type Settings = { language: Language | null; consentVersion: string };

const EMPTY: Settings = { language: null, consentVersion: '' };

function isLanguage(code: unknown): code is Language {
  return LANGUAGES.some(item => item.code === code);
}

// The online app keeps its wallets beside the settings.
export function loadStored(): Record<string, unknown> | null {
  const text = settingsStore().load();
  if (text === '') {
    return null;
  }
  try {
    const data = JSON.parse(text) as unknown;
    return data !== null && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function readSettings(data: Record<string, unknown> | null): Settings {
  if (data === null) {
    return EMPTY;
  }
  return {
    language: isLanguage(data.language) ? data.language : null,
    consentVersion: typeof data.consentVersion === 'string' ? data.consentVersion : '',
  };
}

export function loadSettings(): Settings {
  return readSettings(loadStored());
}

export function saveSettings(settings: Settings, extra: Record<string, unknown> = {}): void {
  settingsStore().save(JSON.stringify({ ...extra, ...settings }));
}

export function settingsTampered(): boolean {
  return settingsStore().tampered();
}
