import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { WallpaperGrid } from '../components/WallpaperGrid';
import { useProfile, useUserWallpapers } from '../features/profile/queries';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;

/**
 * Someone else's profile (§4.11): avatar, display name and what they published,
 * newest first. Never folders, Settings or edit actions.
 */
export function PublicProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const profile = useProfile(userId);
  const wallpapers = useUserWallpapers(userId);
  const items = wallpapers.data?.pages.flat() ?? [];
  const name = profile.data?.display_name ?? route.params.name ?? '';

  const header = (
    <View style={styles.header}>
      {profile.data || route.params.name ? (
        <Avatar name={name} uri={profile.data?.avatar_url} />
      ) : (
        <View style={styles.avatarSlot} />
      )}
      <Text accessibilityRole="header" style={styles.name}>
        {name}
      </Text>
    </View>
  );

  let body;
  if (wallpapers.isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('feed.loading')}
          color={colors.text}
        />
      </View>
    );
  } else if (wallpapers.isError && items.length === 0) {
    body = (
      <View accessibilityRole="alert" style={styles.errorBox}>
        <Text style={[typography.bodySmall, styles.centerText]}>
          {t('publicProfile.error')}
        </Text>
        <Button
          label={t('feed.retry')}
          variant="secondary"
          onPress={() => {
            wallpapers.refetch();
            profile.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topBar}>
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
        />
      </View>
      {body ? (
        <>
          {header}
          {body}
        </>
      ) : (
        <WallpaperGrid
          items={items}
          header={header}
          onPressItem={item =>
            navigation.push('Detail', { id: item.id, thumbKey: item.thumb_key })
          }
          bottomInset={insets.bottom + 34}
          refreshing={wallpapers.isRefetching}
          onRefresh={() => {
            wallpapers.refetch();
            profile.refetch();
          }}
          onEndReached={() => {
            if (wallpapers.hasNextPage && !wallpapers.isFetchingNextPage) {
              wallpapers.fetchNextPage();
            }
          }}
          empty={
            <Text style={[typography.bodySmall, styles.empty]}>
              {t('publicProfile.empty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  avatarSlot: { width: 64, height: 64 },
  name: { ...typography.title, lineHeight: 28, flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  errorBox: { paddingVertical: 56, paddingHorizontal: 28, gap: spacing.lg },
  empty: { paddingVertical: 56, paddingHorizontal: 28, textAlign: 'center' },
});
