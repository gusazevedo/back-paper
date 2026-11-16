import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '../auth/google';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { t } from '../i18n';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;

/** R-ACC-1: the button only unlocks when the field reads exactly this. */
export const CONFIRM_WORD = 'DELETE';

/**
 * R-ACC-1..4: explains what goes and asks for "DELETE". The `delete-account`
 * Edge Function removes the user; the database cascades the rest. Afterwards
 * both sessions are cleared and the app is back at sign-in.
 */
export function DeleteAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: {},
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await signOut({ localOnly: true });
      // Nothing cached belongs to anyone any more.
      queryClient.clear();
    },
  });
  const unlocked = value === CONFIRM_WORD;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 30 },
      ]}
    >
      <ScreenHeader
        title={t('deleteAccount.title')}
        leadingLabel={t('common.back')}
        onLeadingPress={() => navigation.goBack()}
        leadingDisabled={remove.isPending}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.body}>{t('deleteAccount.intro')}</Text>
        <View style={styles.list}>
          {(['wallpapers', 'likes', 'folders', 'reports'] as const).map(k => (
            <View key={k} style={styles.item}>
              <Text style={typography.body}>{'•'}</Text>
              <Text style={[typography.body, styles.itemText]}>
                {t(`deleteAccount.items.${k}`)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={typography.bodySmall}>{t('deleteAccount.after')}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TextField
          label={t('deleteAccount.confirmLabel', { word: CONFIRM_WORD })}
          value={value}
          onChangeText={setValue}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!remove.isPending}
          error={remove.isError ? t('deleteAccount.failed') : undefined}
        />
        <Button
          label={t('deleteAccount.confirm')}
          variant="danger"
          disabled={!unlocked || remove.isPending}
          onPress={() => remove.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { gap: 14, paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  list: {
    gap: 10,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  item: { flexDirection: 'row', gap: spacing.sm },
  itemText: { flex: 1 },
  footer: { gap: 10, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
