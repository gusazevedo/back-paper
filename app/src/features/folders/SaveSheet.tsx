import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/icons/Icon';
import { NameSheet } from '../../components/NameSheet';
import { Sheet } from '../../components/Sheet';
import { t } from '../../i18n';
import { colors, fonts, radii, spacing, typography } from '../../theme';
import {
  FOLDER_NAME_MAX,
  FolderNameTakenError,
  folderNameProblem,
  useCreateFolder,
  useFolders,
  useToggleFolder,
  useWallpaperFolders,
} from './queries';

type Props = {
  wallpaperId: string;
  userId: string;
  visible: boolean;
  onDismiss: () => void;
};

/**
 * R-FOLD-7: the viewer's folders with a check on those holding the wallpaper;
 * a tap adds or removes it, "New folder" creates one and saves it there.
 */
export function SaveSheet({ wallpaperId, userId, visible, onDismiss }: Props) {
  const [naming, setNaming] = useState(false);
  const folders = useFolders(visible || naming);
  const saved = useWallpaperFolders(wallpaperId);
  const toggle = useToggleFolder(wallpaperId);
  const create = useCreateFolder(userId, wallpaperId);
  const savedIn = new Set(saved.data ?? []);
  const taken = (folders.data ?? []).map(f => f.name);

  return (
    <>
      <Sheet visible={visible && !naming} onDismiss={onDismiss} compact>
        <Text
          accessibilityRole="header"
          style={[typography.sheetTitle, styles.title]}
        >
          {t('folders.save.title')}
        </Text>
        <Text style={[typography.bodySmall, styles.body]}>
          {t('folders.save.body')}
        </Text>
        {folders.isPending ? (
          <ActivityIndicator
            accessibilityLabel={t('folders.loading')}
            color={colors.text}
            style={styles.loading}
          />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.rows}>
            {(folders.data ?? []).map(f => {
              const on = savedIn.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={f.name}
                  onPress={() =>
                    toggle.mutate(
                      { folderId: f.id, add: !on },
                      {
                        onError: () =>
                          ToastAndroid.show(
                            t('folders.save.failed'),
                            ToastAndroid.SHORT,
                          ),
                      },
                    )
                  }
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="folder" size={22} />
                  <Text style={styles.name}>{f.name}</Text>
                  {on ? (
                    <Icon name="check" size={22} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            create.reset();
            setNaming(true);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Icon name="plus" size={22} />
          <Text style={styles.name}>{t('folders.new')}</Text>
        </Pressable>
        <View style={styles.done}>
          <Button label={t('folders.save.done')} onPress={onDismiss} />
        </View>
      </Sheet>
      <NameSheet
        visible={visible && naming}
        heading={t('folders.new')}
        label={t('folders.nameLabel')}
        cta={t('folders.createAndSave')}
        maxLength={FOLDER_NAME_MAX}
        validate={name =>
          folderNameProblem(name, taken) === 'taken'
            ? t('folders.nameTaken')
            : null
        }
        serverError={
          create.error instanceof FolderNameTakenError
            ? t('folders.nameTaken')
            : create.error
            ? t('folders.createFailed')
            : null
        }
        busy={create.isPending}
        onSubmit={name =>
          create.mutate(name, { onSuccess: () => setNaming(false) })
        }
        // Back to the folder list, as in the design.
        onCancel={() => setNaming(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.sm, paddingHorizontal: spacing.sm },
  body: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  loading: { height: 52 },
  list: { flexGrow: 0, maxHeight: 280 },
  rows: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.field - 2,
  },
  pressed: { backgroundColor: colors.background },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  done: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
});
