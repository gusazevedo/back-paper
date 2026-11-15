import { Pressable, StyleSheet } from 'react-native';
import { colors, touchTarget } from '../theme';
import { Icon, IconName } from './icons/Icon';

type Props = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  color?: string;
};

/** 44×44 round, transparent icon button (back, close, settings, options). */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled,
  color = colors.text,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.4 },
});
