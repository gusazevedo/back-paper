import { t } from '../src/i18n';

describe('i18n', () => {
  it('resolves a key to its English string', () => {
    expect(t('tabs.feed')).toBe('Feed');
  });
});

describe('i18n params', () => {
  it('fills placeholders', () => {
    expect(t('profile.publishedMany', { count: 3 })).toBe(
      '3 wallpapers published',
    );
  });
});
