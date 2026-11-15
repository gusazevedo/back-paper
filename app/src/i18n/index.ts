import { en, Translations } from './en';

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T];

export type TranslationKey = Paths<Translations>;

const dictionaries = { en } satisfies Record<string, Translations>;

export type Locale = keyof typeof dictionaries;

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(key: TranslationKey): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      dictionaries[currentLocale],
    );
  return typeof value === 'string' ? value : key;
}
