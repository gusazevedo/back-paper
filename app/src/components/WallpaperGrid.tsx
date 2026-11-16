import { FlashList } from '@shopify/flash-list';
import { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { publicUrl } from '../lib/storage';
import { colors, radii, spacing } from '../theme';
import { Icon } from './icons/Icon';

export type GridItem = { id: string; title: string | null; thumb_key: string };

type Props = {
  items: GridItem[];
  onPressItem?: (item: GridItem) => void;
  /** Adds an × in the corner of each tile (removing from a folder). */
  onRemoveItem?: (item: GridItem) => void;
  removeLabel?: (item: GridItem) => string;
  onEndReached?: () => void;
  header?: ReactElement;
  empty?: ReactElement;
  footer?: ReactElement | null;
  bottomInset?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

const GAP = spacing.sm;

/** Two-column grid of cached thumbnails (45:64 tiles), image only, shared by profile and feed screens. */
export function WallpaperGrid({
  items,
  onPressItem,
  onRemoveItem,
  removeLabel,
  onEndReached,
  header,
  empty,
  footer,
  bottomInset = 0,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <FlashList
      data={items}
      numColumns={2}
      keyExtractor={w => w.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{
        paddingHorizontal: spacing.md - GAP / 2,
        paddingBottom: bottomInset,
      }}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title ?? undefined}
            onPress={() => onPressItem?.(item)}
            style={styles.tile}
          >
            {/* Thumb keys are immutable (w/{id}/thumb.webp), so FastImage's default immutable cache fits. */}
            <FastImage
              source={{ uri: publicUrl(item.thumb_key) }}
              style={styles.image}
              objectFit="cover"
            />
          </Pressable>
          {onRemoveItem ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={removeLabel?.(item)}
              onPress={() => onRemoveItem(item)}
              style={styles.remove}
            >
              <View style={styles.removeBadge}>
                <Icon name="close" size={14} strokeWidth={2.5} />
              </View>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, paddingHorizontal: GAP / 2, paddingBottom: GAP },
  tile: {
    aspectRatio: 45 / 64,
    borderRadius: radii.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  image: { width: '100%', height: '100%' },
  // 44×44 touch target in the tile's top-right corner around a 28px badge.
  remove: {
    position: 'absolute',
    top: 0,
    right: GAP / 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    elevation: 3,
  },
});
