import { t } from '../src/i18n';

describe('i18n', () => {
  it('resolves a key to its English string', () => {
    expect(t('tabs.feed')).toBe('Feed');
  });
});
