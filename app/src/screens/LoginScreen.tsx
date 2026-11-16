import { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { devSignIn, devSignInAvailable } from '../auth/devSignIn';
import { AuthError, signInWithGoogle } from '../auth/google';
import { Button } from '../components/Button';
import { t, TranslationKey } from '../i18n';
import { colors, fonts, radii, spacing, typography } from '../theme';

/** Sample wallpapers from the design, used only for the sign-in collage. */
const columns: { offset: number; images: ImageSourcePropType[] }[] = [
  {
    offset: -70,
    images: [
      require('../assets/login/login-1.webp'),
      require('../assets/login/login-2.webp'),
      require('../assets/login/login-3.webp'),
    ],
  },
  {
    offset: -150,
    images: [
      require('../assets/login/login-4.webp'),
      require('../assets/login/login-5.webp'),
      require('../assets/login/login-6.webp'),
    ],
  },
  {
    offset: -30,
    images: [
      require('../assets/login/login-7.webp'),
      require('../assets/login/login-8.webp'),
      require('../assets/login/login-9.webp'),
    ],
  },
];

const COLLAGE_GAP = 10;

const errorKeys: Record<AuthError['kind'], TranslationKey> = {
  'not-configured': 'login.errors.notConfigured',
  'play-services': 'login.errors.playServices',
  failed: 'login.errors.failed',
};

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tileWidth = (width - spacing.sm * 2 - COLLAGE_GAP * 2) / 3;
  const tileSize = { width: tileWidth, height: (tileWidth * 16) / 9 };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const onContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // On success the AuthProvider swaps this screen for the tabs.
    } catch (e) {
      setError(
        e instanceof AuthError ? errorKeys[e.kind] : 'login.errors.failed',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={styles.collage}
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.columns}>
          {columns.map((column, i) => (
            <View
              key={i}
              style={[styles.column, { marginTop: column.offset + insets.top }]}
            >
              {column.images.map((source, j) => (
                <View key={j} style={[styles.tile, tileSize]}>
                  <Image source={source} style={tileSize} resizeMode="cover" />
                </View>
              ))}
            </View>
          ))}
        </View>
        <Svg style={styles.fade} width="100%" height={88}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="88" fill="url(#fade)" />
        </Svg>
      </View>

      <View style={[styles.panel, { paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={typography.hero}>
            {t('login.title')}
          </Text>
          <Text style={[typography.bodyLarge, styles.muted]}>
            {t('login.tagline')}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            size="lg"
            label={busy ? t('login.signingIn') : t('login.continueWithGoogle')}
            disabled={busy}
            onPress={onContinue}
            leading={
              <View style={styles.googleBadge}>
                <Text style={styles.googleG}>G</Text>
              </View>
            }
          />
          {error ? (
            <Text accessibilityRole="alert" style={[styles.note, styles.error]}>
              {t(error)}
            </Text>
          ) : (
            <Text style={[styles.note, styles.muted]}>
              {t('login.signedInOnly')}
            </Text>
          )}
          {devSignInAvailable ? (
            <Button
              variant="secondary"
              label={t('login.devSignIn')}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                setError(null);
                try {
                  await devSignIn();
                } catch {
                  setError('login.errors.failed');
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  collage: { flex: 1, overflow: 'hidden' },
  columns: {
    flexDirection: 'row',
    gap: COLLAGE_GAP,
    paddingHorizontal: spacing.sm,
  },
  column: { gap: COLLAGE_GAP },
  tile: {
    borderRadius: radii.tile,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  panel: {
    gap: spacing.xxl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  copy: { gap: spacing.sm },
  actions: { gap: spacing.md },
  muted: { color: colors.textMuted },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: { color: colors.danger },
  googleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});
