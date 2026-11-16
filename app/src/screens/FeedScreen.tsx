import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { useFeed } from '../features/feed/queries';
import { t } from '../i18n';
import { queryKeys } from '../lib/queryClient';
import { useRefreshFromStart } from '../lib/useRefreshFromStart';
import { BOTTOM_NAV_CLEARANCE } from '../navigation/BottomNav';
import { colors, spacing, typography } from '../theme';

/**
 * Public feed: 2-column grid of thumbnails, newest first, infinite scroll and
 * pull-to-refresh (R-FEED-1, -2, -4, -5). Sort and category filter arrive with #7,
 * the detail screen with #6.
 */
export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const { refreshing, refresh } = useRefreshFromStart(queryKeys.feed);
  const items = feed.data?.pages.flat() ?? [];
  const bottomInset = BOTTOM_NAV_CLEARANCE + insets.bottom;

  let body;
  if (feed.isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('feed.loading')}
          color={colors.text}
        />
      </View>
    );
  } else if (feed.isError && items.length === 0) {
    body = (
      <View
        accessibilityRole="alert"
        style={[styles.center, { paddingBottom: bottomInset }]}
      >
        <Text style={[typography.sheetTitle, styles.centerText]}>
          {t('feed.error.title')}
        </Text>
        <Text style={[typography.bodySmall, styles.message]}>
          {t('feed.error.body')}
        </Text>
        <Button
          label={t('feed.retry')}
          variant="secondary"
          onPress={() => feed.refetch()}
        />
      </View>
    );
  } else {
    body = (
      <WallpaperGrid
        items={items}
        bottomInset={bottomInset}
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isError) {
            feed.fetchNextPage();
          }
        }}
        footer={
          feed.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator
                accessibilityLabel={t('feed.loadingMore')}
                color={colors.text}
              />
            </View>
          ) : feed.isFetchNextPageError ? (
            <View style={styles.footer}>
              <Button
                label={t('feed.loadMoreFailed')}
                variant="ghost"
                onPress={() => feed.fetchNextPage()}
              />
            </View>
          ) : null
        }
        empty={
          <View style={styles.empty}>
            <Text style={[typography.sheetTitle, styles.centerText]}>
              {t('feed.empty.title')}
            </Text>
            <Text style={[typography.bodySmall, styles.message]}>
              {t('feed.empty.body')}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text accessibilityRole="header" style={typography.brand}>
          {t('feed.title')}
        </Text>
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerText: { textAlign: 'center' },
  message: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: spacing.xxl,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
