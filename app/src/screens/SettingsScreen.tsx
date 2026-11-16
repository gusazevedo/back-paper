import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { signOut } from '../auth/google';
import { Icon } from '../components/icons/Icon';
import { NameSheet } from '../components/NameSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  DISPLAY_NAME_MAX,
  useProfile,
  useUpdateDisplayName,
} from '../features/profile/queries';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, fonts, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/** Settings (§4.11): Edit display name and Log out. Delete account arrives with #17. */
export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.session.user.id : '';
  const profile = useProfile(userId);
  const rename = useUpdateDisplayName(userId);
  const [naming, setNaming] = useState(false);
  const name = profile.data?.display_name ?? '';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <ScreenHeader
        title={t('settings.title')}
        leadingLabel={t('common.back')}
        onLeadingPress={() => navigation.goBack()}
      />
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.editName')}, ${name}`}
          onPress={() => {
            rename.reset();
            setNaming(true);
          }}
          style={({ pressed }) => [
            styles.row,
            styles.tall,
            styles.divider,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.rowText}>
            <Text style={styles.label}>{t('settings.editName')}</Text>
            <Text style={typography.caption}>{name}</Text>
          </View>
          <Icon name="chevronRight" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => signOut()}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.label}>{t('settings.logOut')}</Text>
        </Pressable>
      </View>
      <NameSheet
        visible={naming}
        heading={t('settings.editName')}
        label={t('settings.nameLabel')}
        cta={t('settings.save')}
        maxLength={DISPLAY_NAME_MAX}
        initial={name}
        validate={() => null}
        serverError={rename.error ? t('settings.saveFailed') : null}
        busy={rename.isPending}
        onSubmit={value =>
          rename.mutate(value, { onSuccess: () => setNaming(false) })
        }
        onCancel={() => setNaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  tall: { minHeight: 68, paddingVertical: 10 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  pressed: { backgroundColor: colors.background },
  rowText: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});
