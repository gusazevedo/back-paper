import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { signOut } from '../auth/google';
import { Avatar } from '../components/Avatar';
import { IconButton } from '../components/IconButton';
import { Sheet } from '../components/Sheet';
import { SheetOption } from '../components/SheetOption';
import { WallpaperGrid } from '../components/WallpaperGrid';
import {
  useProfile,
  useUserWallpapers,
  useWallpaperCount,
} from '../features/profile/queries';
import { t } from '../i18n';
import { BOTTOM_NAV_CLEARANCE } from '../navigation/BottomNav';
import { colors, spacing, typography } from '../theme';

/** My profile: header + Published grid. Folders arrive with #11, Settings with #16. */
export function ProfileScreen() {
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.session.user.id : '';
  const insets = useSafeAreaInsets();
  const profile = useProfile(userId);
  const count = useWallpaperCount(userId);
  const wallpapers = useUserWallpapers(userId);
  const [menuOpen, setMenuOpen] = useState(false);

  const items = wallpapers.data?.pages.flat() ?? [];
  const total = count.data ?? 0;
  const name = profile.data?.display_name ?? '';

  return (
    <View style={styles.root}>
      <WallpaperGrid
        items={items}
        bottomInset={BOTTOM_NAV_CLEARANCE + insets.bottom}
        onEndReached={() =>
          wallpapers.hasNextPage && wallpapers.fetchNextPage()
        }
        refreshing={wallpapers.isRefetching}
        onRefresh={() => {
          wallpapers.refetch();
          count.refetch();
          profile.refetch();
        }}
        header={
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
        }
        empty={
          wallpapers.isLoading ? undefined : (
            <Text style={[typography.bodySmall, styles.empty]}>
              {t('profile.emptyPublished')}
            </Text>
          )
        }
      />
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
  empty: { paddingVertical: 56, paddingHorizontal: 28, textAlign: 'center' },
});
