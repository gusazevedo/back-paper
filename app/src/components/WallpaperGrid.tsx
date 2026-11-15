import { FlashList } from '@shopify/flash-list';
import { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { publicUrl } from '../lib/storage';
import { colors, radii, spacing } from '../theme';

export type GridItem = { id: string; title: string | null; thumb_key: string };

type Props = {
  items: GridItem[];
  onPressItem?: (id: string) => void;
  onEndReached?: () => void;
  header?: ReactElement;
  empty?: ReactElement;
  bottomInset?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

const GAP = spacing.sm;

/** Two-column grid of thumbnails (45:64 tiles), shared by profile and feed screens. */
export function WallpaperGrid({
  items,
  onPressItem,
  onEndReached,
  header,
  empty,
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
            onPress={() => onPressItem?.(item.id)}
            style={styles.tile}
          >
            <Image
              source={{ uri: publicUrl(item.thumb_key) }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
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
});
