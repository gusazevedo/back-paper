import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../theme';

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  accessibilityLabel?: string;
};

/** 34px-tall pill used for categories. The pressable area is padded to 44px. */
export function Chip({
  label,
  selected,
  disabled,
  onPress,
  leading,
  trailing,
  accessibilityLabel,
}: Props) {
  const fg = selected ? colors.textOnDark : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.hit}
    >
      <View
        style={[
          styles.chip,
          selected ? styles.selected : styles.idle,
          disabled && styles.disabled,
        ]}
      >
        {leading}
        <Text style={[typography.chip, { color: fg }]}>{label}</Text>
        {trailing}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.4 },
});
