import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { name: string; uri?: string | null; size?: number };

/** Google photo when available, otherwise the name's initial on a dark circle. */
export function Avatar({ name, uri, size = 64 }: Props) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri }}
        style={[styles.image, style]}
      />
    );
  }
  return (
    <View
      style={[styles.fallback, style]}
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.placeholder },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fonts.display, color: colors.textOnDark },
});
