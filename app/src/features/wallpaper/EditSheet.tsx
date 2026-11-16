import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { t } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import { useCategories } from '../categories/useCategories';
import { MAX_CATEGORIES, MAX_TITLE } from '../publish/types';
import {
  EditWindowClosedError,
  useUpdateWallpaper,
  WallpaperDetail,
} from './queries';

type Props = {
  wallpaper: WallpaperDetail;
  visible: boolean;
  onDismiss: () => void;
};

/** R-EDIT-1: title (up to 60) and 1–5 categories; the image never changes. */
export function EditSheet({ wallpaper: w, visible, onDismiss }: Props) {
  const categories = useCategories();
  const update = useUpdateWallpaper(w.id);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  // Every opening starts from what is saved now.
  useEffect(() => {
    if (!visible) return;
    setTitle(w.title ?? '');
    setSelected(w.wallpaper_categories.map(c => c.category_slug));
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (slug: string) =>
    setSelected(cur =>
      cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug],
    );
  const invalid = selected.length < 1 || selected.length > MAX_CATEGORIES;
  const closed = update.error instanceof EditWindowClosedError;

  const save = () => {
    if (invalid || update.isPending) return;
    // Keep categories in the fixed list's order.
    const order = (categories.data ?? []).map(c => c.slug);
    update.mutate(
      {
        title: title.trim(),
        categories: [...selected].sort(
          (a, b) => order.indexOf(a) - order.indexOf(b),
        ),
      },
      { onSuccess: onDismiss },
    );
  };

  return (
    <Sheet visible={visible} onDismiss={onDismiss} title={t('edit.title')}>
      <Text style={[typography.bodySmall, styles.body]}>{t('edit.body')}</Text>
      <TextField
        label={t('publish.titleLabel')}
        value={title}
        onChangeText={v => setTitle(v.slice(0, MAX_TITLE))}
        maxLength={MAX_TITLE}
        counterMax={MAX_TITLE}
      />
      <View style={styles.catHeader}>
        <Text style={typography.fieldLabel}>
          {t('publish.categoriesLabel')}
        </Text>
        <Text style={[typography.fieldLabel, styles.tabular]}>
          {`${selected.length}/${MAX_CATEGORIES}`}
        </Text>
      </View>
      <View
        accessibilityLabel={t('publish.categoriesLabel')}
        style={styles.chips}
      >
        {(categories.data ?? []).map(c => {
          const on = selected.includes(c.slug);
          return (
            <Chip
              key={c.slug}
              label={c.label}
              selected={on}
              disabled={!on && selected.length >= MAX_CATEGORIES}
              onPress={() => toggle(c.slug)}
            />
          );
        })}
      </View>
      {update.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {closed ? t('edit.closed') : t('edit.failed')}
        </Text>
      ) : null}
      <Button
        label={t('edit.save')}
        onPress={save}
        disabled={invalid || update.isPending || closed}
      />
      <Button
        label={t('common.cancel')}
        variant="secondary"
        onPress={onDismiss}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: spacing.xs },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    marginTop: -6,
    paddingBottom: spacing.xs,
  },
  error: { ...typography.caption, color: colors.danger },
});
