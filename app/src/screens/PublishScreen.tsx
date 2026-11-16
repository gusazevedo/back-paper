import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { Sheet } from '../components/Sheet';
import { TextField } from '../components/TextField';
import { useCategories } from '../features/categories/useCategories';
import { pickFromFiles, pickFromGallery } from '../features/publish/pickImage';
import { prepareImage, Rejection } from '../features/publish/prepareImage';
import {
  PublishError,
  publishWallpaper,
} from '../features/publish/publishWallpaper';
import {
  hoursUntil,
  QUOTA_WARN_AT,
  usePublishQuota,
} from '../features/publish/quota';
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

type Pick =
  | { kind: 'good'; image: PickedImage }
  | { kind: 'bad'; rejection: Rejection };

type Source = 'gallery' | 'files';

export function PublishScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const quota = usePublishQuota();

  const [pick, setPick] = useState<Pick | null>(null);
  const [checking, setChecking] = useState(false);
  const [sourceSheet, setSourceSheet] = useState(false);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });

  const userId = auth.status === 'signed-in' ? auth.session.user.id : '';
  const left = quota.data?.remaining;
  const done = phase.kind === 'done';
  const sending = phase.kind === 'sending';
  const blocked = left === 0 && !done;
  const shownPick = blocked ? null : pick;
  const canPublish =
    shownPick?.kind === 'good' && selected.length >= 1 && !sending && !checking;

  const choose = async (source: Source) => {
    setSourceSheet(false);
    let file;
    try {
      file =
        source === 'gallery' ? await pickFromGallery() : await pickFromFiles();
    } catch {
      file = undefined;
    }
    if (file === null) return; // backed out of the picker
    setChecking(true);
    const result = file
      ? await prepareImage(file)
      : {
          ok: false as const,
          rejection: { error: 'unreadable' as const, fileName: null },
        };
    setChecking(false);
    setPick(
      result.ok
        ? { kind: 'good', image: result.image }
        : { kind: 'bad', rejection: result.rejection },
    );
    if (phase.kind === 'failed') setPhase({ kind: 'form' });
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
    if (shownPick?.kind !== 'good') return;
    setPhase({ kind: 'sending', progress: 0 });
    try {
      const result = await publishWallpaper(
        { image: shownPick.image, title, categories: selected },
        progress => setPhase({ kind: 'sending', progress }),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.userWallpapers(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.userWallpaperCount(userId),
      });
      setPick(null);
      setTitle('');
      setSelected([]);
      setPhase({ kind: 'done', thumbKey: result.thumb_key });
    } catch (e) {
      // Out of publishes: the refreshed quota swaps the form for the limit panel.
      const limited =
        e instanceof PublishError && e.code === 'publish_limit_reached';
      setPhase(limited ? { kind: 'form' } : { kind: 'failed' });
    } finally {
      queryClient.invalidateQueries({
        queryKey: queryKeys.publishQuota(userId),
      });
    }
  };

  const showNotice =
    !done && left !== undefined && left > 0 && left <= QUOTA_WARN_AT;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title={t('publish.title')}
        leadingIcon="close"
        leadingLabel={t('common.close')}
        leadingDisabled={sending}
        onLeadingPress={() => navigation.goBack()}
      />

      {showNotice ? (
        <View accessibilityRole="text" style={styles.notice}>
          <Icon name="clock" size={16} />
          <Text style={styles.noticeText}>
            {left === 1
              ? t('publish.postsLeftOne')
              : t('publish.postsLeftMany', { count: left })}
          </Text>
        </View>
      ) : null}

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
            {left !== 0 ? (
              <>
                <View style={styles.gap8} />
                <Button
                  label={t('publish.done.another')}
                  variant="secondary"
                  onPress={() => setPhase({ kind: 'form' })}
                />
              </>
            ) : null}
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
            {checking ? (
              <View accessibilityRole="progressbar" style={styles.checking}>
                <ActivityIndicator color={colors.text} />
                <Text style={[typography.bodySmall, styles.muted]}>
                  {t('publish.checking')}
                </Text>
              </View>
            ) : blocked ? (
              <LimitPanel
                limit={quota.data?.limit ?? 10}
                nextAt={quota.data?.nextAt ?? null}
              />
            ) : shownPick?.kind === 'good' ? (
              <View style={styles.previewWrap}>
                <Image
                  accessibilityLabel={t('publish.previewLabel')}
                  source={{ uri: shownPick.image.uri }}
                  style={styles.preview}
                />
                <View style={styles.previewActions}>
                  <PillButton
                    icon="replace"
                    label={t('publish.replace')}
                    onPress={() => setSourceSheet(true)}
                  />
                  <PillButton
                    icon="trash"
                    label={t('publish.remove')}
                    onPress={() => setPick(null)}
                  />
                </View>
              </View>
            ) : shownPick?.kind === 'bad' ? (
              <RejectedCard
                rejection={shownPick.rejection}
                onChooseAnother={() => setSourceSheet(true)}
                onRemove={() => setPick(null)}
              />
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
                  <View style={[styles.fullWidth, styles.sourceButtons]}>
                    <Button
                      label={t('publish.fromGallery')}
                      onPress={() => choose('gallery')}
                    />
                    <Button
                      label={t('publish.fromFiles')}
                      variant="secondary"
                      onPress={() => choose('files')}
                    />
                  </View>
                </View>
                <Text style={[typography.caption, styles.requirements]}>
                  {t('publish.requirements')}
                </Text>
              </View>
            )}

            {shownPick && !checking ? (
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

      <Sheet
        visible={sourceSheet && !sending}
        onDismiss={() => setSourceSheet(false)}
        title={t('publish.replaceSheet.title')}
      >
        <Text style={[typography.bodySmall, styles.sheetBody]}>
          {t('publish.replaceSheet.body')}
        </Text>
        <Button
          label={t('publish.fromGallery')}
          onPress={() => choose('gallery')}
        />
        <Button
          label={t('publish.fromFiles')}
          variant="secondary"
          onPress={() => choose('files')}
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => setSourceSheet(false)}
        />
      </Sheet>
    </View>
  );
}

function RejectedCard({
  rejection,
  onChooseAnother,
  onRemove,
}: {
  rejection: Rejection;
  onChooseAnother: () => void;
  onRemove: () => void;
}) {
  const { error, sizeBytes, width, height } = rejection;
  const name = rejection.fileName ?? t('publish.rejected.unnamed');
  const file =
    error === 'file_too_large' && sizeBytes
      ? t('publish.rejected.fileSize', {
          name,
          size: (sizeBytes / (1024 * 1024)).toFixed(1),
        })
      : (error === 'resolution_too_low' || error === 'not_portrait') &&
        width &&
        height
      ? t('publish.rejected.fileDimensions', { name, width, height })
      : name;
  return (
    <View accessibilityRole="alert" style={styles.rejected}>
      <Icon name="alert" size={40} strokeWidth={1.75} color={colors.danger} />
      <Text
        accessibilityRole="header"
        style={[typography.sheetTitle, styles.rejectedTitle]}
      >
        {t(`publish.rejected.${error}.title`)}
      </Text>
      <Text style={[typography.bodySmall, styles.secondary, styles.center]}>
        {t(`publish.rejected.${error}.detail`)}
      </Text>
      <Text style={[typography.caption, styles.rejectedFile]}>{file}</Text>
      <View style={styles.fullWidth}>
        <Button
          label={t('publish.rejected.chooseAnother')}
          onPress={onChooseAnother}
        />
      </View>
      <View style={styles.gap4} />
      <Button label={t('publish.remove')} variant="ghost" onPress={onRemove} />
    </View>
  );
}

function LimitPanel({ limit, nextAt }: { limit: number; nextAt: Date | null }) {
  const hours = nextAt ? hoursUntil(nextAt) : null;
  return (
    <View accessibilityRole="summary" style={styles.limit}>
      <Icon name="clock" size={44} strokeWidth={1.5} />
      <Text
        accessibilityRole="header"
        style={[typography.sheetTitle, styles.limitTitle]}
      >
        {t('publish.limit.title')}
      </Text>
      <Text style={[typography.bodySmall, styles.secondary, styles.center]}>
        {t('publish.limit.body', { limit })}
      </Text>
      {hours ? (
        <Text style={[typography.label, styles.limitNext]}>
          {hours === 1
            ? t('publish.limit.nextOne')
            : t('publish.limit.nextMany', { hours })}
        </Text>
      ) : null}
      <View style={[styles.fullWidth, styles.sourceButtons]}>
        <View
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={[styles.mutedButton, styles.mutedPrimary]}
        >
          <Text style={[typography.button, styles.secondary]}>
            {t('publish.fromGallery')}
          </Text>
        </View>
        <View
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={[styles.mutedButton, styles.mutedSecondary]}
        >
          <Text style={[typography.button, styles.secondary]}>
            {t('publish.fromFiles')}
          </Text>
        </View>
      </View>
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
  gap4: { height: spacing.xs },
  gap8: { height: spacing.sm },
  center: { textAlign: 'center' },
  muted: { color: colors.textMuted },
  secondary: { color: colors.textSecondary },
  tabular: { fontVariant: ['tabular-nums'] },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.notice,
    backgroundColor: colors.surfaceMuted,
  },
  noticeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
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
  sourceButtons: { gap: spacing.sm },
  requirements: {
    marginTop: 14,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
  checking: {
    height: PREVIEW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: 22,
    borderRadius: radii.panel,
    backgroundColor: colors.surfaceMuted,
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
  rejected: {
    alignItems: 'center',
    marginBottom: 22,
    paddingTop: 36,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    borderRadius: radii.panel,
    backgroundColor: colors.dangerSurface,
  },
  rejectedTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  rejectedFile: {
    marginTop: 6,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  limit: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    borderRadius: radii.panel,
    backgroundColor: colors.surfaceMuted,
  },
  limitTitle: {
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  limitNext: { marginTop: 10, textAlign: 'center' },
  mutedButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
  },
  mutedPrimary: { marginTop: 32, backgroundColor: colors.disabledOnMuted },
  mutedSecondary: {
    borderWidth: 1,
    borderColor: colors.disabledBorderOnMuted,
  },
  sheetBody: { marginBottom: spacing.sm, color: colors.textMuted },
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
