import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Icon, IconName } from '../components/icons/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { useCategories } from '../features/categories/useCategories';
import { pickFromGallery } from '../features/publish/pickImage';
import { publishWallpaper } from '../features/publish/publishWallpaper';
import {
  MAX_CATEGORIES,
  MAX_TITLE,
  PickedImage,
} from '../features/publish/types';
import { t } from '../i18n';
import { queryKeys } from '../lib/queryClient';
import { publicUrl } from '../lib/storage';
import type { RootStackParamList } from '../navigation/RootStack';
import { colors, fonts, radii, spacing, typography } from '../theme';

type Phase =
  | { kind: 'form' }
  | { kind: 'sending'; progress: number }
  | { kind: 'failed' }
  | { kind: 'done'; thumbKey: string };

export function PublishScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const categories = useCategories();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });

  const sending = phase.kind === 'sending';
  const canPublish = !!image && selected.length >= 1 && !sending;

  const choose = async () => {
    const picked = await pickFromGallery();
    if (picked) {
      setImage(picked);
      if (phase.kind === 'failed') setPhase({ kind: 'form' });
    }
  };

  const toggle = (slug: string) =>
    setSelected(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < MAX_CATEGORIES
        ? [...prev, slug]
        : prev,
    );

  const publish = async () => {
    if (!image) return;
    setPhase({ kind: 'sending', progress: 0 });
    try {
      const result = await publishWallpaper(
        { image, title, categories: selected },
        progress => setPhase({ kind: 'sending', progress }),
      );
      if (auth.status === 'signed-in') {
        const userId = auth.session.user.id;
        queryClient.invalidateQueries({
          queryKey: queryKeys.userWallpapers(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.userWallpaperCount(userId),
        });
      }
      setPhase({ kind: 'done', thumbKey: result.thumb_key });
    } catch {
      setPhase({ kind: 'failed' });
    }
  };

  const reset = () => {
    setImage(null);
    setTitle('');
    setSelected([]);
    setPhase({ kind: 'form' });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title={t('publish.title')}
        leadingIcon="close"
        leadingLabel={t('common.close')}
        leadingDisabled={sending}
        onLeadingPress={() => navigation.goBack()}
      />

      {phase.kind === 'done' ? (
        <View style={[styles.done, { paddingBottom: 30 + insets.bottom }]}>
          <Image
            source={{ uri: publicUrl(phase.thumbKey) }}
            style={[styles.preview, styles.donePreview]}
          />
          <View accessibilityRole="summary" style={styles.doneTitleRow}>
            <View style={styles.doneBadge}>
              <Icon
                name="check"
                size={16}
                strokeWidth={3}
                color={colors.textOnDark}
              />
            </View>
            <Text accessibilityRole="header" style={typography.title}>
              {t('publish.done.title')}
            </Text>
          </View>
          <Text style={[typography.bodySmall, styles.doneText]}>
            {t('publish.done.body')}
          </Text>
          <View style={styles.fullWidth}>
            <Button
              label={t('publish.done.view')}
              onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
            />
            <View style={styles.gap8} />
            <Button
              label={t('publish.done.another')}
              variant="secondary"
              onPress={reset}
            />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            style={[styles.flex, sending && styles.dimmed]}
            pointerEvents={sending ? 'none' : 'auto'}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {image ? (
              <View style={styles.previewWrap}>
                <Image
                  accessibilityLabel={t('publish.previewLabel')}
                  source={{ uri: image.uri }}
                  style={styles.preview}
                />
                <View style={styles.previewActions}>
                  <PillButton
                    icon="replace"
                    label={t('publish.replace')}
                    onPress={choose}
                  />
                  <PillButton
                    icon="trash"
                    label={t('publish.remove')}
                    onPress={() => setImage(null)}
                  />
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.emptyCard}>
                  <Icon name="image" size={44} strokeWidth={1.5} />
                  <Text style={[typography.sheetTitle, styles.emptyTitle]}>
                    {t('publish.empty.title')}
                  </Text>
                  <Text style={[typography.bodySmall, styles.emptyBody]}>
                    {t('publish.empty.body')}
                  </Text>
                  <View style={styles.fullWidth}>
                    <Button label={t('publish.fromGallery')} onPress={choose} />
                  </View>
                </View>
                <Text style={[typography.caption, styles.requirements]}>
                  {t('publish.requirements')}
                </Text>
              </View>
            )}

            {image ? (
              <View>
                <TextField
                  label={t('publish.titleLabel')}
                  value={title}
                  onChangeText={v => setTitle(v.slice(0, MAX_TITLE))}
                  maxLength={MAX_TITLE}
                  counterMax={MAX_TITLE}
                />
                <View style={styles.catHeader}>
                  <Text style={typography.fieldLabel}>
                    {t('publish.categoriesLabel')}
                  </Text>
                  <Text style={[typography.fieldLabel, styles.tabular]}>
                    {`${selected.length}/${MAX_CATEGORIES}`}
                  </Text>
                </View>
                <View
                  accessibilityLabel={t('publish.categoriesLabel')}
                  style={styles.chips}
                >
                  {(categories.data ?? []).map(c => {
                    const on = selected.includes(c.slug);
                    return (
                      <Chip
                        key={c.slug}
                        label={c.label}
                        selected={on}
                        disabled={!on && selected.length >= MAX_CATEGORIES}
                        onPress={() => toggle(c.slug)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 30 + insets.bottom }]}>
            {phase.kind === 'failed' ? (
              <View accessibilityRole="alert" style={styles.failed}>
                <Icon name="alert" size={18} color={colors.dangerText} />
                <Text style={styles.failedText}>{t('publish.failed')}</Text>
              </View>
            ) : null}
            {phase.kind === 'sending' ? (
              <View accessibilityRole="progressbar" style={styles.progress}>
                <View style={styles.progressRow}>
                  <Text style={typography.label}>{t('publish.sending')}</Text>
                  <Text
                    style={[typography.label, styles.tabular]}
                  >{`${Math.round(phase.progress * 100)}%`}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.round(phase.progress * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <Button
                label={
                  phase.kind === 'failed'
                    ? t('publish.retry')
                    : t('publish.publish')
                }
                disabled={!canPublish}
                onPress={publish}
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

function PillButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pill}>
      <Icon name={icon} size={18} />
      <Text style={typography.label}>{label}</Text>
    </Pressable>
  );
}

const PREVIEW_HEIGHT = 360;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  dimmed: { opacity: 0.5 },
  body: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  fullWidth: { alignSelf: 'stretch' },
  gap8: { height: spacing.sm },
  tabular: { fontVariant: ['tabular-nums'] },
  emptyCard: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    borderRadius: radii.panel,
  },
  emptyTitle: { marginTop: 14, marginBottom: spacing.xs },
  emptyBody: { marginBottom: 36 },
  requirements: {
    marginTop: 14,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
  previewWrap: { alignItems: 'center', marginBottom: 22 },
  preview: {
    height: PREVIEW_HEIGHT,
    aspectRatio: 9 / 16,
    borderRadius: radii.preview,
    backgroundColor: colors.placeholder,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6 },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.background,
  },
  failed: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.notice,
    backgroundColor: colors.dangerSurface,
  },
  failedText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.dangerText,
  },
  progress: { height: 52, justifyContent: 'center', gap: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  bar: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  done: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  donePreview: { height: 320 },
  doneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { marginTop: 6, marginBottom: 28 },
});
