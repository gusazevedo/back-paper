import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon, IconName } from './icons/Icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

/** One 56px row in an options sheet (Rename, Delete folder, Report...). */
export function SheetOption({ icon, label, onPress, destructive }: Props) {
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: radii.field - 2,
  },
  pressed: { backgroundColor: colors.background },
  label: { fontFamily: fonts.medium, fontSize: 15 },
});
