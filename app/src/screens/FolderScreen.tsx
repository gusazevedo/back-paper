import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { NameSheet } from '../components/NameSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { SheetOption } from '../components/SheetOption';
import { GridItem, WallpaperGrid } from '../components/WallpaperGrid';
import { folderCountLabel } from '../features/folders/FolderGrid';
import {
  FOLDER_NAME_MAX,
  FolderNameTakenError,
  folderNameProblem,
  useDeleteFolder,
  useFolderWallpapers,
  useFolders,
  useRemoveFromFolder,
  useRenameFolder,
} from '../features/folders/queries';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, fonts, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Folder'>;

type SheetName = 'options' | 'rename' | 'delete' | 'remove';

/**
 * One of my folders: its wallpapers, most recently added first; a tap opens the
 * detail. The ⋯ menu renames or deletes it, the × takes a wallpaper out (R-FOLD-3).
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
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [removing, setRemoving] = useState<GridItem | null>(null);
  const rename = useRenameFolder(id);
  const remove = useDeleteFolder(id);
  const removeItem = useRemoveFromFolder(id);
  const name = folder?.name ?? route.params.name ?? '';
  // Keeping this folder's own name (even in another case) is fine.
  const otherNames = (folders.data ?? [])
    .filter(f => f.id !== id)
    .map(f => f.name);
  const close = () => {
    setSheet(null);
    setRemoving(null);
  };

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
        onRemoveItem={item => {
          setRemoving(item);
          setSheet('remove');
        }}
        removeLabel={item =>
          t('folders.removeItem', { title: item.title ?? t('detail.image') })
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
        title={name}
        subtitle={folder ? folderCountLabel(folder.item_count) : undefined}
        leadingLabel={t('common.back')}
        onLeadingPress={() => navigation.goBack()}
        trailing={
          folder ? (
            <IconButton
              icon="more"
              accessibilityLabel={t('folders.options')}
              onPress={() => setSheet('options')}
            />
          ) : null
        }
      />
      {body}
      <Sheet visible={sheet === 'options'} onDismiss={close} compact>
        <SheetOption
          icon="edit"
          label={t('folders.rename')}
          onPress={() => {
            rename.reset();
            setSheet('rename');
          }}
        />
        <SheetOption
          icon="trash"
          label={t('folders.delete')}
          destructive
          onPress={() => setSheet('delete')}
        />
      </Sheet>
      <NameSheet
        visible={sheet === 'rename'}
        heading={t('folders.renameTitle')}
        label={t('folders.nameLabel')}
        cta={t('folders.renameCta')}
        maxLength={FOLDER_NAME_MAX}
        initial={name}
        validate={value =>
          folderNameProblem(value, otherNames) === 'taken'
            ? t('folders.nameTaken')
            : null
        }
        serverError={
          rename.error instanceof FolderNameTakenError
            ? t('folders.nameTaken')
            : rename.error
            ? t('folders.renameFailed')
            : null
        }
        busy={rename.isPending}
        onSubmit={value => rename.mutate(value, { onSuccess: close })}
        onCancel={close}
      />
      <ConfirmSheet
        visible={sheet === 'delete'}
        title={t('folders.deleteTitle')}
        message={t('folders.deleteBody')}
        confirmLabel={t('folders.delete')}
        onCancel={close}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              close();
              navigation.goBack();
            },
            onError: () =>
              ToastAndroid.show(t('folders.deleteFailed'), ToastAndroid.SHORT),
          })
        }
      />
      <ConfirmSheet
        visible={sheet === 'remove' && !!removing}
        variant="dangerSoft"
        title={t('folders.removeTitle')}
        message={t('folders.removeBody', {
          title: removing?.title ?? t('detail.image'),
          folder: name,
        })}
        confirmLabel={t('folders.remove')}
        onCancel={close}
        onConfirm={() => {
          if (removing) {
            removeItem.mutate(removing.id, {
              onError: () =>
                ToastAndroid.show(
                  t('folders.removeFailed'),
                  ToastAndroid.SHORT,
                ),
            });
          }
          close();
        }}
      />
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
