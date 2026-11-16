import { FlashList } from '@shopify/flash-list';
import { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Icon } from '../../components/icons/Icon';
import { t } from '../../i18n';
import { publicUrl } from '../../lib/storage';
import { colors, fonts, radii, spacing, typography } from '../../theme';
import { Folder } from './queries';

type Props = {
  folders: Folder[];
  onPressFolder: (folder: Folder) => void;
  /** The "New folder" card, first in the grid (R-FOLD-3). */
  onNewFolder: () => void;
  header?: ReactElement;
  footer?: ReactElement | null;
  bottomInset?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

const GAP = spacing.sm;
const NEW = 'new' as const;

export const folderCountLabel = (count: number) =>
  count === 1 ? t('folders.countOne') : t('folders.countMany', { count });

/** Profile's Folders tab: square covers (latest addition), name and count. */
export function FolderGrid({
  folders,
  onPressFolder,
  onNewFolder,
  header,
  footer,
  bottomInset = 0,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <FlashList
      data={[NEW, ...folders]}
      numColumns={2}
      keyExtractor={f => (f === NEW ? NEW : f.id)}
      getItemType={f => (f === NEW ? NEW : 'folder')}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{
        paddingHorizontal: spacing.md - GAP / 2,
        paddingBottom: bottomInset,
      }}
      renderItem={({ item }) => {
        if (item === NEW) {
          return (
            <View style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                onPress={onNewFolder}
                style={styles.card}
              >
                <View style={[styles.cover, styles.newCover]}>
                  <Icon name="plus" size={28} />
                </View>
                <Text style={[styles.name, styles.text]}>
                  {t('folders.new')}
                </Text>
              </Pressable>
            </View>
          );
        }
        const count = folderCountLabel(item.item_count);
        return (
          <View style={styles.cell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${count}`}
              onPress={() => onPressFolder(item)}
              style={styles.card}
            >
              <View style={styles.cover}>
                {item.cover_thumb_key ? (
                  <FastImage
                    source={{ uri: publicUrl(item.cover_thumb_key) }}
                    style={styles.image}
                    objectFit="cover"
                  />
                ) : (
                  <Icon
                    name="folder"
                    size={30}
                    strokeWidth={1.75}
                    color={colors.textMuted}
                  />
                )}
              </View>
              <View style={styles.text}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.count}>{count}</Text>
              </View>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, paddingHorizontal: GAP / 2, paddingBottom: 14 },
  card: { gap: spacing.sm },
  cover: {
    aspectRatio: 1,
    borderRadius: radii.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCover: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
  },
  image: { width: '100%', height: '100%' },
  text: { paddingHorizontal: 2 },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  count: { ...typography.caption, lineHeight: 18 },
});
