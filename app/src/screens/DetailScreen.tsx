import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/icons/Icon';
import { useCategories } from '../features/categories/useCategories';
import { showOnlyCategory } from '../features/feed/filter';
import {
  EDIT_WINDOW_MS,
  useWallpaper,
  WallpaperDetail,
} from '../features/wallpaper/queries';
import { t } from '../i18n';
import { formatCount, relativeTime } from '../lib/format';
import { publicUrl } from '../lib/storage';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, fonts, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

/**
 * One wallpaper (§4.4). Opens over the tabs, so closing returns to the grid where
 * it was. Actions depend on ownership; they get their behaviour in #8–#14 and
 * the author link in #15. A category chip filters the feed by it (R-DET-1).
 */
export function DetailScreen({ navigation, route }: Props) {
  const { id, thumbKey } = route.params;
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const me = auth.status === 'signed-in' ? auth.session.user.id : null;
  const wallpaper = useWallpaper(id);
  const w = wallpaper.data;

  const thumb = w?.thumb_key ?? thumbKey;
  const missing = wallpaper.isError && isNotFound(wallpaper.error);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 6,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <View style={styles.topBar}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => navigation.goBack()}
        />
        {w && w.author_id !== me ? <ReportButton /> : null}
      </View>

      <View style={styles.imageArea}>
        <View style={styles.frame}>
          {thumb ? (
            <FastImage
              accessibilityIgnoresInvertColors
              source={{ uri: publicUrl(thumb) }}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
            />
          ) : null}
          {w ? (
            // Laid over the thumbnail, which stays visible until the original arrives.
            <FastImage
              testID="detail-original"
              accessible
              accessibilityRole="image"
              accessibilityLabel={w.title ?? t('detail.image')}
              source={{
                uri: publicUrl(w.original_key),
                cache: FastImage.cacheControl.immutable,
              }}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
            />
          ) : null}
        </View>
      </View>

      {w ? (
        <Info
          wallpaper={w}
          mine={w.author_id === me}
          onPickCategory={slug => {
            showOnlyCategory(slug);
            navigation.navigate('Tabs', { screen: 'Feed' });
          }}
        />
      ) : wallpaper.isError ? (
        <View accessibilityRole="alert" style={styles.message}>
          <Text style={typography.sheetTitle}>
            {missing ? t('detail.unavailable.title') : t('detail.error.title')}
          </Text>
          <Text style={typography.bodySmall}>
            {missing ? t('detail.unavailable.body') : t('detail.error.body')}
          </Text>
          {missing ? null : (
            <View style={styles.retry}>
              <Button
                label={t('detail.retry')}
                variant="secondary"
                onPress={() => wallpaper.refetch()}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator
            accessibilityLabel={t('detail.loading')}
            color={colors.text}
          />
        </View>
      )}
    </View>
  );
}

function Info({
  wallpaper: w,
  mine,
  onPickCategory,
}: {
  wallpaper: WallpaperDetail;
  mine: boolean;
  onPickCategory: (slug: string) => void;
}) {
  const categories = useCategories();
  // Chips follow the fixed category order, not the order they were picked in.
  const chips = useMemo(() => {
    const slugs = new Set(w.wallpaper_categories.map(c => c.category_slug));
    return (categories.data ?? []).filter(c => slugs.has(c.slug));
  }, [categories.data, w.wallpaper_categories]);
  const author = w.author?.display_name ?? '';
  const likes = formatCount(w.like_count);
  const canEdit =
    mine && Date.now() - Date.parse(w.created_at) < EDIT_WINDOW_MS;

  return (
    <>
      <View style={styles.info}>
        {w.title ? (
          <Text accessibilityRole="header" style={typography.title}>
            {w.title}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail.author', { name: author })}
            style={styles.author}
          >
            <Avatar name={author} uri={w.author?.avatar_url} size={24} />
            <Text style={styles.authorName}>{author}</Text>
          </Pressable>
          <Text style={typography.caption} importantForAccessibility="no">
            ·
          </Text>
          <Text style={typography.caption}>{relativeTime(w.created_at)}</Text>
          {mine ? (
            <>
              <Text style={typography.caption} importantForAccessibility="no">
                ·
              </Text>
              <Text style={typography.caption}>
                {w.like_count === 1
                  ? t('detail.likesOne')
                  : t('detail.likesMany', { count: likes })}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('detail.categories')}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {chips.map(c => (
          <Chip
            key={c.slug}
            label={c.label}
            onPress={() => onPickCategory(c.slug)}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        {mine ? null : (
          <>
            <Button
              variant="secondary"
              label={likes}
              accessibilityLabel={
                w.like_count === 1
                  ? `${t('detail.like')}, ${t('detail.likesOne')}`
                  : `${t('detail.like')}, ${t('detail.likesMany', {
                      count: likes,
                    })}`
              }
              leading={<Icon name="heart" size={20} />}
            />
            <Button
              variant="secondary"
              label={t('detail.save')}
              leading={<Icon name="bookmark" size={20} />}
            />
          </>
        )}
        <View style={styles.grow}>
          <Button
            label={t('detail.download')}
            leading={
              <Icon name="download" size={20} color={colors.textOnDark} />
            }
          />
        </View>
        {canEdit ? (
          <Button
            variant="secondary"
            label={t('detail.edit')}
            leading={<Icon name="edit" size={20} />}
          />
        ) : null}
        {mine ? (
          <Button
            variant="dangerOutline"
            label={t('detail.delete')}
            leading={<Icon name="trash" size={20} color={colors.danger} />}
          />
        ) : null}
      </View>
    </>
  );
}

function ReportButton() {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.report, pressed && styles.pressed]}
    >
      <Icon name="flag" size={18} color={colors.textMuted} />
      <Text style={styles.reportLabel}>{t('detail.report')}</Text>
    </Pressable>
  );
}

/** PostgREST answers `.single()` on zero rows with PGRST116. */
function isNotFound(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'PGRST116'
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  reportLabel: { ...typography.caption, fontFamily: fonts.medium },
  pressed: { backgroundColor: colors.surfaceMuted },
  imageArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: 18,
    paddingHorizontal: spacing.xl,
  },
  frame: {
    height: '100%',
    maxWidth: '100%',
    aspectRatio: 9 / 16,
    borderRadius: radii.panel,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  info: { paddingHorizontal: spacing.xl },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  authorName: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  chipsScroll: { flexGrow: 0 },
  chips: { gap: 6, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  grow: { flex: 1, minWidth: 0 },
  message: { paddingHorizontal: spacing.xl, gap: spacing.xs },
  retry: { marginTop: spacing.md },
  loading: { height: 120, alignItems: 'center', justifyContent: 'center' },
});
