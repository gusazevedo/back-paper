import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'dangerSoft'
  /** Text-only, 44 px tall: Cancel and other low-emphasis actions. */
  | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 52 for sheets and forms (default), 56 for the login call to action. */
  size?: 'md' | 'lg';
  leading?: ReactNode;
  testID?: string;
};

const palette: Record<
  ButtonVariant,
  { bg: string; fg: string; border?: string }
> = {
  primary: { bg: colors.primary, fg: colors.textOnDark },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  danger: { bg: colors.danger, fg: colors.textOnDark },
  dangerSoft: { bg: colors.dangerSoft, fg: colors.textOnDark },
  ghost: { bg: 'transparent', fg: colors.text },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  size = 'md',
  leading,
  testID,
}: Props) {
  const ghost = variant === 'ghost';
  const p = disabled
    ? { bg: ghost ? 'transparent' : colors.surfaceMuted, fg: colors.textMuted }
    : palette[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        ghost && styles.ghost,
        { backgroundColor: p.bg },
        'border' in p && p.border
          ? { borderWidth: 1, borderColor: p.border }
          : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {leading}
        <Text
          style={[
            typography.button,
            size === 'lg' && styles.lgText,
            ghost && styles.ghostText,
            { color: p.fg },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: { height: 56 },
  lgText: { fontSize: 16 },
  ghost: { height: 44, borderRadius: radii.pill },
  ghostText: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.85 },
});
