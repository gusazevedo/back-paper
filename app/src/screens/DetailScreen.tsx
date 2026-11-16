import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ConfirmSheet } from '../components/Sheet';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/icons/Icon';
import { useCategories } from '../features/categories/useCategories';
import { useDownload } from '../features/download/useDownload';
import { showOnlyCategory } from '../features/feed/filter';
import { useWallpaperFolders } from '../features/folders/queries';
import { SaveSheet } from '../features/folders/SaveSheet';
import { EditSheet } from '../features/wallpaper/EditSheet';
import { ReportSheet } from '../features/wallpaper/ReportSheet';
import {
  EDIT_WINDOW_MS,
  useDeleteWallpaper,
  useReportWallpaper,
  useToggleLike,
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
  const like = useToggleLike(id, me ?? '');
  const report = useReportWallpaper(id, me ?? '');
  const [reportOpen, setReportOpen] = useState(false);
  const canLike = !!w && !!me && w.author_id !== me;
  const heart = useHeartBurst();
  const onImageTap = useDoubleTap(() => {
    if (!canLike) return;
    heart.play();
    // R-LIKE: a double tap only ever likes; unliking is the button's job.
    if (!w.liked_by_me) like.mutate(true);
  });

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
        {w && w.author_id !== me ? (
          <ReportButton onPress={() => setReportOpen(true)} />
        ) : null}
      </View>

      <View style={styles.imageArea}>
        <Pressable
          onPress={onImageTap}
          accessible={false}
          style={styles.frame}
          testID="detail-image"
        >
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
          <Animated.View
            pointerEvents="none"
            style={[styles.burst, heart.style]}
          >
            <Icon
              name="heart"
              size={96}
              color={colors.textOnDark}
              fill={colors.textOnDark}
            />
          </Animated.View>
        </Pressable>
      </View>

      {w ? (
        <Info
          wallpaper={w}
          me={me ?? ''}
          onToggleLike={() => like.mutate(!w.liked_by_me)}
          onDeleted={() => navigation.goBack()}
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
      <ReportSheet
        visible={reportOpen}
        busy={report.isPending}
        onCancel={() => setReportOpen(false)}
        onReport={reason =>
          report.mutate(reason, {
            onSuccess: () => {
              setReportOpen(false);
              ToastAndroid.show(t('report.done'), ToastAndroid.SHORT);
              // R-REP-3: it is gone for the reporter, so leave the detail.
              navigation.goBack();
            },
            onError: () =>
              ToastAndroid.show(t('report.failed'), ToastAndroid.LONG),
          })
        }
      />
    </View>
  );
}

function Info({
  wallpaper: w,
  me,
  onToggleLike,
  onPickCategory,
  onDeleted,
}: {
  wallpaper: WallpaperDetail;
  me: string;
  onToggleLike: () => void;
  onDeleted: () => void;
  onPickCategory: (slug: string) => void;
}) {
  const mine = w.author_id === me;
  const categories = useCategories();
  const [saveOpen, setSaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const remove = useDeleteWallpaper(w.id);
  const folders = useWallpaperFolders(w.id, !mine);
  const saved = (folders.data?.length ?? 0) > 0;
  // Chips follow the fixed category order, not the order they were picked in.
  const chips = useMemo(() => {
    const slugs = new Set(w.wallpaper_categories.map(c => c.category_slug));
    return (categories.data ?? []).filter(c => slugs.has(c.slug));
  }, [categories.data, w.wallpaper_categories]);
  const author = w.author?.display_name ?? '';
  const likes = formatCount(w.like_count);
  const { status: download, download: startDownload } = useDownload(
    w.id,
    w.original_key,
  );
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
              selected={w.liked_by_me}
              onPress={onToggleLike}
              accessibilityLabel={`${
                w.liked_by_me ? t('detail.unlike') : t('detail.like')
              }, ${
                w.like_count === 1
                  ? t('detail.likesOne')
                  : t('detail.likesMany', { count: likes })
              }`}
              leading={
                <Icon
                  name="heart"
                  size={20}
                  color={w.liked_by_me ? colors.like : colors.text}
                  fill={w.liked_by_me ? colors.like : 'none'}
                />
              }
            />
            <Button
              variant="secondary"
              label={saved ? t('detail.saved') : t('detail.save')}
              selected={saved}
              onPress={() => setSaveOpen(true)}
              leading={
                <Icon
                  name="bookmark"
                  size={20}
                  fill={saved ? colors.text : 'none'}
                />
              }
            />
          </>
        )}
        <View style={styles.grow}>
          <Button
            label={
              download === 'downloading'
                ? t('detail.downloading')
                : download === 'done'
                ? t('detail.downloadedLabel')
                : t('detail.download')
            }
            // Ignore taps while saving instead of greying the button out.
            onPress={download === 'downloading' ? undefined : startDownload}
            leading={
              download === 'downloading' ? (
                <ActivityIndicator size="small" color={colors.textOnDark} />
              ) : (
                <Icon
                  name={download === 'done' ? 'check' : 'download'}
                  size={20}
                  color={colors.textOnDark}
                />
              )
            }
          />
        </View>
        {canEdit ? (
          <Button
            variant="secondary"
            label={t('detail.edit')}
            onPress={() => setEditOpen(true)}
            leading={<Icon name="edit" size={20} />}
          />
        ) : null}
        {mine ? (
          <Button
            variant="dangerOutline"
            label={t('detail.delete')}
            onPress={() => setDeleteOpen(true)}
            leading={<Icon name="trash" size={20} color={colors.danger} />}
          />
        ) : null}
      </View>
      {mine ? (
        <>
          <EditSheet
            wallpaper={w}
            visible={editOpen}
            onDismiss={() => setEditOpen(false)}
          />
          <ConfirmSheet
            visible={deleteOpen}
            title={t('detail.deleteTitle')}
            message={t('detail.deleteBody')}
            confirmLabel={t('detail.delete')}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              if (remove.isPending) return;
              remove.mutate(undefined, {
                onSuccess: () => {
                  setDeleteOpen(false);
                  ToastAndroid.show(t('detail.deleted'), ToastAndroid.SHORT);
                  onDeleted();
                },
                onError: () =>
                  ToastAndroid.show(
                    t('detail.deleteFailed'),
                    ToastAndroid.LONG,
                  ),
              });
            }}
          />
        </>
      ) : (
        <SaveSheet
          wallpaperId={w.id}
          userId={me}
          visible={saveOpen}
          onDismiss={() => setSaveOpen(false)}
        />
      )}
    </>
  );
}

function ReportButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.report, pressed && styles.pressed]}
    >
      <Icon name="flag" size={18} color={colors.textMuted} />
      <Text style={styles.reportLabel}>{t('detail.report')}</Text>
    </Pressable>
  );
}

/** Calls `onDoubleTap` when two taps land within 300 ms. */
function useDoubleTap(onDoubleTap: () => void) {
  const last = useRef(0);
  return () => {
    const now = Date.now();
    if (now - last.current < 300) {
      last.current = 0;
      onDoubleTap();
    } else {
      last.current = now;
    }
  };
}

/** A white heart that pops over the image when a double tap likes it. */
function useHeartBurst() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => () => progress.stopAnimation(), [progress]);
  return {
    play: () => {
      progress.setValue(0);
      Animated.sequence([
        Animated.spring(progress, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 2,
          duration: 250,
          delay: 250,
          useNativeDriver: true,
        }),
      ]).start();
    },
    style: {
      opacity: progress.interpolate({
        inputRange: [0, 0.2, 1, 2],
        outputRange: [0, 1, 1, 0],
      }),
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0.4, 1, 1.1],
          }),
        },
      ],
    },
  };
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
  burst: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { paddingHorizontal: spacing.xl, gap: spacing.xs },
  retry: { marginTop: spacing.md },
  loading: { height: 120, alignItems: 'center', justifyContent: 'center' },
});
