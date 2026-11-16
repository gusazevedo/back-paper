import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { folderCountLabel } from '../features/folders/FolderGrid';
import { useFolderWallpapers, useFolders } from '../features/folders/queries';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, fonts, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Folder'>;

/**
 * One of my folders: its wallpapers, most recently added first; a tap opens the
 * detail. Rename, Delete and remove item arrive with #11.
 */
export function FolderScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const folders = useFolders();
  const items = useFolderWallpapers(id);
  const folder = folders.data?.find(f => f.id === id);
  // Deleted elsewhere, or not mine: RLS hides it from my_folders.
  const missing = folders.isSuccess && !folder;
  const list = items.data?.pages.flat() ?? [];

  let body;
  if (missing) {
    body = (
      <Text
        accessibilityRole="alert"
        style={[typography.bodySmall, styles.message]}
      >
        {t('folders.unavailable')}
      </Text>
    );
  } else if (items.isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('folders.loading')}
          color={colors.text}
        />
      </View>
    );
  } else if (items.isError && list.length === 0) {
    body = (
      <View accessibilityRole="alert" style={styles.errorBox}>
        <Text style={[typography.bodySmall, styles.messageText]}>
          {t('folders.error')}
        </Text>
        <Button
          label={t('folders.retry')}
          variant="secondary"
          onPress={() => items.refetch()}
        />
      </View>
    );
  } else {
    body = (
      <WallpaperGrid
        items={list}
        onPressItem={item =>
          navigation.navigate('Detail', {
            id: item.id,
            thumbKey: item.thumb_key,
          })
        }
        bottomInset={insets.bottom + 34}
        refreshing={items.isRefetching}
        onRefresh={() => {
          items.refetch();
          folders.refetch();
        }}
        onEndReached={() => {
          if (items.hasNextPage && !items.isFetchingNextPage) {
            items.fetchNextPage();
          }
        }}
        empty={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('folders.empty.title')}</Text>
            <Text style={[typography.bodySmall, styles.messageText]}>
              {t('folders.empty.body')}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <ScreenHeader
        title={folder?.name ?? route.params.name}
        subtitle={folder ? folderCountLabel(folder.item_count) : undefined}
        leadingLabel={t('common.back')}
        onLeadingPress={() => navigation.goBack()}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { paddingVertical: 72, paddingHorizontal: 28, textAlign: 'center' },
  messageText: { textAlign: 'center' },
  errorBox: { paddingVertical: 72, paddingHorizontal: 28, gap: spacing.lg },
  empty: { gap: 6, paddingVertical: 72, paddingHorizontal: 28 },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
});
