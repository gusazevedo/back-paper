import { t, TranslationKey } from '../i18n';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const UNITS: [ms: number, one: TranslationKey, many: TranslationKey][] = [
  [365 * DAY, 'time.yearOne', 'time.yearMany'],
  [30 * DAY, 'time.monthOne', 'time.monthMany'],
  [7 * DAY, 'time.weekOne', 'time.weekMany'],
  [DAY, 'time.dayOne', 'time.dayMany'],
  [HOUR, 'time.hourOne', 'time.hourMany'],
  [MINUTE, 'time.minuteOne', 'time.minuteMany'],
];

/** "just now", "5 minutes ago", "3 days ago"… in the largest whole unit. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const elapsed = Math.max(now - Date.parse(iso), 0);
  for (const [ms, one, many] of UNITS) {
    const count = Math.floor(elapsed / ms);
    if (count >= 1) return count === 1 ? t(one) : t(many, { count });
  }
  return t('time.justNow');
}

/** 1284 → "1,284". Done by hand so it does not depend on the engine's Intl data. */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
