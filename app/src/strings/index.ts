import en from './en';
import ko from './ko';
import type { Dict, Language } from './types';
export type { Language } from './types';

// alt names each language in the other one, for a reader who knows only that.
export const LANGUAGES: { code: Language; label: string; alt: string }[] = [
  { code: 'ko', label: '한국어', alt: 'Korean' },
  { code: 'en', label: 'English', alt: '영어' },
];

const dicts: Record<Language, Dict> = { ko, en };

export function t(lang: Language, key: string, params?: Record<string, string>): string {
  let text = dicts[lang][key] ?? ko[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(value);
    }
  }
  return text;
}
