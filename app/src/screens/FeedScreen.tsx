import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Icon } from '../components/icons/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { Sheet } from '../components/Sheet';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { useCategories } from '../features/categories/useCategories';
import {
  clearFeedCategories,
  FeedSort,
  setFeedSort,
  toggleFeedCategory,
  useFeedFilter,
} from '../features/feed/filter';
import { feedQueryKey, useFeed, useFeedCount } from '../features/feed/queries';
import { t } from '../i18n';
import { useRefreshFromStart } from '../lib/useRefreshFromStart';
import { BOTTOM_NAV_CLEARANCE } from '../navigation/BottomNav';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, radii, spacing, typography } from '../theme';

/**
 * Public feed: 2-column grid of thumbnails with infinite scroll and
 * pull-to-refresh (R-FEED-1..5), sorted by Recent or Most liked and filtered by
 * any of the selected categories (R-CAT-2, R-FEED-3).
 */
export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filter = useFeedFilter();
  const feed = useFeed(filter);
  const queryKey = feedQueryKey(filter);
  const { refreshing, refresh } = useRefreshFromStart(queryKey);
  const [sheetOpen, setSheetOpen] = useState(false);
  const items = feed.data?.pages.flat() ?? [];
  const bottomInset = BOTTOM_NAV_CLEARANCE + insets.bottom;
  const filtered = filter.categories.length > 0;

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
        // A new filter or sort starts at the top of its own list.
        key={JSON.stringify(queryKey)}
        items={items}
        onPressItem={item =>
          navigation.navigate('Detail', {
            id: item.id,
            thumbKey: item.thumb_key,
          })
        }
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
              {filtered ? t('feed.emptyFiltered.title') : t('feed.empty.title')}
            </Text>
            <Text style={[typography.bodySmall, styles.message]}>
              {filtered ? t('feed.emptyFiltered.body') : t('feed.empty.body')}
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
        <SegmentedControl<FeedSort>
          accessibilityLabel={t('feed.sortBy')}
          value={filter.sort}
          onChange={setFeedSort}
          options={[
            { value: 'recent', label: t('feed.recent') },
            { value: 'liked', label: t('feed.mostLiked') },
          ]}
        />
      </View>
      <FilterRow
        selected={filter.categories}
        onOpen={() => setSheetOpen(true)}
      />
      {body}
      <CategoriesSheet
        visible={sheetOpen}
        selected={filter.categories}
        onDismiss={() => setSheetOpen(false)}
      />
    </View>
  );
}

function FilterRow({
  selected,
  onOpen,
}: {
  selected: string[];
  onOpen: () => void;
}) {
  const categories = useCategories();
  const chosen = (categories.data ?? []).filter(c => selected.includes(c.slug));
  return (
    <View style={styles.filterRow}>
      <Chip
        label={t('feed.categories')}
        accessibilityLabel={
          selected.length
            ? t('feed.categoriesSelected', { count: selected.length })
            : t('feed.categories')
        }
        onPress={onOpen}
        trailing={
          selected.length ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selected.length}</Text>
            </View>
          ) : null
        }
      />
      {chosen.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.flex}
          contentContainerStyle={styles.selectedChips}
        >
          {chosen.map(c => (
            <Chip
              key={c.slug}
              label={c.label}
              selected
              accessibilityLabel={t('feed.removeCategory', { name: c.label })}
              onPress={() => toggleFeedCategory(c.slug)}
              trailing={
                <Icon
                  name="close"
                  size={14}
                  strokeWidth={2.5}
                  color={colors.textOnDark}
                />
              }
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={typography.caption}>{t('feed.allCategories')}</Text>
      )}
    </View>
  );
}

/** Multi-select of the 12 categories; changes apply to the feed right away. */
function CategoriesSheet({
  visible,
  selected,
  onDismiss,
}: {
  visible: boolean;
  selected: string[];
  onDismiss: () => void;
}) {
  const categories = useCategories();
  const count = useFeedCount(selected, visible);
  const show =
    count.data === undefined
      ? t('feed.sheet.show')
      : count.data === 1
      ? t('feed.sheet.showOne')
      : t('feed.sheet.showMany', { count: count.data });
  return (
    <Sheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.sheetHeader}>
        <Text accessibilityRole="header" style={typography.sheetTitle}>
          {t('feed.sheet.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={clearFeedCategories}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Text style={typography.label}>{t('feed.sheet.clear')}</Text>
        </Pressable>
      </View>
      <Text style={typography.bodySmall}>{t('feed.sheet.body')}</Text>
      <View style={styles.sheetChips}>
        {(categories.data ?? []).map(c => (
          <Chip
            key={c.slug}
            label={c.label}
            selected={selected.includes(c.slug)}
            onPress={() => toggleFeedCategory(c.slug)}
          />
        ))}
      </View>
      <Button label={show} onPress={onDismiss} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 6,
  },
  selectedChips: { gap: 6, paddingRight: spacing.lg },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.chip, fontSize: 12, color: colors.textOnDark },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clear: {
    height: 44,
    marginRight: -12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  sheetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    paddingBottom: spacing.sm,
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
