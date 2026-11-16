import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { signOut } from '../auth/google';
import { Avatar } from '../components/Avatar';
import { IconButton } from '../components/IconButton';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { Icon } from '../components/icons/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { SheetOption } from '../components/SheetOption';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { FolderGrid } from '../features/folders/FolderGrid';
import { useFolders } from '../features/folders/queries';
import {
  useProfile,
  useUserWallpapers,
  useWallpaperCount,
} from '../features/profile/queries';
import { t } from '../i18n';
import { BOTTOM_NAV_CLEARANCE } from '../navigation/BottomNav';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, spacing, typography } from '../theme';

type Section = 'published' | 'folders';

/**
 * My profile: header, then the Published grid or my private Folders (R-FOLD-1).
 * Managing folders arrives with #11, Settings with #16.
 */
export function ProfileScreen() {
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.session.user.id : '';
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const profile = useProfile(userId);
  const count = useWallpaperCount(userId);
  const wallpapers = useUserWallpapers(userId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<Section>('published');
  const folders = useFolders(section === 'folders');

  const items = wallpapers.data?.pages.flat() ?? [];
  const total = count.data ?? 0;
  const name = profile.data?.display_name ?? '';

  const bottomInset = BOTTOM_NAV_CLEARANCE + insets.bottom;
  const header = (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        {profile.data ? (
          <Avatar name={name} uri={profile.data.avatar_url} />
        ) : (
          <View style={styles.avatarSlot} />
        )}
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.name}>
            {name}
          </Text>
          <Text style={typography.caption}>
            {total === 1
              ? t('profile.publishedOne')
              : t('profile.publishedMany', { count: total })}
          </Text>
        </View>
        <IconButton
          icon="settings"
          accessibilityLabel={t('profile.settings')}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={styles.sections}>
        <SegmentedControl<Section>
          stretch
          accessibilityLabel={t('profile.sections')}
          value={section}
          onChange={setSection}
          options={[
            { value: 'published', label: t('profile.published') },
            { value: 'folders', label: t('profile.folders') },
          ]}
        />
      </View>
      {section === 'folders' ? (
        <View style={styles.privateNote}>
          <Icon name="lock" size={16} color={colors.textMuted} />
          <Text style={typography.caption}>{t('folders.private')}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {section === 'folders' ? (
        <FolderGrid
          folders={folders.data ?? []}
          onPressFolder={f =>
            navigation.navigate('Folder', { id: f.id, name: f.name })
          }
          header={header}
          bottomInset={bottomInset}
          refreshing={folders.isRefetching}
          onRefresh={() => folders.refetch()}
          empty={
            folders.isPending ? undefined : folders.isError ? (
              <View accessibilityRole="alert" style={styles.emptyBox}>
                <Text style={[typography.bodySmall, styles.emptyText]}>
                  {t('folders.error')}
                </Text>
                <Button
                  label={t('folders.retry')}
                  variant="secondary"
                  onPress={() => folders.refetch()}
                />
              </View>
            ) : (
              <Text style={[typography.bodySmall, styles.empty]}>
                {t('folders.emptyList')}
              </Text>
            )
          }
        />
      ) : (
        <WallpaperGrid
          items={items}
          onPressItem={item =>
            navigation.navigate('Detail', {
              id: item.id,
              thumbKey: item.thumb_key,
            })
          }
          bottomInset={bottomInset}
          onEndReached={() =>
            wallpapers.hasNextPage && wallpapers.fetchNextPage()
          }
          refreshing={wallpapers.isRefetching}
          onRefresh={() => {
            wallpapers.refetch();
            count.refetch();
            profile.refetch();
          }}
          header={header}
          empty={
            wallpapers.isLoading ? undefined : (
              <Text style={[typography.bodySmall, styles.empty]}>
                {t('profile.emptyPublished')}
              </Text>
            )
          }
        />
      )}
      <Sheet visible={menuOpen} onDismiss={() => setMenuOpen(false)} compact>
        <SheetOption
          icon="back"
          label={t('profile.logOut')}
          onPress={async () => {
            setMenuOpen(false);
            await signOut();
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: spacing.xs,
    paddingBottom: spacing.lg,
  },
  avatarSlot: { width: 64, height: 64 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...typography.title, lineHeight: 28 },
  sections: { marginHorizontal: spacing.xs, marginBottom: spacing.sm },
  privateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxs,
    paddingBottom: 10,
  },
  emptyBox: { paddingVertical: 56, paddingHorizontal: 28, gap: spacing.lg },
  emptyText: { textAlign: 'center' },
  empty: { paddingVertical: 56, paddingHorizontal: 28, textAlign: 'center' },
});
