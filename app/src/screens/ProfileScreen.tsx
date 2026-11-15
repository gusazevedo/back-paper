import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '../auth/google';
import { Button } from '../components/Button';
import { t } from '../i18n';
import { colors, spacing, typography } from '../theme';

/** Placeholder until the profile issue; holds the provisional Log out (moves to Settings in #16). */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <Text accessibilityRole="header" style={typography.brand}>
        {t('profile.title')}
      </Text>
      <Button
        variant="secondary"
        label={t('profile.logOut')}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
});
